export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type MediaType = 'text' | 'image' | 'video' | 'carousel';

export interface User {
  id: string;
  meta_id: string;
  email: string;
  name: string;
  username?: string;
  profile_picture_url?: string;
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: string;
  threads_user_id?: string;
  is_active: boolean;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls?: string[];
  media_type: MediaType;
  scheduled_for?: string;
  published_at?: string;
  threads_media_id?: string;
  status: PostStatus;
  retry_count: number;
  error_message?: string;
  tags?: string[];
  link_attachment_url?: string;
  character_count: number;
  is_carousel: boolean;
  carousel_items?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Analytics {
  id: string;
  post_id: string;
  user_id: string;
  likes: number;
  replies: number;
  reposts: number;
  views: number;
  engagement_rate?: number;
  reach: number;
  impressions: number;
  clicks: number;
  saves: number;
  shares: number;
  timestamp: string;
  created_at: string;
}

export interface PostQueue {
  id: string;
  post_id: string;
  user_id: string;
  scheduled_for: string;
  priority: number;
  retry_count: number;
  max_retries: number;
  status: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  timezone: string;
  auto_save_enabled: boolean;
  auto_save_interval: number;
  default_privacy: string;
  notification_preferences: Record<string, unknown>;
  posting_schedule: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MediaUpload {
  id: string;
  user_id: string;
  original_filename: string;
  file_size?: number;
  mime_type?: string;
  storage_path: string;
  public_url?: string;
  upload_status: string;
  created_at: string;
}

export interface RateLimit {
  id: string;
  user_id: string;
  endpoint: string;
  requests_count: number;
  window_start: string;
  reset_at?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Database tables interface
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Post, 'id' | 'created_at' | 'updated_at'>>;
      };
      analytics: {
        Row: Analytics;
        Insert: Omit<Analytics, 'id' | 'created_at'>;
        Update: Partial<Omit<Analytics, 'id' | 'created_at'>>;
      };
      post_queue: {
        Row: PostQueue;
        Insert: Omit<PostQueue, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PostQueue, 'id' | 'created_at' | 'updated_at'>>;
      };
      user_settings: {
        Row: UserSettings;
        Insert: Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<UserSettings, 'id' | 'created_at' | 'updated_at'>>;
      };
      media_uploads: {
        Row: MediaUpload;
        Insert: Omit<MediaUpload, 'id' | 'created_at'>;
        Update: Partial<Omit<MediaUpload, 'id' | 'created_at'>>;
      };
      rate_limits: {
        Row: RateLimit;
        Insert: Omit<RateLimit, 'id' | 'created_at'>;
        Update: Partial<Omit<RateLimit, 'id' | 'created_at'>>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, 'id' | 'created_at'>;
        Update: Partial<Omit<AuditLog, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_by_meta_id: {
        Args: { meta_user_id: string };
        Returns: User[];
      };
      get_posts_ready_for_publishing: {
        Args: {};
        Returns: Pick<Post, 'id' | 'user_id' | 'content' | 'media_urls' | 'media_type' | 'scheduled_for' | 'threads_media_id' | 'tags' | 'link_attachment_url' | 'is_carousel' | 'carousel_items'>[];
      };
      update_post_analytics: {
        Args: {
          p_post_id: string;
          p_likes?: number;
          p_replies?: number;
          p_reposts?: number;
          p_views?: number;
          p_reach?: number;
          p_impressions?: number;
          p_clicks?: number;
          p_saves?: number;
          p_shares?: number;
        };
        Returns: void;
      };
    };
    Enums: {
      post_status: PostStatus;
      media_type: MediaType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
} 