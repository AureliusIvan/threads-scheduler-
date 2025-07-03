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
    const period = url.searchParams.get('period') || '30d'; // 7d, 30d, 90d
    const postId = url.searchParams.get('post_id');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default: // 30d
        startDate.setDate(endDate.getDate() - 30);
    }

    let analyticsQuery = supabase
      .from('analytics')
      .select(`
        *,
        posts!inner(
          id,
          content,
          published_at,
          status
        )
      `)
      .eq('user_id', dbUser.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (postId) {
      analyticsQuery = analyticsQuery.eq('post_id', postId);
    }

    const { data: analytics, error: analyticsError } = await analyticsQuery;

    if (analyticsError) {
      console.error('Error fetching analytics:', analyticsError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Calculate aggregated metrics
    const totalPosts = analytics.length;
    const totalLikes = analytics.reduce((sum, a) => sum + (a.likes || 0), 0);
    const totalReplies = analytics.reduce((sum, a) => sum + (a.replies || 0), 0);
    const totalReposts = analytics.reduce((sum, a) => sum + (a.reposts || 0), 0);
    const totalViews = analytics.reduce((sum, a) => sum + (a.views || 0), 0);
    const totalReach = analytics.reduce((sum, a) => sum + (a.reach || 0), 0);
    const totalImpressions = analytics.reduce((sum, a) => sum + (a.impressions || 0), 0);

    const avgEngagementRate = totalPosts > 0 
      ? analytics.reduce((sum, a) => sum + (a.engagement_rate || 0), 0) / totalPosts 
      : 0;

    // Calculate best posting times
    const postTimes = analytics
      .filter(a => a.posts?.published_at)
      .map(a => {
        const publishedAt = new Date(a.posts.published_at);
        return {
          hour: publishedAt.getHours(),
          dayOfWeek: publishedAt.getDay(),
          engagement: (a.likes || 0) + (a.replies || 0) + (a.reposts || 0),
        };
      });

    const bestHours = Array.from({ length: 24 }, (_, hour) => {
      const hourPosts = postTimes.filter(p => p.hour === hour);
      const avgEngagement = hourPosts.length > 0
        ? hourPosts.reduce((sum, p) => sum + p.engagement, 0) / hourPosts.length
        : 0;
      return { hour, avgEngagement, postCount: hourPosts.length };
    })
    .filter(h => h.postCount > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3);

    const bestDays = Array.from({ length: 7 }, (_, day) => {
      const dayPosts = postTimes.filter(p => p.dayOfWeek === day);
      const avgEngagement = dayPosts.length > 0
        ? dayPosts.reduce((sum, p) => sum + p.engagement, 0) / dayPosts.length
        : 0;
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return { 
        day: dayNames[day], 
        dayNumber: day,
        avgEngagement, 
        postCount: dayPosts.length 
      };
    })
    .filter(d => d.postCount > 0)
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 3);

    // Get top performing posts
    const topPosts = analytics
      .sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
      .slice(0, 5)
      .map(a => ({
        id: a.post_id,
        content: a.posts?.content?.substring(0, 100) + '...',
        engagement_rate: a.engagement_rate,
        likes: a.likes,
        replies: a.replies,
        reposts: a.reposts,
        views: a.views,
        published_at: a.posts?.published_at,
      }));

    return NextResponse.json({
      period,
      summary: {
        totalPosts,
        totalLikes,
        totalReplies,
        totalReposts,
        totalViews,
        totalReach,
        totalImpressions,
        avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
      },
      insights: {
        bestHours,
        bestDays,
        topPosts,
      },
      analytics: postId ? analytics : [], // Only return detailed analytics if specific post requested
    });

  } catch (error) {
    console.error('Error in analytics endpoint:', error);
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

    if (!dbUser.threads_access_token) {
      return NextResponse.json({ error: 'Threads access token not found' }, { status: 401 });
    }

    // Get all published posts that need analytics updates
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, threads_post_id')
      .eq('user_id', dbUser.id)
      .eq('status', 'published')
      .not('threads_post_id', 'is', null);

    if (postsError) {
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({ message: 'No published posts to update' }, { status: 200 });
    }

    const threadsClient = createThreadsClient(dbUser.threads_access_token);
    const updates = [];

    // Update analytics for each post
    for (const post of posts) {
      try {
        const insights = await threadsClient.getPostInsights(post.threads_post_id);
        
        const updateData = {
          likes: insights.likes || 0,
          replies: insights.replies || 0,
          reposts: insights.reposts || 0,
          views: insights.views || 0,
          reach: insights.reach || 0,
          impressions: insights.impressions || 0,
          engagement_rate: insights.engagement_rate || 0,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('analytics')
          .upsert({
            post_id: post.id,
            user_id: dbUser.id,
            threads_post_id: post.threads_post_id,
            ...updateData,
          });

        if (updateError) {
          console.error(`Error updating analytics for post ${post.id}:`, updateError);
        } else {
          updates.push({ post_id: post.id, ...updateData });
        }

      } catch (insightsError) {
        console.error(`Error fetching insights for post ${post.id}:`, insightsError);
      }
    }

    return NextResponse.json({
      message: 'Analytics updated successfully',
      updated_posts: updates.length,
      updates,
    });

  } catch (error) {
    console.error('Error updating analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 