// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/crypto';
import { supabase } from '@/services/supabase/client';

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/how-it-works',
  '/merchants',
  '/map',
];
const ONBOARDING_ROUTES = ['/onboarding'];
const STATIC_ASSETS = ['/_next', '/favicon.ico', '/images', '/fonts'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_ASSETS.some((asset) => pathname.startsWith(asset))) {
    return NextResponse.next();
  }

  // Check if route is public
  if (PUBLIC_ROUTES.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check if route is onboarding
  if (ONBOARDING_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get auth token from cookie or header
  const token = request.cookies.get('bukeng_token')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;
  const finalToken = token || bearerToken;

  // Check if user is authenticated via Supabase session
  let isAuthenticated = false;
  if (finalToken) {
    const payload = verifyToken(finalToken);
    if (payload) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      isAuthenticated = !!session;
    }
  }

  if (!isAuthenticated && !finalToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
