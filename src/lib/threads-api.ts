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
  private debug: boolean;

  constructor(accessToken: string, debug = false) {
    this.baseUrl = `${THREADS_API_BASE}/${THREADS_API_VERSION}`;
    this.accessToken = accessToken;
    this.debug = debug;
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[ThreadsAPI] ${message}`, data || '');
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // For GET requests, add access_token as query parameter
    // For POST requests, add it to the body or as query parameter
    const finalUrl = options.method === 'POST' 
      ? url 
      : `${url}${url.includes('?') ? '&' : '?'}access_token=${this.accessToken}`;

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add access token to POST request body if not already present
    let body = options.body;
    if (options.method === 'POST' && body) {
      const formData = new URLSearchParams(body as string);
      if (!formData.has('access_token')) {
        formData.set('access_token', this.accessToken);
        body = formData.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    // Log request details for debugging
    this.log('Making request', {
      url: finalUrl,
      method: options.method || 'GET',
      headers,
      bodyPreview: body ? (body as string).substring(0, 200) + '...' : 'none'
    });

    try {
      const response = await fetch(finalUrl, {
        ...options,
        headers,
        body,
      });

      const data = await response.json();

      // Log response details
      this.log('Response received', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data
      });

      if (!response.ok) {
        const error = data as ThreadsError;
        
        // Enhanced error logging
        this.log('API Error Details', {
          status: response.status,
          error: error,
          requestUrl: finalUrl,
          requestMethod: options.method || 'GET'
        });

        throw new ThreadsAPIError(
          error.error?.message || error.error_message || 'API request failed',
          error.error?.code || error.error_code,
          error.error?.error_subcode,
          error.error?.fbtrace_id
        );
      }

      return data;
    } catch (error) {
      this.log('Network or parsing error', error);
      
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
      : '?fields=id,username,account_type,name,threads_biography,threads_profile_picture_url,followers_count,following_count,threads_count,is_verified';
    
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
    
    const payload = new URLSearchParams({
      media_type: 'TEXT',
      text: request.text,
      access_token: this.accessToken,
    });
    
    if (request.link_attachment) payload.set('link_attachment', request.link_attachment);
    if (request.reply_to_id) payload.set('reply_to_id', request.reply_to_id);
    if (request.reply_control) payload.set('reply_control', request.reply_control);

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: payload.toString(),
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
    
    const payload = new URLSearchParams({
      media_type: 'IMAGE',
      image_url: request.image_url,
      access_token: this.accessToken,
    });
    
    if (request.text) payload.set('text', request.text);
    if (request.alt_text) payload.set('alt_text', request.alt_text);
    if (request.is_carousel_item) payload.set('is_carousel_item', 'true');
    if (request.reply_to_id) payload.set('reply_to_id', request.reply_to_id);
    if (request.reply_control) payload.set('reply_control', request.reply_control);

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: payload.toString(),
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
    
    const payload = new URLSearchParams({
      media_type: 'VIDEO',
      video_url: request.video_url,
      access_token: this.accessToken,
    });
    
    if (request.text) payload.set('text', request.text);
    if (request.reply_to_id) payload.set('reply_to_id', request.reply_to_id);
    if (request.reply_control) payload.set('reply_control', request.reply_control);

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: payload.toString(),
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
    
    const payload = new URLSearchParams({
      media_type: 'CAROUSEL',
      children: request.children.join(','),
      access_token: this.accessToken,
    });
    
    if (request.text) payload.set('text', request.text);
    if (request.link_attachment) payload.set('link_attachment', request.link_attachment);
    if (request.reply_to_id) payload.set('reply_to_id', request.reply_to_id);
    if (request.reply_control) payload.set('reply_control', request.reply_control);

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.CREATE_MEDIA(user.id),
      {
        method: 'POST',
        body: payload.toString(),
      }
    );
  }

  async publishMedia(creationId: string): Promise<ThreadsMediaResponse> {
    const user = await this.getMe(['id']);
    
    const payload = new URLSearchParams({
      creation_id: creationId,
      access_token: this.accessToken,
    });

    return this.makeRequest<ThreadsMediaResponse>(
      THREADS_ENDPOINTS.PUBLISH_MEDIA(user.id),
      {
        method: 'POST',
        body: payload.toString(),
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

  // Insights and analytics - Updated to follow Meta guide
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

  // Media insights - Added per Meta guide
  async getMediaInsights(
    mediaId: string,
    metrics: string[]
  ): Promise<ThreadsPagedResponse<ThreadsInsights>> {
    const params = new URLSearchParams();
    params.set('metric', metrics.join(','));

    const endpoint = `${THREADS_ENDPOINTS.MEDIA_INSIGHTS(mediaId)}?${params.toString()}`;
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
    const payload = new URLSearchParams({
      hide: 'true',
      access_token: this.accessToken,
    });

    return this.makeRequest<{ success: boolean }>(
      `${THREADS_ENDPOINTS.MANAGE_REPLY(replyId)}`,
      {
        method: 'POST',
        body: payload.toString(),
      }
    );
  }

  async unhideReply(replyId: string): Promise<{ success: boolean }> {
    const payload = new URLSearchParams({
      hide: 'false',
      access_token: this.accessToken,
    });

    return this.makeRequest<{ success: boolean }>(
      `${THREADS_ENDPOINTS.MANAGE_REPLY(replyId)}`,
      {
        method: 'POST',
        body: payload.toString(),
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
    // Implement token refresh logic using the refresh endpoint
    const response = await fetch(`${this.baseUrl}/refresh_access_token?grant_type=th_refresh_token&access_token=${this.accessToken}`);
    
    if (!response.ok) {
      throw new ThreadsAPIError('Token refresh failed');
    }
    
    const data = await response.json();
    this.accessToken = data.access_token;
    return data.access_token;
  }

  // Add a method to test basic connectivity
  async testConnection(): Promise<{ success: boolean; details?: any }> {
    try {
      this.log('Testing basic connectivity...');
      const result = await this.getMe(['id', 'username']);
      return { success: true, details: result };
    } catch (error) {
      this.log('Connection test failed', error);
      return { 
        success: false, 
        details: error instanceof ThreadsAPIError ? {
          message: error.message,
          code: error.code,
          subcode: error.subcode,
          traceId: error.traceId
        } : error 
      };
    }
  }

  // Add token validation with detailed feedback
  async validateTokenDetailed(): Promise<{
    valid: boolean;
    scopes?: string[];
    expiresAt?: number;
    error?: string;
  }> {
    try {
      // First try to get basic user info
      const user = await this.getMe(['id']);
      
      // If that works, try to get more detailed token info
      // Note: debug_token endpoint might not be available for all tokens
      try {
        const debugUrl = `${this.baseUrl}/debug_token?input_token=${this.accessToken}&access_token=${this.accessToken}`;
        const debugResponse = await fetch(debugUrl);
        
        if (debugResponse.ok) {
          const debugData = await debugResponse.json();
          return {
            valid: true,
            scopes: debugData.data?.scopes,
            expiresAt: debugData.data?.expires_at,
          };
        }
      } catch (debugError) {
        this.log('Token debug failed (expected for some token types)', debugError);
      }
      
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof ThreadsAPIError ? error.message : 'Unknown validation error'
      };
    }
  }
}

// Helper functions
export const createThreadsClient = (accessToken: string, debug = false) => {
  return new ThreadsAPIClient(accessToken, debug);
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