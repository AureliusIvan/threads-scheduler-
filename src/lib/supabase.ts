import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client-side Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Client component client (for use in React components)
export const createClientSupabaseClient = () => 
  createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

// Server component client (for use in server components)
export const createServerSupabaseClient = () => 
  createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies().get(name)?.value;
      },
    },
  });

// Middleware client (for use in Next.js middleware)
export const createMiddlewareSupabaseClient = (request?: NextRequest, response?: NextResponse) => {
  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          if (request) {
            return request.cookies.get(name)?.value;
          }
          return undefined;
        },
        set(name: string, value: string, options: any) {
          if (response) {
            response.cookies.set({ name, value, ...options });
          }
        },
        remove(name: string, options: any) {
          if (response) {
            response.cookies.set({ name, value: '', ...options });
          }
        },
      },
    }
  );
};

// Admin client with service role key (for server-side operations)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Type-safe helpers for common database operations
export type SupabaseClient = typeof supabase;

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any): string => {
  if (error?.message) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected database error occurred';
};

// Helper function to check if user is authenticated
export const isAuthenticated = async (client: SupabaseClient) => {
  const { data: { user }, error } = await client.auth.getUser();
  return { user, error };
};

// Storage helpers
export const uploadFile = async (
  client: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
  options?: { cacheControl?: string; contentType?: string }
) => {
  const { data, error } = await client.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options?.cacheControl ?? '3600',
      contentType: options?.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(handleSupabaseError(error));
  }

  return data;
};

export const getFileUrl = (
  client: SupabaseClient,
  bucket: string,
  path: string
) => {
  const { data } = client.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deleteFile = async (
  client: SupabaseClient,
  bucket: string,
  path: string
) => {
  const { error } = await client.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    throw new Error(handleSupabaseError(error));
  }
};

// RLS helper functions
export const withRLS = <T>(
  operation: (client: SupabaseClient) => Promise<T>
) => {
  return async (client: SupabaseClient): Promise<T> => {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return operation(client);
  };
};

// Database helper functions
export const getUserByMetaId = async (client: SupabaseClient, metaId: string) => {
  const { data, error } = await client
    .rpc('get_user_by_meta_id', { meta_user_id: metaId });
  
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
  
  return data?.[0] || null;
};

export const getPostsReadyForPublishing = async (client: SupabaseClient) => {
  const { data, error } = await client
    .rpc('get_posts_ready_for_publishing');
  
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
  
  return data || [];
};

export const updatePostAnalytics = async (
  client: SupabaseClient,
  postId: string,
  analytics: {
    likes?: number;
    replies?: number;
    reposts?: number;
    views?: number;
    reach?: number;
    impressions?: number;
    clicks?: number;
    saves?: number;
    shares?: number;
  }
) => {
  const { error } = await client
    .rpc('update_post_analytics', {
      p_post_id: postId,
      ...Object.fromEntries(
        Object.entries(analytics).map(([key, value]) => [`p_${key}`, value])
      ),
    });
  
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
}; 