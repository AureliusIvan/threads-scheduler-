import { NextRequest } from 'next/server';
import { exchangeCodeForToken, validateMetaConfig } from '@/lib/auth-config';
import { createThreadsClient } from '@/lib/threads-api';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Validate configuration
  try {
    validateMetaConfig();
  } catch (error) {
    console.error('Meta configuration error:', error);
    return new Response('Configuration error', { status: 500 });
  }

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    const errorDescription = searchParams.get('error_description');
    return new Response(
      `OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`,
      { status: 400 }
    );
  }

  // Check for authorization code
  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);
    
    if (!tokenResponse.access_token) {
      throw new Error('No access token received');
    }

    // Test the token by getting user info
    const threadsClient = createThreadsClient(tokenResponse.access_token, true);
    const userInfo = await threadsClient.getMe(['id', 'username', 'name']);

    // Store user and token info in database
    const supabase = createClient();
    
    // First, check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('threads_user_id', userInfo.id)
      .single();

    if (existingUser) {
      // Update existing user's token
      await supabase
        .from('users')
        .update({
          threads_access_token: tokenResponse.access_token,
          threads_token_expires_at: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('threads_user_id', userInfo.id);
    } else {
      // Create new user record
      await supabase
        .from('users')
        .insert({
          threads_user_id: userInfo.id,
          username: userInfo.username,
          display_name: userInfo.name,
          threads_access_token: tokenResponse.access_token,
          threads_token_expires_at: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    // Set cookie and redirect to dashboard
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': '/dashboard',
        'Set-Cookie': `threads_user_id=${userInfo.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}` // 30 days
      }
    });

    return response;

  } catch (error) {
    console.error('Token exchange or user creation error:', error);
    return new Response(
      `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests (webhook subscriptions, etc.)
  return NextResponse.json({ message: 'POST method not supported for this endpoint' }, { status: 405 });
} 