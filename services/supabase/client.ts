// services/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// NO FALLBACK - throw error if missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase environment variables are missing. Check your .env.local file.');
}

console.log('✅ Supabase configured with:', supabaseUrl);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});