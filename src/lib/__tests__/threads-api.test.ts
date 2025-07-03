import { createThreadsClient } from '../threads-api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ThreadsAPIClient', () => {
  const accessToken = 'test-access-token';
  let client: ReturnType<typeof createThreadsClient>;

  beforeEach(() => {
    client = createThreadsClient(accessToken);
    mockFetch.mockClear();
  });

  describe('User Operations', () => {
    it('should get user profile', async () => {
      const mockResponse = {
        id: '123',
        username: 'testuser',
        threads_profile_picture_url: 'https://example.com/avatar.jpg',
        threads_biography: 'Test bio',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getMe();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.threads.net/v1.0/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=test-access-token',
        { method: 'GET' }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid access token',
            code: 190,
          },
        }),
      });

      await expect(client.getMe()).rejects.toThrow('Invalid access token');
    });
  });

  describe('Content Creation', () => {
    it('should create text post', async () => {
      const mockResponse = {
        id: 'post-123',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.createTextPost('Hello, world!');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.threads.net/v1.0/me/threads',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'TEXT',
            text: 'Hello, world!',
            access_token: accessToken,
          }),
        }
      );
      expect(result).toBe('post-123');
    });

    it('should create image post', async () => {
      const mockResponse = {
        id: 'post-456',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.createImagePost('Check this out!', 'https://example.com/image.jpg');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.threads.net/v1.0/me/threads',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'IMAGE',
            text: 'Check this out!',
            image_url: 'https://example.com/image.jpg',
            access_token: accessToken,
          }),
        }
      );
      expect(result).toBe('post-456');
    });

    it('should validate content length', async () => {
      const longContent = 'a'.repeat(501);
      
      await expect(client.createTextPost(longContent)).rejects.toThrow(
        'Content exceeds maximum length of 500 characters'
      );
    });

    it('should validate image URL format', async () => {
      await expect(client.createImagePost('Test', 'invalid-url')).rejects.toThrow(
        'Invalid image URL format'
      );
    });
  });

  describe('Analytics', () => {
    it('should get post insights', async () => {
      const mockResponse = {
        data: [
          {
            name: 'likes',
            values: [{ value: 42 }],
          },
          {
            name: 'replies',
            values: [{ value: 8 }],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.getPostInsights('post-123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://graph.threads.net/v1.0/post-123/insights?metric=likes,replies,reposts,views,reach,impressions&access_token=test-access-token',
        { method: 'GET' }
      );
      expect(result).toEqual({
        likes: 42,
        replies: 8,
        reposts: 0,
        views: 0,
        reach: 0,
        impressions: 0,
        engagement_rate: 0,
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([
          ['x-app-usage', '{"call_count":100,"total_cputime":25,"total_time":25}'],
          ['retry-after', '3600'],
        ]),
        json: async () => ({
          error: {
            message: 'Application request limit reached',
            code: 4,
          },
        }),
      });

      await expect(client.getMe()).rejects.toThrow('Application request limit reached');
    });
  });
}); 