// services/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabaseConfig = !!(supabaseUrl && supabaseServiceRoleKey);

if (!hasSupabaseConfig && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ Supabase admin not configured. Using demo mode.');
}

export const supabaseAdmin = hasSupabaseConfig
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Supabase admin not configured. Set SUPABASE_SERVICE_ROLE_KEY.');
    }
    return null;
  }
  return supabaseAdmin;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone_number: string;
          id_number: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
      };
      credit_profiles: {
        Row: {
          id: string;
          user_id: string;
          credit_score: number;
          credit_limit: number;
          available_credit: number;
          risk_level: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};