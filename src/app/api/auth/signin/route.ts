import { NextRequest, NextResponse } from 'next/server';
import { getMetaAuthUrl } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Generate a state parameter for security
    const state = crypto.randomUUID();
    
    // Store state in a secure cookie (you might want to use a more robust solution in production)
    const response = NextResponse.redirect(getMetaAuthUrl(state));
    
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate sign-in' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // For programmatic sign-in (if needed)
  try {
    const body = await request.json();
    const { redirectTo = '/dashboard' } = body;

    const state = crypto.randomUUID();
    const authUrl = getMetaAuthUrl(state);

    return NextResponse.json({
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate sign-in' },
      { status: 500 }
    );
  }
} 