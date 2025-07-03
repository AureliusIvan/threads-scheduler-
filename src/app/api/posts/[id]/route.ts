import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { createThreadsClient } from '@/lib/threads-api';

export async function GET(
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', dbUser.id)
      .single();

    if (postError) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json(post);

  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      content,
      media_urls,
      media_type,
      scheduled_for,
      tags,
      link_attachment_url,
      is_carousel,
      carousel_items,
    } = body;

    // Validate content if provided
    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 });
      }

      if (content.length > 500) {
        return NextResponse.json({ error: 'Content exceeds 500 character limit' }, { status: 400 });
      }
    }

    // Update post
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (content !== undefined) {
      updateData.content = content;
      updateData.character_count = content.length;
    }
    if (media_urls !== undefined) updateData.media_urls = media_urls;
    if (media_type !== undefined) updateData.media_type = media_type;
    if (scheduled_for !== undefined) {
      updateData.scheduled_for = scheduled_for ? new Date(scheduled_for).toISOString() : null;
      updateData.status = scheduled_for ? 'scheduled' : 'draft';
    }
    if (tags !== undefined) updateData.tags = tags;
    if (link_attachment_url !== undefined) updateData.link_attachment_url = link_attachment_url;
    if (is_carousel !== undefined) updateData.is_carousel = is_carousel;
    if (carousel_items !== undefined) updateData.carousel_items = carousel_items;

    const { data: post, error: postError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', params.id)
      .eq('user_id', dbUser.id)
      .select()
      .single();

    if (postError) {
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Update queue if scheduled_for changed
    if (scheduled_for !== undefined) {
      if (scheduled_for) {
        await supabase
          .from('post_queue')
          .upsert({
            post_id: post.id,
            user_id: dbUser.id,
            scheduled_for: new Date(scheduled_for).toISOString(),
            priority: 1,
            status: 'pending',
          });
      } else {
        await supabase
          .from('post_queue')
          .delete()
          .eq('post_id', post.id);
      }
    }

    return NextResponse.json(post);

  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
      .select('id')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete post (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', dbUser.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 