-- migrations/supabase/audit_and_fix.sql

-- 1. Check RLS status on all tables
SELECT 
  tablename,
  schemaname,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Create missing audit columns function
CREATE OR REPLACE FUNCTION add_audit_columns()
RETURNS void AS $$
DECLARE
  table_record RECORD;
  financial_tables TEXT[] := ARRAY['transactions', 'repayment_schedules', 'credit_profiles', 'loans', 'debicheck_mandates'];
BEGIN
  FOREACH table_record IN ARRAY financial_tables
  LOOP
    EXECUTE format('
      ALTER TABLE IF EXISTS %I 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL
    ', table_record);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT add_audit_columns();

-- 3. Create required tables if missing
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT UNIQUE,
  id_number_hash TEXT, -- Hashed SA ID number
  onboarding_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 0 AND score <= 1000),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold')),
  limit_cents BIGINT NOT NULL DEFAULT 0,
  scoring_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scoring_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  location GEOGRAPHY(POINT),
  active BOOLEAN DEFAULT true,
  payshap_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  merchant_id UUID NOT NULL REFERENCES merchants(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payshap_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_amount_cents BIGINT NOT NULL CHECK (total_amount_cents > 0),
  outstanding_cents BIGINT NOT NULL CHECK (outstanding_cents >= 0),
  status TEXT CHECK (status IN ('active', 'completed', 'defaulted', 'written_off')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS repayment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES loans(id),
  due_date DATE NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'defaulted')),
  paid_at TIMESTAMPTZ,
  debicheck_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS debicheck_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  mandate_reference TEXT UNIQUE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE')),
  old_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS on all tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'audit_log'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record);
  END LOOP;
END $$;

-- 5. Create RLS policies
-- Profiles: users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Credit profiles: users can view their own credit profile
CREATE POLICY "Users can view own credit profile"
  ON credit_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert credit profiles"
  ON credit_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- Transactions: users can view own transactions, system inserts them
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Loans: users can view own loans
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert loans"
  ON loans FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Repayment schedules: users can view own repayment schedules
CREATE POLICY "Users can view own repayment schedules"
  ON repayment_schedules FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loans l
    WHERE l.id = loan_id
    AND l.user_id = auth.uid()
  ));

CREATE POLICY "System can update repayment schedules"
  ON repayment_schedules FOR UPDATE
  USING (auth.role() = 'service_role');

-- DebiCheck mandates: users can view their own mandates
CREATE POLICY "Users can view own debicheck mandates"
  ON debicheck_mandates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create debicheck mandates"
  ON debicheck_mandates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Audit log: only service role can view
CREATE POLICY "Service role can view audit log"
  ON audit_log FOR SELECT
  USING (auth.role() = 'service_role');

-- 6. Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_value, performed_by, performed_at)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), auth.uid(), NOW());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (table_name, record_id, action, old_value, new_value, performed_by, performed_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), auth.uid(), NOW());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (table_name, record_id, action, new_value, performed_by, performed_at)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), auth.uid(), NOW());
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Add audit triggers to financial tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
      AND tablename IN ('transactions', 'repayment_schedules', 'credit_profiles', 'loans', 'debicheck_mandates')
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS audit_trigger ON %I;
      CREATE TRIGGER audit_trigger
      AFTER INSERT OR UPDATE OR DELETE ON %I
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()
    ', table_record, table_record);
  END LOOP;
END $$;