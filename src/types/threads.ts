// Threads API Response Types
export interface ThreadsUser {
  id: string;
  username: string;
  account_type: 'PERSONAL' | 'BUSINESS';
  name?: string;
  biography?: string;
  profile_picture_url?: string;
  website?: string;
  followers_count?: number;
  following_count?: number;
  threads_count?: number;
  is_verified?: boolean;
  is_user_verified?: boolean;
}

export interface ThreadsMedia {
  id: string;
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_url?: string;
  permalink?: string;
  username?: string;
  text?: string;
  timestamp?: string;
  shortcode?: string;
  thumbnail_url?: string;
  children?: {
    data: ThreadsMediaChild[];
  };
  is_quote_post?: boolean;
  has_replies?: boolean;
  root_post?: {
    id: string;
  };
  replied_to?: {
    id: string;
  };
  is_reply?: boolean;
  is_reply_owned_by_me?: boolean;
  hide_status?: 'NOT_HUSHED' | 'UNHUSHED' | 'HUSHED';
  reply_audience?: 'EVERYONE' | 'ACCOUNTS_YOU_FOLLOW' | 'MENTIONED_ONLY';
}

export interface ThreadsMediaChild {
  id: string;
  media_type: 'IMAGE' | 'VIDEO';
  media_url?: string;
  thumbnail_url?: string;
}

export interface ThreadsInsights {
  name: string;
  period: 'day' | 'week' | 'days_28' | 'lifetime';
  values: Array<{
    value: number;
    end_time?: string;
  }>;
  title: string;
  description: string;
  id: string;
}

// Threads API Request Types
export interface CreateThreadsMediaRequest {
  media_type: 'TEXT' | 'IMAGE' | 'VIDEO';
  text?: string;
  image_url?: string;
  video_url?: string;
  is_carousel_item?: boolean;
  link_attachment?: string;
  alt_text?: string;
  location_id?: string;
  reply_to_id?: string;
  reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
}

export interface CreateCarouselRequest {
  media_type: 'CAROUSEL';
  children: string[]; // Array of media container IDs
  text?: string;
  link_attachment?: string;
  location_id?: string;
  reply_to_id?: string;
  reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
}

export interface PublishMediaRequest {
  creation_id: string;
}

export interface ThreadsMediaResponse {
  id: string;
}

export interface ThreadsError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// Auth Types
export interface ThreadsAuthTokens {
  access_token: string;
  token_type: 'bearer';
  expires_in?: number;
}

export interface ThreadsLongLivedTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface ThreadsTokenDebugResponse {
  data: {
    app_id: string;
    type: string;
    application: string;
    data_access_expires_at: number;
    expires_at: number;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
  };
}

// Webhook Types
export interface ThreadsWebhookEvent {
  object: 'threads';
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      value: {
        thread_id: string;
        from: {
          id: string;
          username: string;
        };
        media_type: string;
        text?: string;
        reply_to_id?: string;
        timestamp: string;
      };
      field: string;
    }>;
  }>;
}

// Rate Limiting
export interface ThreadsRateLimit {
  'x-app-usage': {
    call_count: number;
    total_cputime: number;
    total_time: number;
  };
  'x-ad-account-usage'?: {
    acc_id_util_pct: number;
  };
}

// Pagination
export interface ThreadsPagination {
  cursors?: {
    before?: string;
    after?: string;
  };
  next?: string;
  previous?: string;
}

export interface ThreadsPagedResponse<T> {
  data: T[];
  paging?: ThreadsPagination;
}

// Media Specifications
export interface MediaSpecs {
  image: {
    formats: string[];
    maxFileSize: number; // 8MB
    maxWidth: number;
    minWidth: number;
    aspectRatioLimit: number; // 10:1
    colorSpace: string;
  };
  video: {
    container: string[];
    audioCodec: string;
    videoCodec: string[];
    maxFrameRate: number;
    minFrameRate: number;
    maxWidth: number;
    aspectRatioMin: number;
    aspectRatioMax: number;
    maxBitrate: number; // 100 Mbps
    audioBitrate: number; // kbps
    maxDuration: number; // 5 minutes
    maxFileSize: number; // 1GB
  };
}

// Content validation
export interface ContentValidation {
  maxTextLength: 500;
  maxCarouselItems: 20;
  minCarouselItems: 2;
  maxDailyPosts: 250;
}

// API Endpoints
export const THREADS_API_BASE = 'https://graph.threads.net';
export const THREADS_API_VERSION = 'v1.0';

export const THREADS_ENDPOINTS = {
  // User endpoints
  ME: '/me',
  USER_THREADS: (userId: string) => `/${userId}/threads`,
  USER_INSIGHTS: (userId: string) => `/${userId}/threads_insights`,
  
  // Media endpoints
  CREATE_MEDIA: (userId: string) => `/${userId}/threads`,
  PUBLISH_MEDIA: (userId: string) => `/${userId}/threads_publish`,
  GET_MEDIA: (mediaId: string) => `/${mediaId}`,
  
  // Auth endpoints
  ACCESS_TOKEN: '/oauth/access_token',
  REFRESH_TOKEN: '/refresh_access_token',
  DEBUG_TOKEN: '/debug_token',
  
  // Reply endpoints
  REPLIES: (mediaId: string) => `/${mediaId}/replies`,
  CONVERSATION: (mediaId: string) => `/${mediaId}/conversation`,
  MANAGE_REPLY: (replyId: string) => `/${replyId}`,
  
  // Search endpoints
  SEARCH: '/search',
} as const;

// Permissions
export const THREADS_PERMISSIONS = {
  BASIC: 'threads_basic',
  CONTENT_PUBLISH: 'threads_content_publish',
  MANAGE_REPLIES: 'threads_manage_replies',
  READ_REPLIES: 'threads_read_replies',
  MANAGE_INSIGHTS: 'threads_manage_insights',
} as const; 