import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

interface RateLimit {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimit> = {
  '/api/posts': { endpoint: 'posts', maxRequests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
  '/api/posts/[id]/publish': { endpoint: 'publish', maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
  '/api/media': { endpoint: 'media', maxRequests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
  '/api/analytics': { endpoint: 'analytics', maxRequests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
  '/api/scheduler': { endpoint: 'scheduler', maxRequests: 30, windowMs: 60 * 60 * 1000 }, // 30/hour
};

export async function rateLimiter(
  request: NextRequest,
  endpoint: string,
  userId: string
): Promise<{ allowed: boolean; remaining?: number; resetTime?: Date; error?: string }> {
  const supabase = createServerSupabaseClient();
  
  // Get rate limit config for this endpoint
  const rateLimit = RATE_LIMITS[endpoint];
  if (!rateLimit) {
    // If no specific limit, allow the request
    return { allowed: true };
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() - rateLimit.windowMs);

  try {
    // Check current usage in this time window
    const { data: usage, error: usageError } = await supabase
      .from('rate_limits')
      .select('request_count, window_start')
      .eq('user_id', userId)
      .eq('endpoint', rateLimit.endpoint)
      .gte('window_start', windowStart.toISOString())
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking rate limit:', usageError);
      return { allowed: true }; // Allow on error to avoid blocking users
    }

    const currentCount = usage?.request_count || 0;

    if (currentCount >= rateLimit.maxRequests) {
      // Rate limit exceeded
      const resetTime = new Date(windowStart.getTime() + rateLimit.windowMs);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        error: `Rate limit exceeded. Try again after ${resetTime.toISOString()}`,
      };
    }

    // Update or create rate limit record
    if (usage) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('rate_limits')
        .update({
          request_count: currentCount + 1,
          last_request: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', userId)
        .eq('endpoint', rateLimit.endpoint)
        .gte('window_start', windowStart.toISOString());

      if (updateError) {
        console.error('Error updating rate limit:', updateError);
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({
          user_id: userId,
          endpoint: rateLimit.endpoint,
          request_count: 1,
          window_start: now.toISOString(),
          last_request: now.toISOString(),
        });

      if (insertError) {
        console.error('Error creating rate limit record:', insertError);
      }
    }

    return {
      allowed: true,
      remaining: rateLimit.maxRequests - currentCount - 1,
      resetTime: new Date(windowStart.getTime() + rateLimit.windowMs),
    };

  } catch (error) {
    console.error('Rate limiter error:', error);
    return { allowed: true }; // Allow on error to avoid blocking users
  }
}

export function createRateLimitResponse(rateLimitResult: {
  allowed: boolean;
  remaining?: number;
  resetTime?: Date;
  error?: string;
}): NextResponse | null {
  if (rateLimitResult.allowed) {
    return null; // No response needed, request should proceed
  }

  const response = NextResponse.json(
    { error: rateLimitResult.error || 'Rate limit exceeded' },
    { status: 429 }
  );

  // Add rate limit headers
  if (rateLimitResult.remaining !== undefined) {
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  }
  
  if (rateLimitResult.resetTime) {
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetTime.getTime() / 1000).toString());
  }

  return response;
}

export async function cleanupOldRateLimits(): Promise<void> {
  const supabase = createServerSupabaseClient();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

  try {
    const { error } = await supabase
      .from('rate_limits')
      .delete()
      .lt('window_start', cutoff.toISOString());

    if (error) {
      console.error('Error cleaning up old rate limits:', error);
    }
  } catch (error) {
    console.error('Rate limit cleanup error:', error);
  }
} 