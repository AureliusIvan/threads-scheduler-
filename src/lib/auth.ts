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

// Meta OAuth URLs
export const getMetaAuthUrl = (state?: string) => {
  const params = new URLSearchParams({
    client_id: AUTH_CONFIG.metaClientId,
    redirect_uri: AUTH_CONFIG.redirectUri,
    scope: AUTH_CONFIG.scopes,
    response_type: 'code',
    state: state || crypto.randomUUID(),
  });

  return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
};

// Exchange code for access token
export const exchangeCodeForToken = async (code: string) => {
  const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: AUTH_CONFIG.metaClientId,
      client_secret: AUTH_CONFIG.metaClientSecret,
      redirect_uri: AUTH_CONFIG.redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
};

// Get long-lived token
export const getLongLivedToken = async (shortLivedToken: string) => {
  const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  const url = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', AUTH_CONFIG.metaClientId);
  url.searchParams.set('client_secret', AUTH_CONFIG.metaClientSecret);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const longLivedResponse = await fetch(url.toString());
  
  if (!longLivedResponse.ok) {
    throw new Error('Failed to get long-lived token');
  }

  return longLivedResponse.json();
};

// Get user info from Meta
export const getMetaUserInfo = async (accessToken: string) => {
  const response = await fetch(
    `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
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
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
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
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
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