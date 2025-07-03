'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Repeat,
  Eye,
  Clock,
  Calendar,
  Award
} from 'lucide-react';
import { formatRelativeTime, truncateText } from '@/lib/utils';

interface AnalyticsSummary {
  totalPosts: number;
  totalLikes: number;
  totalReplies: number;
  totalReposts: number;
  totalViews: number;
  totalReach: number;
  totalImpressions: number;
  avgEngagementRate: number;
}

interface TopPost {
  id: string;
  content: string;
  engagement_rate: number;
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  published_at: string;
}

interface BestTime {
  hour: number;
  avgEngagement: number;
  postCount: number;
}

interface BestDay {
  day: string;
  dayNumber: number;
  avgEngagement: number;
  postCount: number;
}

interface AnalyticsData {
  period: string;
  summary: AnalyticsSummary;
  insights: {
    bestHours: BestTime[];
    bestDays: BestDay[];
    topPosts: TopPost[];
  };
}

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async (selectedPeriod = period) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics?period=${selectedPeriod}`);
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    fetchAnalytics(newPeriod);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  const { summary, insights } = analyticsData;

  const metricCards = [
    {
      title: 'Total Posts',
      value: summary.totalPosts,
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Engagement',
      value: summary.totalLikes + summary.totalReplies + summary.totalReposts,
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
    {
      title: 'Total Views',
      value: summary.totalViews.toLocaleString(),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Avg. Engagement Rate',
      value: `${summary.avgEngagementRate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <div className="flex items-center space-x-3">
          <select
            value={period}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => fetchAnalytics()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-pink-600" />
              <span>Likes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {summary.totalLikes.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              {(summary.totalLikes / Math.max(summary.totalPosts, 1)).toFixed(1)} avg per post
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <span>Replies</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {summary.totalReplies.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              {(summary.totalReplies / Math.max(summary.totalPosts, 1)).toFixed(1)} avg per post
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Repeat className="h-5 w-5 text-green-600" />
              <span>Reposts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {summary.totalReposts.toLocaleString()}
            </div>
            <p className="text-sm text-gray-600">
              {(summary.totalReposts / Math.max(summary.totalPosts, 1)).toFixed(1)} avg per post
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Posting Times */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span>Best Posting Times</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Best Hours</h4>
                <div className="space-y-2">
                  {insights.bestHours.length > 0 ? (
                    insights.bestHours.map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="primary">{index + 1}</Badge>
                          <span className="font-medium">
                            {hour.hour}:00 - {hour.hour + 1}:00
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {hour.avgEngagement.toFixed(1)} avg engagement
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Not enough data yet</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Best Days</h4>
                <div className="space-y-2">
                  {insights.bestDays.length > 0 ? (
                    insights.bestDays.map((day, index) => (
                      <div key={day.day} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge variant="success">{index + 1}</Badge>
                          <span className="font-medium">{day.day}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {day.avgEngagement.toFixed(1)} avg engagement
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Not enough data yet</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Performing Posts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-yellow-600" />
              <span>Top Performing Posts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.topPosts.length > 0 ? (
                insights.topPosts.map((post, index) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="warning">#{index + 1}</Badge>
                      <Badge variant="success">
                        {post.engagement_rate}% engagement
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-900 mb-3">
                      {truncateText(post.content, 100)}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Heart className="mr-1 h-3 w-3" />
                        {post.likes}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="mr-1 h-3 w-3" />
                        {post.replies}
                      </span>
                      <span className="flex items-center">
                        <Repeat className="mr-1 h-3 w-3" />
                        {post.reposts}
                      </span>
                      <span className="flex items-center">
                        <Eye className="mr-1 h-3 w-3" />
                        {post.views}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatRelativeTime(post.published_at)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Award className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No published posts yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Optimal Posting</h4>
              <p className="text-sm text-blue-700">
                {insights.bestHours.length > 0 
                  ? `Best time to post is around ${insights.bestHours[0]?.hour}:00`
                  : 'Post consistently to discover your best times'
                }
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">Engagement Rate</h4>
              <p className="text-sm text-green-700">
                {summary.avgEngagementRate > 5 
                  ? 'Great engagement! Keep up the good work.'
                  : 'Try posting more engaging content with questions or calls-to-action.'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-2">Content Strategy</h4>
              <p className="text-sm text-purple-700">
                {insights.topPosts.length > 0
                  ? 'Analyze your top posts to understand what resonates with your audience.'
                  : 'Create more content to identify winning patterns.'
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 