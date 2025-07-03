import {
  THREADS_API_BASE,
  THREADS_API_VERSION,
  THREADS_ENDPOINTS,
  type ThreadsUser,
  type ThreadsMedia,
  type ThreadsInsights,
  type CreateThreadsMediaRequest,
  type CreateCarouselRequest,
  type PublishMediaRequest,
  type ThreadsMediaResponse,
  type ThreadsError,
  type ThreadsPagedResponse,
} from '@/types/threads';

export class ThreadsAPIError extends Error {
  constructor(
    message: string,
    public code?: number,
    public subcode?: number,
    public traceId?: string
  ) {
    super(message);
    this.name = 'ThreadsAPIError';
  }
}

export class ThreadsAPIClient {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string) {
    this.baseUrl = `${THREADS_API_BASE}/${THREADS_API_VERSION}`;
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ThreadsError;
        throw new ThreadsAPIError(
          error.error.message || 'API request failed',
          error.error.code,
          error.error.error_subcode,
          error.error.fbtrace_id
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ThreadsAPIError) {
        throw error;
      }
      throw new ThreadsAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // User operations
  async getMe(fields?: string[]): Promise<ThreadsUser> {
    const fieldsParam = fields?.length 
      ? `?fields=${fields.join(',')}` 
      : '?fields=id,username,account_type,name,biography,profile_picture_url,followers_count,following_count,threads_count,is_verified';
    
    return this.makeRequest<ThreadsUser>(`${THREADS_ENDPOINTS.ME}${fieldsParam}`);
  }

  async getUserThreads(
    userId: string,
    options?: {
      fields?: string[];
      limit?: number;
      since?: string;
      until?: string;
    }
  ): Promise<ThreadsPagedResponse<ThreadsMedia>> {
    const params = new URLSearchParams();
    
    if (options?.fields?.length) {
      params.set('fields', options.fields.join(','));
    } else {
      params.set('fields', 'id,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post');
    }
    
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.since) params.set('since', options.since);
    if (options?.until) params.set('until', options.until);

