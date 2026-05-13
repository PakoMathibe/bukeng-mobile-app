// lib/rateLimit.ts
import { NextRequest, NextResponse } from 'next/server';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
) {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record) {
    if (now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return { success: true };
    }

    if (record.count >= limit) {
      return { success: false, limit, resetAt: record.resetAt };
    }

    record.count++;
    rateLimitMap.set(ip, record);
    return { success: true };
  }

  rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
  return { success: true };
}

export function withRateLimit(handler: Function, limit: number = 10) {
  return async (request: NextRequest) => {
    const rateLimitResult = rateLimit(request, limit);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests', resetAt: rateLimitResult.resetAt },
        { status: 429 }
      );
    }
    return handler(request);
  };
}
