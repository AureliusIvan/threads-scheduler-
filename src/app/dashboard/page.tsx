'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Edit3, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users
} from 'lucide-react';
import { formatRelativeTime, truncateText, getStatusColor } from '@/lib/utils';

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface Post {
  id: string;
  content: string;
  status: string;
  scheduled_for?: string;
  published_at?: string;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch queue stats
        const queueResponse = await fetch('/api/scheduler');
        const queueData = await queueResponse.json();
        if (queueData.stats) {
          setStats(queueData.stats);
        }

        // Fetch recent posts
        const postsResponse = await fetch('/api/posts?limit=5');
        const postsData = await postsResponse.json();
        if (postsData.posts) {
          setRecentPosts(postsData.posts);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statCards = [
    {
      title: 'Scheduled Posts',
      value: stats.pending,
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Published Today',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Failed Posts',
      value: stats.failed,
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Total Posts',
      value: stats.total,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-blue-100">
          Manage your Threads posts and schedule content for optimal engagement.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-semibold">Recent Posts</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <div key={post.id} className="flex items-center space-x-4 p-3 rounded-lg border border-gray-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {truncateText(post.content, 60)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(post.created_at)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        post.status === 'published' ? 'success' :
                        post.status === 'scheduled' ? 'primary' :
                        post.status === 'failed' ? 'danger' : 'default'
                      }
                    >
                      {post.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Edit3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No posts yet. Create your first post!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => window.location.href = '/dashboard/create'}
              >
                <Edit3 className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Create New Post</div>
                  <div className="text-sm text-gray-500">Write and schedule content</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => window.location.href = '/dashboard/scheduler'}
              >
                <Calendar className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">View Calendar</div>
                  <div className="text-sm text-gray-500">Manage scheduled posts</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="justify-start h-auto p-4"
                onClick={() => window.location.href = '/dashboard/analytics'}
              >
                <BarChart3 className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">View Analytics</div>
                  <div className="text-sm text-gray-500">Track performance metrics</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 