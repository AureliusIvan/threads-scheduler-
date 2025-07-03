import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase';
import { rateLimiter, createRateLimitResponse } from '@/middleware/rateLimiter';

// Paths that require authentication
const protectedPaths = [
  '/api/posts',
  '/api/analytics',
  '/api/media',
  '/api/scheduler',
];

// Paths that don't require authentication
const publicPaths = [
  '/api/auth',
  '/api/webhooks',
];

// Admin-only paths (for cron jobs, etc.)
const adminPaths = [
  '/api/scheduler',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for non-API routes and public paths
  if (!pathname.startsWith('/api/') || publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Check if this is a protected path
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  const isAdminPath = adminPaths.some(path => pathname.startsWith(path));

  if (!isProtectedPath) {
    return response;
  }

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareSupabaseClient();
    
    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from our database
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .select('id, email, subscription_tier')
      .eq('email', user.email)
      .single();

    if (userError || !dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Admin path check (for cron job endpoints)
    if (isAdminPath && request.method === 'POST') {
      const body = await request.text();
      const parsed = JSON.parse(body || '{}');
      
      // Allow cron job requests (you might want to add API key validation here)
      if (parsed.action === 'process') {
        // Create new request with the parsed body
        const newRequest = new Request(request.url, {
          method: request.method,
          headers: request.headers,
          body: body,
        });
        return NextResponse.next();
      }
    }

    // Rate limiting
    const rateLimitResult = await rateLimiter(request, pathname, dbUser.id);
    const rateLimitResponse = createRateLimitResponse(rateLimitResult);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Add rate limit headers to successful requests
    if (rateLimitResult.remaining !== undefined) {
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    }
    if (rateLimitResult.resetTime) {
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString());
    }

    // Content-Type validation for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      
      // Allow multipart for file uploads
      if (pathname.includes('/media')) {
        if (!contentType?.startsWith('multipart/form-data')) {
          return NextResponse.json(
            { error: 'Invalid content type for media upload' },
            { status: 400 }
          );
        }
      } else {
        // Require JSON for other endpoints
        if (!contentType?.includes('application/json')) {
          return NextResponse.json(
            { error: 'Content-Type must be application/json' },
            { status: 400 }
          );
        }
      }
    }

    // Request size validation (10MB max)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Request too large' },
        { status: 413 }
      );
    }

    // Add user info to headers for API routes
    response.headers.set('X-User-ID', dbUser.id);
    response.headers.set('X-User-Email', dbUser.email);
    response.headers.set('X-User-Tier', dbUser.subscription_tier || 'free');

    // Log audit trail for sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Fire and forget audit log
      supabase
        .from('audit_logs')
        .insert({
          user_id: dbUser.id,
          action: `${request.method} ${pathname}`,
          ip_address: ip,
          user_agent: userAgent,
          endpoint: pathname,
        })
        .then(({ error }) => {
          if (error) {
            console.error('Failed to log audit trail:', error);
          }
        });
    }

    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 