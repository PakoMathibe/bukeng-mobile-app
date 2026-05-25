// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  // Server-side (never exposed to client)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  PAYSHAP_API_KEY: z.string().min(1),
  DEBICHECK_API_KEY: z.string().min(1),
  DEBICHECK_WEBHOOK_SECRET: z.string().min(1),
  
  // Client-side (safe to expose)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'staging', 'production']),
})

// Validate at build time per Section 11
export const env = envSchema.parse({
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  PAYSHAP_API_KEY: process.env.PAYSHAP_API_KEY,
  DEBICHECK_API_KEY: process.env.DEBICHECK_API_KEY,
  DEBICHECK_WEBHOOK_SECRET: process.env.DEBICHECK_WEBHOOK_SECRET,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
})