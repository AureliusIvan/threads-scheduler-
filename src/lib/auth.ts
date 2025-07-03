import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

// Auth configuration
export const AUTH_CONFIG = {
  metaClientId: process.env.NEXT_PUBLIC_META_CLIENT_ID!,
  metaClientSecret: process.env.META_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXTAUTH_URL}/api/auth/callback/meta`,
  scopes: [
    'threads_basic',
    'threads_content_publish',
    'threads_manage_replies',
    'threads_read_replies',
    'threads_manage_insights'
  ].join(','),
};

// Meta OAuth URLs - Updated to use correct Threads endpoints
export const getMetaAuthUrl = (state?: string) => {
  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.metaClientId,
    redirect_uri: AUTH_CONFIG.redirectUri,
    scope: AUTH_CONFIG.scopes,
    response_type: 'code',
    state: state || crypto.randomUUID(),
  });

  // Use the correct Threads authorization endpoint
  return `https://threads.net/oauth/authorize?${params.toString()}`;
};

// Exchange code for access token - Updated to use Threads endpoint
export const exchangeCodeForToken = async (code: string) => {
  const response = await fetch('https://graph.threads.net/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: AUTH_CONFIG.metaClientId,
      client_secret: AUTH_CONFIG.metaClientSecret,
      redirect_uri: AUTH_CONFIG.redirectUri,
      code,
      grant_type: 'authorization_code', // Added required grant_type
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to exchange code for token: ${errorData.error_message || response.statusText}`);
  }

  return response.json();
};

// Get long-lived token - Updated to use correct Threads endpoint
export const getLongLivedToken = async (shortLivedToken: string) => {
  const url = new URL('https://graph.threads.net/v1.0/access_token');
  url.searchParams.set('grant_type', 'th_exchange_token');
  url.searchParams.set('client_secret', AUTH_CONFIG.metaClientSecret);
  url.searchParams.set('access_token', shortLivedToken);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to get long-lived token: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

// Refresh long-lived token
export const refreshLongLivedToken = async (accessToken: string) => {
  const url = new URL('https://graph.threads.net/v1.0/refresh_access_token');
  url.searchParams.set('grant_type', 'th_refresh_token');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh token: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

// Get user info from Threads - Updated to use Threads Graph API
export const getThreadsUserInfo = async (accessToken: string) => {
  const response = await fetch(
    `https://graph.threads.net/v1.0/me?access_token=${accessToken}&fields=id,username,name,threads_profile_picture_url,threads_biography`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to fetch user info: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

// Debug token
export const debugToken = async (accessToken: string) => {
  const response = await fetch(
    `https://graph.threads.net/v1.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to debug token: ${errorData.error?.message || response.statusText}`);
  }

  return response.json();
};

// Auth utilities for client components
export const useAuth = () => {
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const signIn = () => {
    const authUrl = getMetaAuthUrl();
    window.location.href = authUrl;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  };

  const getUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  };

  return {
    signIn,
    signOut,
    getSession,
    getUser,
  };
};

// Server-side auth utilities
export const getServerSession = async () => {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const { data: { session }, error } = await supabase.auth.getSession();
  
  return { session, error };
};

export const getServerUser = async () => {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  
  const cookieStore = await cookies();
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  
  return { user, error };
};

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  metaId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt: string;
}

export interface AuthSession {
  user: AuthUser;
  expires: string;
} 