    const endpoint = `${THREADS_ENDPOINTS.USER_THREADS(userId)}?${params.toString()}`;
    return this.makeRequest<ThreadsPagedResponse<ThreadsMedia>>(endpoint);
  }

  // Media creation and publishing
  async createTextMedia(request: {
    text: string;
    link_attachment?: string;
    reply_to_id?: string;
    reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
  }): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload: CreateThreadsMediaRequest = {
      media_type: 'TEXT',
      text: request.text,
      link_attachment: request.link_attachment,
      reply_to_id: request.reply_to_id,
      reply_control: request.reply_control,
    };

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async createImageMedia(request: {
    image_url: string;
    text?: string;
    alt_text?: string;
    is_carousel_item?: boolean;
    reply_to_id?: string;
    reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
  }): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload: CreateThreadsMediaRequest = {
      media_type: 'IMAGE',
      image_url: request.image_url,
      text: request.text,
      alt_text: request.alt_text,
      is_carousel_item: request.is_carousel_item,
      reply_to_id: request.reply_to_id,
      reply_control: request.reply_control,
    };

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async createVideoMedia(request: {
    video_url: string;
    text?: string;
    reply_to_id?: string;
    reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
  }): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload: CreateThreadsMediaRequest = {
      media_type: 'VIDEO',
      video_url: request.video_url,
      text: request.text,
      reply_to_id: request.reply_to_id,
      reply_control: request.reply_control,
    };

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async createCarouselMedia(request: {
    children: string[]; // Array of media container IDs
    text?: string;
    link_attachment?: string;
    reply_to_id?: string;
    reply_control?: 'everyone' | 'accounts_you_follow' | 'mentioned_only';
  }): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload: CreateCarouselRequest = {
      media_type: 'CAROUSEL',
      children: request.children,
      text: request.text,
      link_attachment: request.link_attachment,
      reply_to_id: request.reply_to_id,
      reply_control: request.reply_control,
    };

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  async publishMedia(creationId: string): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload: PublishMediaRequest = {
      creation_id: creationId,
    };

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.PUBLISH_MEDIA(user.id),
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  }

  // Get media details
  async getMedia(
    mediaId: string,
    fields?: string[]
  ): Promise<ThreadsMedia> {
    const fieldsParam = fields?.length 
      ? `?fields=${fields.join(',')}` 
      : '?fields=id,media_type,media_url,permalink,username,text,timestamp,shortcode,thumbnail_url,children,is_quote_post,has_replies';
    
    return this.makeRequest<ThreadsMedia>(`${THREADS_ENDPOINTS.GET_MEDIA(mediaId)}${fieldsParam}`);
  }

  // Insights and analytics
  async getUserInsights(
    userId: string,
    metrics: string[],
    options?: {
      period?: 'day' | 'week' | 'days_28' | 'lifetime';
      since?: string;
      until?: string;
    }
  ): Promise<ThreadsPagedResponse<ThreadsInsights>> {
    const params = new URLSearchParams();
    params.set('metric', metrics.join(','));
    
    if (options?.period) params.set('period', options.period);
    if (options?.since) params.set('since', options.since);
    if (options?.until) params.set('until', options.until);

    const endpoint = `${THREADS_ENDPOINTS.USER_INSIGHTS(userId)}?${params.toString()}`;
    return this.makeRequest<ThreadsPagedResponse<ThreadsInsights>>(endpoint);
  }

  // Reply management
  async getReplies(
    mediaId: string,
    options?: {
      fields?: string[];
      reverse?: boolean;
    }
  ): Promise<ThreadsPagedResponse<ThreadsMedia>> {
    const params = new URLSearchParams();
    
    if (options?.fields?.length) {
      params.set('fields', options.fields.join(','));
    }
    if (options?.reverse) {
      params.set('reverse', 'true');
    }

    const endpoint = `${THREADS_ENDPOINTS.REPLIES(mediaId)}?${params.toString()}`;
    return this.makeRequest<ThreadsPagedResponse<ThreadsMedia>>(endpoint);
  }

  async getConversation(
    mediaId: string,
    options?: {
      fields?: string[];
      reverse?: boolean;
    }
  ): Promise<ThreadsPagedResponse<ThreadsMedia>> {
    const params = new URLSearchParams();
    
    if (options?.fields?.length) {
      params.set('fields', options.fields.join(','));
    }
    if (options?.reverse) {
      params.set('reverse', 'true');
    }

    const endpoint = `${THREADS_ENDPOINTS.CONVERSATION(mediaId)}?${params.toString()}`;
    return this.makeRequest<ThreadsPagedResponse<ThreadsMedia>>(endpoint);
  }

  async hideReply(replyId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `${THREADS_ENDPOINTS.MANAGE_REPLY(replyId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ hide: true }),
      }
    );
  }

  async unhideReply(replyId: string): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>(
      `${THREADS_ENDPOINTS.MANAGE_REPLY(replyId)}`,
      {
        method: 'POST',
        body: JSON.stringify({ hide: false }),
      }
    );
  }

  // Rate limit information
  async getRateLimitInfo(): Promise<{
    callCount: number;
    totalCputime: number;
    totalTime: number;
  }> {
    // This information is typically returned in response headers
    // For now, return a placeholder
    return {
      callCount: 0,
      totalCputime: 0,
      totalTime: 0,
    };
  }

  // Utility methods
  async validateToken(): Promise<boolean> {
    try {
      await this.getMe(['id']);
      return true;
    } catch (error) {
      return false;
    }
  }

  async refreshAccessToken(): Promise<string> {
    // Implement token refresh logic
    // This would typically involve calling the refresh token endpoint
    throw new Error('Token refresh not implemented');
  }
}

// Helper functions
export const createThreadsClient = (accessToken: string) => {
  return new ThreadsAPIClient(accessToken);
};

export const validateMediaContent = (content: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (content.length > 500) {
    errors.push('Content exceeds 500 character limit');
  }
  
  if (content.trim().length === 0) {
    errors.push('Content cannot be empty');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateImageSpecs = (file: File): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (file.size > 8 * 1024 * 1024) { // 8MB
    errors.push('Image file size exceeds 8MB limit');
  }
  
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    errors.push('Image must be JPEG or PNG format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateVideoSpecs = (file: File): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (file.size > 1024 * 1024 * 1024) { // 1GB
    errors.push('Video file size exceeds 1GB limit');
  }
  
  if (!['video/mp4', 'video/quicktime'].includes(file.type)) {
    errors.push('Video must be MP4 or MOV format');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}; 