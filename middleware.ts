// middleware.ts - Fixed version with error handling
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Add safety check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If env vars are missing, skip auth middleware (for demo/development)
  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️ Supabase credentials missing - skipping auth middleware')
    return response
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // Auth routes logic
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
    const isProtectedPage = !isAuthPage && request.nextUrl.pathname !== '/'
    const isPublicPage = request.nextUrl.pathname === '/'

    // If no session and trying to access protected route, redirect to login
    if (!session && isProtectedPage) {
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists and trying to access auth routes, redirect to dashboard
    if (session && isAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  } catch (error) {
    console.error('Middleware auth error:', error)
    // Don't block the request if auth fails - just continue
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}