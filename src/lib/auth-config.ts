// Meta/Threads API OAuth Configuration
export const META_AUTH_CONFIG = {
  // OAuth URLs
  AUTHORIZATION_URL: 'https://www.threads.net/oauth/authorize',
  TOKEN_URL: 'https://graph.threads.net/v1.0/oauth/access_token',
  
  // Required scopes for Threads API
  SCOPES: [
    'threads_basic',
    'threads_content_publish', 
    'threads_manage_insights',
    'threads_manage_replies',
    'threads_read_replies'
  ],
  
  // App credentials from environment
  APP_ID: process.env.THREADS_APP_ID!,
  APP_SECRET: process.env.THREADS_APP_SECRET!,
  REDIRECT_URI: process.env.THREADS_REDIRECT_URI!,
  
  // API endpoints
  API_BASE: process.env.THREADS_API_BASE_URL || 'https://graph.threads.net',
  API_VERSION: process.env.THREADS_API_VERSION || 'v1.0'
} as const;

// Validate required environment variables
export function validateMetaConfig() {
  const required = ['THREADS_APP_ID', 'THREADS_APP_SECRET', 'THREADS_REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Build OAuth authorization URL
export function buildAuthUrl(state?: string) {
  const params = new URLSearchParams({
    client_id: META_AUTH_CONFIG.APP_ID,
    redirect_uri: META_AUTH_CONFIG.REDIRECT_URI,
    scope: META_AUTH_CONFIG.SCOPES.join(','),
    response_type: 'code'
  });
  
  if (state) {
    params.set('state', state);
  }
  
  return `${META_AUTH_CONFIG.AUTHORIZATION_URL}?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(code: string) {
  const response = await fetch(META_AUTH_CONFIG.TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: META_AUTH_CONFIG.APP_ID,
      client_secret: META_AUTH_CONFIG.APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: META_AUTH_CONFIG.REDIRECT_URI,
      code
    }).toString()
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }
  
  return response.json();
} 