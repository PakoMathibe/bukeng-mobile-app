// lib/supabase/server.ts
// Server-side Supabase client for use in:
// - API route handlers (app/api/*)
// - Server Components
// - Server Actions
//
// Uses @supabase/ssr to read/write auth cookies correctly in Next.js 13 App Router.
// Import createAdminClient only in server-only API routes that need RLS bypass.

import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Standard server client — respects RLS, uses the authenticated user's session.
 * Use this in server components and API routes for all user-facing operations.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookies cannot be set.
            // This is safe if the session is refreshed via middleware.
          }
        },
      },
    }
  )
}

/**
 * Admin client — bypasses RLS using the service role key.
 * Use ONLY in server-only API routes for privileged operations
 * (e.g. writing credit decisions, creating audit log entries).
 *
 * NEVER import this in client components, hooks, or domain functions.
 * NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser bundle.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}