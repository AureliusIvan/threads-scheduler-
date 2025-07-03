import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createThreadsClient } from '@/lib/threads-api';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get queue items with post details
    const { data: queueItems, error: queueError } = await supabase
      .from('post_queue')
      .select(`
        *,
        posts (
          id,
          content,
          media_type,
          media_urls,
          character_count,
          is_carousel
        )
      `)
      .eq('user_id', dbUser.id)
      .eq('status', status)
      .order('scheduled_for', { ascending: true })
      .range(offset, offset + limit - 1);

    if (queueError) {
      return NextResponse.json({ error: 'Failed to fetch queue' }, { status: 500 });
    }

    // Get total count
    const { count } = await supabase
      .from('post_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUser.id)
      .eq('status', status);

    // Get queue statistics
    const { data: stats } = await supabase
      .rpc('get_queue_stats', { p_user_id: dbUser.id });

    return NextResponse.json({
      queue: queueItems,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      stats: stats?.[0] || {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

  } catch (error) {
    console.error('Error fetching queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    
    // This endpoint processes scheduled posts (should be called by cron job)
    const body = await request.json();
    const { action } = body;

    if (action !== 'process') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get all pending posts that are due for publishing
    const now = new Date().toISOString();
    const { data: dueItems, error: dueError } = await supabase
      .from('post_queue')
      .select(`
        *,
        posts (*),
        users (threads_access_token)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (dueError) {
      return NextResponse.json({ error: 'Failed to fetch due posts' }, { status: 500 });
    }

    const results = [];

    for (const item of dueItems || []) {
      try {
        // Mark as processing
        await supabase
          .from('post_queue')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Check if user has valid access token
        if (!item.users?.threads_access_token) {
          await supabase
            .from('post_queue')
            .update({ 
              status: 'failed',
              error_message: 'No valid access token',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          results.push({
            queue_id: item.id,
            post_id: item.post_id,
            status: 'failed',
            error: 'No valid access token',
          });
          continue;
        }

        const threadsClient = createThreadsClient(item.users.threads_access_token);
        const post = item.posts;

        let threadsPostId: string;

        // Publish based on media type
        if (post.media_type === 'text' || !post.media_urls?.length) {
          threadsPostId = await threadsClient.createTextPost(
            post.content,
            post.link_attachment_url || undefined
          );
        } else if (post.is_carousel && post.carousel_items?.length) {
          threadsPostId = await threadsClient.createCarouselPost(
            post.content,
            post.carousel_items
          );
        } else if (post.media_type === 'image') {
          threadsPostId = await threadsClient.createImagePost(
            post.content,
            post.media_urls[0]
          );
        } else if (post.media_type === 'video') {
          threadsPostId = await threadsClient.createVideoPost(
            post.content,
            post.media_urls[0]
          );
        } else {
          throw new Error('Unsupported media type');
        }

        // Update post as published
        await supabase
          .from('posts')
          .update({
            status: 'published',
            threads_post_id: threadsPostId,
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        // Mark queue item as completed
        await supabase
          .from('post_queue')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Create analytics record
        await supabase
          .from('analytics')
          .insert({
            post_id: post.id,
            user_id: item.user_id,
            threads_post_id: threadsPostId,
            likes: 0,
            replies: 0,
            reposts: 0,
            views: 0,
            engagement_rate: 0,
            reach: 0,
            impressions: 0,
          });

        results.push({
          queue_id: item.id,
          post_id: item.post_id,
          threads_post_id: threadsPostId,
          status: 'completed',
        });

      } catch (error) {
        console.error(`Error processing queue item ${item.id}:`, error);

        // Mark as failed and increment retry count
        const newRetryCount = (item.retry_count || 0) + 1;
        const shouldRetry = newRetryCount < 3;

        await supabase
          .from('post_queue')
          .update({ 
            status: shouldRetry ? 'pending' : 'failed',
            retry_count: newRetryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            scheduled_for: shouldRetry 
              ? new Date(Date.now() + 30 * 60 * 1000).toISOString() // Retry in 30 minutes
              : item.scheduled_for,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        // Update post status if final failure
        if (!shouldRetry) {
          await supabase
            .from('posts')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Unknown error',
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.post_id);
        }

        results.push({
          queue_id: item.id,
          post_id: item.post_id,
          status: shouldRetry ? 'retrying' : 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          retry_count: newRetryCount,
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });

  } catch (error) {
    console.error('Error processing queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const queueId = url.searchParams.get('id');

    if (!queueId) {
      return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 });
    }

    // Remove from queue (only if pending)
    const { error: deleteError } = await supabase
      .from('post_queue')
      .delete()
      .eq('id', queueId)
      .eq('user_id', dbUser.id)
      .eq('status', 'pending');

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove from queue' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Item removed from queue' });

  } catch (error) {
    console.error('Error removing from queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 