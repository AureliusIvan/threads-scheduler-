import { NextRequest } from 'next/server';
import { buildAuthUrl, validateMetaConfig } from '@/lib/auth-config';

export async function GET(request: NextRequest) {
  try {
    // Validate Meta configuration
    validateMetaConfig();
    
    // Generate a random state parameter for security
    const state = globalThis.crypto.randomUUID();
    
    // Get return URL from query params (optional)
    const returnUrl = request.nextUrl.searchParams.get('returnUrl');
    if (returnUrl) {
      // In a production app, you might want to store this state->returnUrl mapping
      // in a database or secure session store
    }
    
    // Build OAuth authorization URL
    const authUrl = buildAuthUrl(state);
    
    // Redirect to Meta OAuth
    return new Response(null, {
      status: 302,
      headers: {
        'Location': authUrl
      }
    });
    
  } catch (error) {
    console.error('Auth signin error:', error);
    return new Response(
      `Configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    );
  }
}

 