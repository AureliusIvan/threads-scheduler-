import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createThreadsClient } from '@/lib/threads-api';
import type { Database } from '@/types/database';

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

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('posts')
      .select('*')
      .eq('user_id', dbUser.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', dbUser.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      content,
      media_urls = [],
      media_type = 'text',
      scheduled_for,
      tags = [],
      link_attachment_url,
      is_carousel = false,
      carousel_items,
    } = body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 character limit' }, { status: 400 });
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: dbUser.id,
        content,
        media_urls,
        media_type,
        scheduled_for: scheduled_for ? new Date(scheduled_for).toISOString() : null,
        status: scheduled_for ? 'scheduled' : 'draft',
        tags,
        link_attachment_url,
        character_count: content.length,
        is_carousel,
        carousel_items,
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating post:', postError);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    // If scheduled, add to queue
    if (scheduled_for) {
      await supabase
        .from('post_queue')
        .insert({
          post_id: post.id,
          user_id: dbUser.id,
          scheduled_for: new Date(scheduled_for).toISOString(),
          priority: 1,
          status: 'pending',
        });
    }

    return NextResponse.json(post, { status: 201 });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 