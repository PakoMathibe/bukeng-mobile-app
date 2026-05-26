export type Database = {
    public: {
      Tables: {
        users: {
          Row: {
            id: string;
            email: string | null;
            phone_number: string | null;
            full_name: string | null;
            id_number: string | null;
            date_of_birth: string | null;
            status: string;
            tier: number;
            kyc_status: string;
            credit_limit: number;
            available_credit: number;
            on_time_payments: number;
            created_at: string;
            updated_at: string;
            last_login_at: string | null;
            email_verified: boolean;
            phone_verified: boolean;
          };
          Insert: {
            id?: string;
            email?: string | null;
            phone_number?: string | null;
            full_name?: string | null;
            id_number?: string | null;
            date_of_birth?: string | null;
            status?: string;
            tier?: number;
            kyc_status?: string;
            credit_limit?: number;
            available_credit?: number;
            on_time_payments?: number;
            created_at?: string;
            updated_at?: string;
            last_login_at?: string | null;
            email_verified?: boolean;
            phone_verified?: boolean;
          };
          Update: Partial<Database['public']['Tables']['users']['Insert']>;
        };
        credit_profiles: {
          Row: {
            id: string;
            user_id: string;
            credit_score: number | null;
            credit_limit: number | null;
            available_credit: number | null;
            risk_level: string | null;
            updated_at: string;
          };
          Insert: {
            id?: string;
            user_id: string;
            credit_score?: number | null;
            credit_limit?: number | null;
            available_credit?: number | null;
            risk_level?: string | null;
            updated_at?: string;
          };
          Update: Partial<Database['public']['Tables']['credit_profiles']['Insert']>;
        };
      };
    };
  };