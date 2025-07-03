'use client';

import { useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Clock, Calendar as CalendarIcon, Plus, X } from 'lucide-react';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  scheduled_for: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  media_type?: 'text' | 'image' | 'video';
}

interface CalendarSchedulerProps {
  posts: ScheduledPost[];
  onSchedulePost: (post: ScheduledPost, newDate: Date) => void;
  onCreatePost: (date: Date) => void;
  onEditPost: (post: ScheduledPost) => void;
  onDeletePost: (postId: string) => void;
  timezone?: string;
}

export default function CalendarScheduler({
  posts,
  onSchedulePost,
  onCreatePost,
  onEditPost,
  onDeletePost,
  timezone = 'UTC',
}: CalendarSchedulerProps) {
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<ScheduledPost | null>(null);

  // Transform posts into calendar events
  const events = posts.map(post => ({
    id: post.id,
    title: post.content.substring(0, 50) + (post.content.length > 50 ? '...' : ''),
    start: new Date(post.scheduled_for),
    end: new Date(new Date(post.scheduled_for).getTime() + 30 * 60 * 1000), // 30 minutes duration
    resource: post,
  }));

  const handleSelectSlot = useCallback(
    ({ start }: { start: Date }) => {
      onCreatePost(start);
    },
    [onCreatePost]
  );

  const handleSelectEvent = useCallback(
    (event: any) => {
      setSelectedEvent(event.resource);
    },
    []
  );

  const handleEventDrop = useCallback(
    ({ event, start }: { event: any; start: Date }) => {
      onSchedulePost(event.resource, start);
    },
    [onSchedulePost]
  );

  const eventStyleGetter = (event: any) => {
    const post = event.resource as ScheduledPost;
    let backgroundColor = '#3174ad';
    
    switch (post.status) {
      case 'draft':
        backgroundColor = '#6b7280';
        break;
      case 'scheduled':
        backgroundColor = '#3b82f6';
        break;
      case 'published':
        backgroundColor = '#10b981';
        break;
      case 'failed':
        backgroundColor = '#ef4444';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block',
      },
    };
  };

  const CustomEvent = ({ event }: { event: any }) => {
    const post = event.resource as ScheduledPost;
    return (
      <div className="flex items-center gap-1 p-1">
        <div className={`w-2 h-2 rounded-full ${
          post.status === 'published' ? 'bg-green-400' :
          post.status === 'failed' ? 'bg-red-400' :
          post.status === 'scheduled' ? 'bg-blue-400' : 'bg-gray-400'
        }`} />
        <span className="text-xs truncate">{event.title}</span>
        {post.media_type !== 'text' && (
          <div className="text-xs opacity-75">
            {post.media_type === 'image' ? '📷' : '🎥'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[600px] bg-white rounded-lg border border-gray-200">
      {/* Calendar Header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4" />
            <span>Timezone: {timezone}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <select
            value={view}
            onChange={(e) => setView(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
          >
            <option value="month">Month</option>
            <option value="week">Week</option>
            <option value="day">Day</option>
          </select>
          
          <button
            onClick={() => onCreatePost(new Date())}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-b border-gray-200 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Published</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span>Failed</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="h-[480px] p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          onEventDrop={handleEventDrop}
          eventPropGetter={eventStyleGetter}
          components={{
            event: CustomEvent,
          }}
          selectable
          resizable
          popup
          step={30}
          timeslots={2}
          min={new Date(2024, 0, 1, 6, 0)} // 6 AM
          max={new Date(2024, 0, 1, 23, 0)} // 11 PM
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
              localizer?.format(start, 'HH:mm', culture) + ' - ' +
              localizer?.format(end, 'HH:mm', culture),
          }}
        />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Post Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {selectedEvent.content}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled For
                </label>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4" />
                  {format(new Date(selectedEvent.scheduled_for), 'PPp')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedEvent.status === 'published' ? 'bg-green-100 text-green-800' :
                  selectedEvent.status === 'failed' ? 'bg-red-100 text-red-800' :
                  selectedEvent.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {selectedEvent.status}
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  onEditPost(selectedEvent);
                  setSelectedEvent(null);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDeletePost(selectedEvent.id);
                  setSelectedEvent(null);
                }}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 