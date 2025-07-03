import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createThreadsClient } from '@/lib/threads-api';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has access tokens
    if (!dbUser.threads_access_token) {
      return NextResponse.json({ error: 'Threads access token not found' }, { status: 401 });
    }

    // Get post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', dbUser.id)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if post can be published
    if (post.status === 'published') {
      return NextResponse.json({ error: 'Post already published' }, { status: 400 });
    }

    try {
      // Create Threads API client
      const threadsClient = createThreadsClient(dbUser.threads_access_token);

      let threadsPostId: string;

      // Publish based on media type
      if (post.media_type === 'text' || !post.media_urls?.length) {
        // Text-only post
        threadsPostId = await threadsClient.createTextPost(
          post.content,
          post.link_attachment_url || undefined
        );
      } else if (post.is_carousel && post.carousel_items?.length) {
        // Carousel post
        threadsPostId = await threadsClient.createCarouselPost(
          post.content,
          post.carousel_items
        );
      } else if (post.media_type === 'image') {
        // Single image post
        threadsPostId = await threadsClient.createImagePost(
          post.content,
          post.media_urls[0]
        );
      } else if (post.media_type === 'video') {
        // Video post
        threadsPostId = await threadsClient.createVideoPost(
          post.content,
          post.media_urls[0]
        );
      } else {
        return NextResponse.json({ error: 'Unsupported media type' }, { status: 400 });
      }

      // Update post status and Threads ID
      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({
          status: 'published',
          threads_post_id: threadsPostId,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating post after publish:', updateError);
        // Post was published but we couldn't update our DB
        return NextResponse.json({
          success: true,
          post: { ...post, status: 'published', threads_post_id: threadsPostId },
          warning: 'Post published but database update failed',
        }, { status: 200 });
      }

      // Remove from queue if it was scheduled
      await supabase
        .from('post_queue')
        .delete()
        .eq('post_id', post.id);

      // Create initial analytics record
      await supabase
        .from('analytics')
        .insert({
          post_id: post.id,
          user_id: dbUser.id,
          threads_post_id: threadsPostId,
          likes: 0,
          replies: 0,
          reposts: 0,
          views: 0,
          engagement_rate: 0,
          reach: 0,
          impressions: 0,
        });

      return NextResponse.json({
        success: true,
        post: updatedPost,
        threads_post_id: threadsPostId,
      });

    } catch (threadsError) {
      console.error('Error publishing to Threads:', threadsError);
      
      // Update post status to failed
      await supabase
        .from('posts')
        .update({
          status: 'failed',
          error_message: threadsError instanceof Error ? threadsError.message : 'Unknown error',
          updated_at: new Date().toISOString(),
        })
        .eq('id', post.id);

      return NextResponse.json({
        error: 'Failed to publish to Threads',
        details: threadsError instanceof Error ? threadsError.message : 'Unknown error',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in publish endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 