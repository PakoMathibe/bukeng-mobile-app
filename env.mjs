// env.mjs
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // Supabase
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_JWT_SECRET: z.string().min(1),
    
    // Payment integrations
    PAYSHAP_API_KEY: z.string().min(1),
    DEBICHECK_API_KEY: z.string().min(1),
    DEBICHECK_WEBHOOK_SECRET: z.string().min(1),
    
    // File processing
    PDF_PARSE_MAX_FILE_SIZE_MB: z.string().transform(Number).pipe(z.number().min(1).max(50)),
    
    // App config
    NODE_ENV: z.enum(["development", "test", "production"]),
  },
  
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]),
  },
  
  runtimeEnv: {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
    PAYSHAP_API_KEY: process.env.PAYSHAP_API_KEY,
    DEBICHECK_API_KEY: process.env.DEBICHECK_API_KEY,
    DEBICHECK_WEBHOOK_SECRET: process.env.DEBICHECK_WEBHOOK_SECRET,
    PDF_PARSE_MAX_FILE_SIZE_MB: process.env.PDF_PARSE_MAX_FILE_SIZE_MB,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
});