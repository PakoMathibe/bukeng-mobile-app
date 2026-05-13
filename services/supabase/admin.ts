// services/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase admin environment variables');
}

// Server-only Supabase client with service role (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types for Supabase
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
          tier: number;
          kyc_status: 'pending' | 'verified' | 'rejected';
          credit_limit: number;
          available_credit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          phone_number: string;
          id_number: string;
          tier?: number;
          kyc_status?: 'pending' | 'verified' | 'rejected';
          credit_limit?: number;
          available_credit?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string;
          type: 'purchase' | 'repayment' | 'late_fee';
          amount: number;
          fee: number;
          total: number;
          status: 'pending' | 'completed' | 'failed';
          reference: string;
          created_at: string;
          completed_at: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          order_id: string;
          amount: number;
          status: 'pending' | 'processing' | 'succeeded' | 'failed';
          payment_method: 'debit_order' | 'card' | 'qr';
          gateway_reference: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      repayments: {
        Row: {
          id: string;
          user_id: string;
          order_id: string;
          instalment_id: string;
          amount: number;
          late_fee: number;
          status: 'pending' | 'completed' | 'failed';
          due_date: string;
          paid_at: string | null;
          created_at: string;
        };
      };
      credit_profiles: {
        Row: {
          id: string;
          user_id: string;
          total_limit: number;
          available_credit: number;
          used_credit: number;
          credit_score: number;
          on_time_payments: number;
          late_payments: number;
          created_at: string;
          updated_at: string;
        };
      };
      merchants: {
        Row: {
          id: string;
          name: string;
          business_type: string;
          address: string;
          lat: number;
          lng: number;
          rating: number;
          is_active: boolean;
          created_at: string;
        };
      };
      kyc_records: {
        Row: {
          id: string;
          user_id: string;
          type: 'id_document' | 'selfie' | 'bank_statement';
          file_url: string;
          status: 'pending' | 'verified' | 'rejected';
          verified_at: string | null;
          created_at: string;
        };
      };
    };
  };
};
