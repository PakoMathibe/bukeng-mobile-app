// services/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('❌ Supabase admin credentials missing. Check SUPABASE_SERVICE_ROLE_KEY in .env.local');
}

if (process.env.NODE_ENV === 'development') {
  console.log('✅ Supabase admin configured');
}

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function getSupabaseAdmin() {
  return supabaseAdmin;
}