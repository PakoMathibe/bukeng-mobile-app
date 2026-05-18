-- migrations/supabase/001_initial_schema.sql
-- Run this in your Supabase SQL editor

-- ============================================
-- EXTENSIONS
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  id_number TEXT,
  date_of_birth DATE,
  status TEXT DEFAULT 'active',
  tier INTEGER DEFAULT 0,
  kyc_status TEXT DEFAULT 'pending',
  credit_limit DECIMAL(10,2) DEFAULT 0,
  available_credit DECIMAL(10,2) DEFAULT 0,
  onboarding_progress JSONB DEFAULT '{
    "phoneVerified": false,
    "emailVerified": false,
    "idVerified": false,
    "selfieVerified": false,
    "bankUploaded": false,
    "lastCompletedStep": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchants table
CREATE TABLE public.merchants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  registration_number TEXT,
  vat_number TEXT,
  address TEXT NOT NULL,
  lat DECIMAL(10,8) NOT NULL,
  lng DECIMAL(11,8) NOT NULL,
  formatted_address TEXT,
  place_id TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  operating_hours JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant ratings table
CREATE TABLE public.merchant_ratings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  helpful INTEGER DEFAULT 0,
  reported BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  merchant_id UUID REFERENCES public.merchants(id),
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  type TEXT NOT NULL,
  payment_method TEXT,
  reference TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Installment plans table
CREATE TABLE public.installment_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  number_of_installments INTEGER DEFAULT 3,
  installment_amount DECIMAL(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repayments table
CREATE TABLE public.repayments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  installment_plan_id UUID REFERENCES public.installment_plans(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit profiles table
CREATE TABLE public.credit_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  credit_score INTEGER DEFAULT 500,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  available_credit DECIMAL(10,2) DEFAULT 0,
  used_credit DECIMAL(10,2) DEFAULT 0,
  risk_level TEXT DEFAULT 'medium',
  on_time_payments INTEGER DEFAULT 0,
  late_payments INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit decisions table
CREATE TABLE public.credit_decisions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  reason TEXT,
  score_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KYC records table
CREATE TABLE public.kyc_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fraud logs table
CREATE TABLE public.fraud_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  risk_score NUMERIC,
  reason TEXT,
  device_info JSONB,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offline queue table
CREATE TABLE public.offline_queue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES (Performance)
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_tier ON public.users(tier);

-- Merchants indexes
CREATE INDEX IF NOT EXISTS idx_merchants_lat_lng ON public.merchants(lat, lng);
CREATE INDEX IF NOT EXISTS idx_merchants_status ON public.merchants(status);
CREATE INDEX IF NOT EXISTS idx_merchants_business_type ON public.merchants(business_type);
CREATE INDEX IF NOT EXISTS idx_merchants_rating ON public.merchants(rating DESC);

-- Merchant ratings indexes
CREATE INDEX IF NOT EXISTS idx_merchant_ratings_merchant_id ON public.merchant_ratings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_ratings_user_id ON public.merchant_ratings(user_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON public.transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);

-- Installment plans indexes
CREATE INDEX IF NOT EXISTS idx_installment_plans_transaction_id ON public.installment_plans(transaction_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_status ON public.installment_plans(status);

-- Repayments indexes
CREATE INDEX IF NOT EXISTS idx_repayments_installment_plan_id ON public.repayments(installment_plan_id);
CREATE INDEX IF NOT EXISTS idx_repayments_due_date ON public.repayments(due_date);
CREATE INDEX IF NOT EXISTS idx_repayments_status ON public.repayments(status);

-- Credit profiles indexes
CREATE INDEX IF NOT EXISTS idx_credit_profiles_user_id ON public.credit_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_credit_score ON public.credit_profiles(credit_score);

-- Credit decisions indexes
CREATE INDEX IF NOT EXISTS idx_credit_decisions_user_id ON public.credit_decisions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_decisions_created_at ON public.credit_decisions(created_at);

-- KYC records indexes
CREATE INDEX IF NOT EXISTS idx_kyc_records_user_id ON public.kyc_records(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_records_status ON public.kyc_records(status);

-- Fraud logs indexes
CREATE INDEX IF NOT EXISTS idx_fraud_logs_user_id ON public.fraud_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_logs_created_at ON public.fraud_logs(created_at);

-- Offline queue indexes
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON public.offline_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON public.offline_queue(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_queue ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Merchants policies (public read for active merchants)
CREATE POLICY "Public can view active merchants" ON public.merchants
  FOR SELECT USING (status = 'active');

-- Merchant ratings policies
CREATE POLICY "Anyone can view merchant ratings" ON public.merchant_ratings
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can rate merchants" ON public.merchant_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" ON public.merchant_ratings
  FOR UPDATE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Installment plans policies
CREATE POLICY "Users can view own installment plans" ON public.installment_plans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions
      WHERE transactions.id = installment_plans.transaction_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Repayments policies
CREATE POLICY "Users can view own repayments" ON public.repayments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.installment_plans
      JOIN public.transactions ON transactions.id = installment_plans.transaction_id
      WHERE installment_plans.id = repayments.installment_plan_id
      AND transactions.user_id = auth.uid()
    )
  );

-- Credit profiles policies
CREATE POLICY "Users can view own credit profile" ON public.credit_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can update credit profiles" ON public.credit_profiles
  FOR UPDATE USING (true);

-- Credit decisions policies
CREATE POLICY "Users can view own credit decisions" ON public.credit_decisions
  FOR SELECT USING (auth.uid() = user_id);

-- KYC records policies
CREATE POLICY "Users can view own KYC records" ON public.kyc_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC records" ON public.kyc_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fraud logs policies (admin only, but allow insert for system)
CREATE POLICY "System can insert fraud logs" ON public.fraud_logs
  FOR INSERT WITH CHECK (true);

-- Offline queue policies
CREATE POLICY "Users can view own offline queue" ON public.offline_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offline queue" ON public.offline_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offline queue" ON public.offline_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offline queue" ON public.offline_queue
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_ratings_updated_at
  BEFORE UPDATE ON public.merchant_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_installment_plans_updated_at
  BEFORE UPDATE ON public.installment_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_profiles_updated_at
  BEFORE UPDATE ON public.credit_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update transaction total based on amount and fee
CREATE OR REPLACE FUNCTION update_transaction_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total = NEW.amount + COALESCE(NEW.fee, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transaction_total_before_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_transaction_total();

CREATE TRIGGER update_transaction_total_before_update
  BEFORE UPDATE OF amount, fee ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_transaction_total();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert sample merchants
INSERT INTO public.merchants (id, name, business_type, address, lat, lng, status, rating)
VALUES 
  (uuid_generate_v4(), 'SPAR Killarney', 'grocery', '33 Killarney Mall, Johannesburg', -26.145, 28.045, 'active', 4.5),
  (uuid_generate_v4(), 'Checkers Rosebank', 'grocery', 'The Zone, Rosebank', -26.140, 28.045, 'active', 4.3),
  (uuid_generate_v4(), 'Pick n Pay Sandton', 'grocery', 'Sandton City', -26.107, 28.054, 'active', 4.2)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify all indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;