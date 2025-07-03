'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  Clock,
  Edit,
  Trash2,
  Play,
  MoreVertical,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDate, formatRelativeTime, truncateText } from '@/lib/utils';
import CalendarScheduler from '@/components/forms/CalendarScheduler';

interface QueueItem {
  id: string;
  post_id: string;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  error_message?: string;
  posts: {
    id: string;
    content: string;
    media_type: string;
    media_urls?: string[];
    is_carousel: boolean;
  };
}

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export default function SchedulerPage() {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const fetchQueueData = async (page = 1, status = statusFilter) => {
    try {
      const url = `/api/scheduler?page=${page}&limit=10${status !== 'all' ? `&status=${status}` : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.queue) {
        setQueueItems(data.queue);
        setStats(data.stats);
        setCurrentPage(data.pagination.page);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching queue data:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchQueueData();
      setLoading(false);
    };

    loadData();
  }, [statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchQueueData(currentPage, statusFilter);
    setRefreshing(false);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this post from the queue?')) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduler?id=${itemId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchQueueData(currentPage, statusFilter);
      }
    } catch (error) {
      console.error('Error deleting queue item:', error);
    }
  };

  const handlePublishNow = async (item: QueueItem) => {
    if (!confirm('Are you sure you want to publish this post now?')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${item.post_id}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchQueueData(currentPage, statusFilter);
      }
    } catch (error) {
      console.error('Error publishing post:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'primary';
      case 'processing':
        return 'warning';
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'default';
    }
  };

  const filteredItems = queueItems.filter(item =>
    item.posts.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statCards = [
    { title: 'Pending', value: stats.pending, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { title: 'Processing', value: stats.processing, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { title: 'Completed', value: stats.completed, color: 'text-green-600', bgColor: 'bg-green-100' },
    { title: 'Failed', value: stats.failed, color: 'text-red-600', bgColor: 'bg-red-100' },
  ];

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
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Post Scheduler</h1>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1 text-sm ${
                view === 'list' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`px-3 py-1 text-sm ${
                view === 'calendar' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bgColor}`}>
                  <Clock className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {view === 'list' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Scheduled Posts</CardTitle>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                          {item.posts.media_type !== 'text' && (
                            <Badge variant="outline">
                              {item.posts.media_type}
                            </Badge>
                          )}
                          {item.posts.is_carousel && (
                            <Badge variant="outline">Carousel</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {truncateText(item.posts.content, 120)}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="mr-1 h-3 w-3" />
                            {formatDate(item.scheduled_for)}
                          </span>
                          <span>
                            {formatRelativeTime(item.scheduled_for)}
                          </span>
                        </div>
                        {item.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            Error: {item.error_message}
                          </p>
                        )}
                      </div>
                      
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        }
                        align="right"
                      >
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedItem(item);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        
                        {item.status === 'pending' && (
                          <DropdownMenuItem onClick={() => handlePublishNow(item)}>
                            <Play className="mr-2 h-4 w-4" />
                            Publish Now
                          </DropdownMenuItem>
                        )}
                        
                        <DropdownMenuItem 
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No scheduled posts found</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchQueueData(currentPage - 1, statusFilter)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchQueueData(currentPage + 1, statusFilter)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <CalendarScheduler
              posts={queueItems.map(item => ({
                id: item.id,
                title: item.posts.content,
                content: item.posts.content,
                scheduled_for: new Date(item.scheduled_for),
                status: item.status as any,
                media_type: item.posts.media_type as any,
              }))}
              onSchedulePost={(post, newDate) => {
                // Handle rescheduling
                console.log('Reschedule post:', post.id, 'to:', newDate);
              }}
              onCreatePost={(date) => {
                window.location.href = `/dashboard/create?scheduled=${date.toISOString()}`;
              }}
              onEditPost={(post) => {
                window.location.href = `/dashboard/posts/${post.id}/edit`;
              }}
              onDeletePost={(postId) => {
                handleDeleteItem(postId);
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Scheduled Post"
        size="lg"
      >
        {selectedItem && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Content
              </label>
              <div className="p-3 border border-gray-300 rounded-md bg-gray-50">
                <p className="text-sm text-gray-900">
                  {selectedItem.posts.content}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                defaultValue={new Date(selectedItem.scheduled_for).toISOString().split('T')[0]}
              />
              <Input
                label="Time"
                type="time"
                defaultValue={new Date(selectedItem.scheduled_for).toTimeString().slice(0, 5)}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary">
                Update Schedule
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
} 