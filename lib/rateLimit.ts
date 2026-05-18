// lib/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired entries every hour
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

/**
 * Rate limit middleware for API routes
 * 
 * @param request - Next.js request object
 * @param limit - Maximum number of requests in window
 * @param windowMs - Time window in milliseconds
 * @returns Object with success status and reset time if failed
 */
export function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): { success: boolean; limit?: number; resetAt?: number } {
  // Get client IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record) {
    // Reset if window has passed
    if (now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return { success: true };
    }

    // Check if limit exceeded
    if (record.count >= limit) {
      return { success: false, limit, resetAt: record.resetAt };
    }

    // Increment counter
    record.count++;
    rateLimitMap.set(ip, record);
    return { success: true };
  }

  // First request from this IP
  rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
  return { success: true };
}

/**
 * Higher-order function to wrap API routes with rate limiting
 * 
 * @param handler - API route handler function
 * @param limit - Maximum requests per window
 * @returns Wrapped handler with rate limiting
 * 
 * @example
 * export const POST = withRateLimit(async (request) => {
 *   // Your API logic
 * }, 5);
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse> | NextResponse,
  limit: number = 10
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    const rateLimitResult = rateLimit(request, limit);
    
    if (!rateLimitResult.success) {
      const resetAt = rateLimitResult.resetAt;
      const retryAfter = resetAt ? Math.ceil((resetAt - Date.now()) / 1000) : 60;
      
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: `Rate limit exceeded. Maximum ${limit} requests per window.`,
          retryAfter,
          resetAt: resetAt ? new Date(resetAt).toISOString() : null,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Reset': resetAt ? Math.ceil(resetAt / 1000).toString() : '',
          },
        }
      );
    }
    
    return handler(request);
  };
}

/**
 * Clear rate limit records for a specific IP (useful for testing)
 */
export function clearRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear();
}

/**
 * Get current rate limit status for an IP
 */
export function getRateLimitStatus(ip: string): { count: number; remaining: number; resetAt: Date | null } {
  const record = rateLimitMap.get(ip);
  
  if (!record) {
    return { count: 0, remaining: 0, resetAt: null };
  }
  
  const remaining = Math.max(0, (record.resetAt - Date.now()) / 1000);
  
  return {
    count: record.count,
    remaining: Math.floor(remaining),
    resetAt: new Date(record.resetAt),
  };
}