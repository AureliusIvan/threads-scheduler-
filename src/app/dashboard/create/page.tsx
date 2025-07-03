'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { 
  Calendar,
  Image as ImageIcon,
  Video,
  Send,
  Save,
  X,
  Upload,
  Clock,
  Hash,
  Link as LinkIcon
} from 'lucide-react';
import CalendarScheduler from '@/components/forms/CalendarScheduler';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  type: 'image' | 'video';
}

export default function CreatePostPage() {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [scheduledFor, setScheduledFor] = useState<Date | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isSchedulerOpen, setIsSchedulerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach((file) => {
      if (mediaFiles.length >= 10) {
        alert('Maximum 10 media files allowed');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        const mediaFile: MediaFile = {
          id: Math.random().toString(36).substring(7),
          file,
          preview,
          type: file.type.startsWith('video/') ? 'video' : 'image',
        };
        setMediaFiles(prev => [...prev, mediaFile]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeMedia = (id: string) => {
    setMediaFiles(prev => prev.filter(file => file.id !== id));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 10) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTag();
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const postData = {
        content,
        media_urls: [], // Will be populated after upload
        scheduled_for: scheduledFor?.toISOString(),
        tags,
        link_attachment_url: linkUrl || undefined,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        // Handle success
        console.log('Draft saved successfully');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    setPublishing(true);
    try {
      // First save the post
      const postData = {
        content,
        media_urls: [], // Will be populated after upload
        tags,
        link_attachment_url: linkUrl || undefined,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        const post = await response.json();
        
        // Then publish it
        const publishResponse = await fetch(`/api/posts/${post.id}/publish`, {
          method: 'POST',
        });

        if (publishResponse.ok) {
          // Handle success
          console.log('Post published successfully');
          window.location.href = '/dashboard';
        }
      }
    } catch (error) {
      console.error('Error publishing post:', error);
    } finally {
      setPublishing(false);
    }
  };

  const schedulePost = async () => {
    if (!scheduledFor) return;

    setSaving(true);
    try {
      const postData = {
        content,
        media_urls: [], // Will be populated after upload
        scheduled_for: scheduledFor.toISOString(),
        tags,
        link_attachment_url: linkUrl || undefined,
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        // Handle success
        console.log('Post scheduled successfully');
        window.location.href = '/dashboard/scheduler';
      }
    } catch (error) {
      console.error('Error scheduling post:', error);
    } finally {
      setSaving(false);
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > 500;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Create New Post</span>
            <Badge variant={isOverLimit ? 'danger' : 'default'}>
              {characterCount}/500
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Content Editor */}
          <div>
            <Textarea
              label="Content"
              placeholder="What's happening?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              error={isOverLimit ? 'Content exceeds 500 character limit' : undefined}
            />
          </div>

          {/* Media Upload */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Media ({mediaFiles.length}/10)
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaFiles.length >= 10}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {mediaFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {mediaFiles.map((media) => (
                  <div key={media.id} className="relative group">
                    {media.type === 'image' ? (
                      <img
                        src={media.preview}
                        alt="Upload preview"
                        className="w-full h-24 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 rounded-md flex items-center justify-center">
                        <Video className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    <button
                      onClick={() => removeMedia(media.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Link Attachment */}
          <div>
            <Input
              label="Link Attachment (optional)"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              type="url"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags ({tags.length}/10)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="primary" className="flex items-center gap-1">
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={tags.length >= 10}
              />
              <Button
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= 10}
              >
                <Hash className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scheduling */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Schedule
            </label>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsSchedulerOpen(true)}
                className="flex items-center space-x-2"
              >
                <Calendar className="h-4 w-4" />
                <span>
                  {scheduledFor 
                    ? `Scheduled for ${scheduledFor.toLocaleDateString()} ${scheduledFor.toLocaleTimeString()}`
                    : 'Schedule post'
                  }
                </span>
              </Button>
              {scheduledFor && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScheduledFor(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={saveDraft}
              loading={saving}
              className="flex-1 sm:flex-none"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            
            {scheduledFor ? (
              <Button
                variant="primary"
                onClick={schedulePost}
                loading={saving}
                disabled={!content.trim() || isOverLimit}
                className="flex-1"
              >
                <Clock className="mr-2 h-4 w-4" />
                Schedule Post
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={publishNow}
                loading={publishing}
                disabled={!content.trim() || isOverLimit}
                className="flex-1"
              >
                <Send className="mr-2 h-4 w-4" />
                Publish Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Scheduler Modal */}
      <Modal
        isOpen={isSchedulerOpen}
        onClose={() => setIsSchedulerOpen(false)}
        title="Schedule Post"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a date and time to schedule your post.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const date = new Date(e.target.value);
                if (scheduledFor) {
                  date.setHours(scheduledFor.getHours(), scheduledFor.getMinutes());
                } else {
                  date.setHours(12, 0); // Default to noon
                }
                setScheduledFor(date);
              }}
            />
            
            <Input
              label="Time"
              type="time"
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(':');
                const date = scheduledFor || new Date();
                date.setHours(parseInt(hours), parseInt(minutes));
                setScheduledFor(new Date(date));
              }}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsSchedulerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsSchedulerOpen(false)}
              disabled={!scheduledFor}
            >
              Set Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 