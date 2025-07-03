import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { 
  exchangeCodeForToken, 
  getLongLivedToken, 
  getMetaUserInfo 
} from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/types/database';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  // Handle OAuth errors
  if (error || !code) {
    return NextResponse.redirect(
      new URL('/auth/error?error=oauth_error', requestUrl.origin)
    );
  }

  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }

    // Get long-lived token (60 days)
    const longLivedTokenData = await getLongLivedToken(tokenData.access_token);
    const accessToken = longLivedTokenData.access_token || tokenData.access_token;
    const expiresIn = longLivedTokenData.expires_in || tokenData.expires_in || 5184000; // 60 days default

    // Get user info from Meta
    const metaUser = await getMetaUserInfo(accessToken);

    if (!metaUser.id || !metaUser.email) {
      throw new Error('Incomplete user data from Meta');
    }

    // Check if user exists in our database
    let { data: existingUser, error: selectError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('meta_id', metaUser.id)
      .single();

    let userId: string;

    if (selectError && selectError.code === 'PGRST116') {
      // User doesn't exist, create new user
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          meta_id: metaUser.id,
          email: metaUser.email,
          name: metaUser.name || 'User',
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          is_active: true,
          subscription_tier: 'free',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user:', insertError);
        throw new Error('Failed to create user');
      }

      userId = newUser.id;

      // Create default user settings
      await supabaseAdmin
        .from('user_settings')
        .insert({
          user_id: userId,
          timezone: 'UTC',
          auto_save_enabled: true,
          auto_save_interval: 30,
          default_privacy: 'public',
          notification_preferences: {},
          posting_schedule: {},
        });

    } else if (!selectError) {
      // User exists, update their access token
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          access_token: accessToken,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          email: metaUser.email,
          name: metaUser.name || existingUser.name,
          updated_at: new Date().toISOString(),
        })
        .eq('meta_id', metaUser.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        throw new Error('Failed to update user');
      }

      userId = existingUser.id;
    } else {
      console.error('Database error:', selectError);
      throw new Error('Database error');
    }

    // Create a Supabase session
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookies().set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookies().set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // Sign in the user with Supabase Auth using a custom provider
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: metaUser.email,
      password: metaUser.id, // Use Meta ID as password for this custom flow
    });

    // If user doesn't exist in Supabase Auth, create them
    if (signInError) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: metaUser.email,
        password: metaUser.id,
        options: {
          data: {
            name: metaUser.name,
            meta_id: metaUser.id,
            user_id: userId,
          },
        },
      });

      if (signUpError) {
        console.error('Error creating auth user:', signUpError);
        // Continue anyway - we have the user in our database
      }
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(
      new URL('/dashboard', requestUrl.origin)
    );

  } catch (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=callback_error', requestUrl.origin)
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests (webhook subscriptions, etc.)
  return NextResponse.json({ message: 'POST method not supported for this endpoint' }, { status: 405 });
} 