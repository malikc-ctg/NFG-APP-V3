-- ==========================================
-- PHASE 2: PAYMENT SYSTEM DATABASE SCHEMA
-- ==========================================
-- Multi-Gateway Payment Processing Support
-- Supports: Stripe, PayPal, Square, Manual Payments
-- Dual-direction: Company pays platform + Company receives from clients
-- ==========================================

-- ==========================================
-- 1. UPDATE COMPANY_PROFILES TABLE
-- ==========================================
-- Add payment gateway configuration fields

DO $$ 
BEGIN
  -- Payment gateway selection
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'square', 'manual', NULL));
  END IF;

  -- Gateway connection status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway_connected'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway_connected BOOLEAN DEFAULT FALSE;
  END IF;

  -- Gateway account ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway_account_id'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway_account_id VARCHAR(255);
  END IF;

  -- Gateway account status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway_account_status'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway_account_status TEXT CHECK (payment_gateway_account_status IN ('pending', 'active', 'restricted', 'disabled', NULL));
  END IF;

  -- Dashboard link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway_dashboard_link'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway_dashboard_link TEXT;
  END IF;

  -- Gateway metadata (for storing gateway-specific data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'payment_gateway_metadata'
  ) THEN
    ALTER TABLE company_profiles 
    ADD COLUMN payment_gateway_metadata JSONB;
  END IF;
END $$;

-- Indexes for company_profiles
CREATE INDEX IF NOT EXISTS idx_company_profiles_payment_gateway ON company_profiles(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_company_profiles_payment_gateway_account ON company_profiles(payment_gateway_account_id);

-- ==========================================
-- 2. UPDATE PAYMENTS TABLE (Client Payments)
-- ==========================================
-- Add gateway fields to existing payments table

DO $$ 
BEGIN
  -- Payment gateway used
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_gateway'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN payment_gateway TEXT CHECK (payment_gateway IN ('stripe', 'paypal', 'square', 'manual'));
  END IF;

  -- Gateway-specific payment ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_payment_id'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN gateway_payment_id VARCHAR(255);
  END IF;

  -- Company's gateway account ID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_account_id'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN gateway_account_id VARCHAR(255);
  END IF;

  -- Payment status (for gateway payments)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled'));
  END IF;

  -- Failure reason
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'failure_reason'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN failure_reason TEXT;
  END IF;

  -- Receipt URL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'receipt_url'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN receipt_url TEXT;
  END IF;

  -- Gateway metadata
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'gateway_metadata'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN gateway_metadata JSONB;
  END IF;
END $$;

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(payment_gateway);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_payment_id ON payments(gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_account ON payments(gateway_account_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_status ON payments(payment_status);

-- ==========================================
-- 3. PLATFORM SUBSCRIPTIONS TABLE
-- ==========================================
-- Companies paying platform for subscriptions

CREATE TABLE IF NOT EXISTS platform_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  
  -- Plan Details
  plan_name TEXT NOT NULL CHECK (plan_name IN ('starter', 'professional', 'enterprise')),
  amount NUMERIC(12,2) NOT NULL, -- Monthly amount
  currency VARCHAR(3) DEFAULT 'usd',
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
  
  -- Gateway Info
  gateway TEXT CHECK (gateway IN ('stripe', 'paypal', 'square', 'manual')),
  gateway_subscription_id VARCHAR(255), -- Stripe subscription ID, PayPal subscription ID, etc.
  gateway_customer_id VARCHAR(255), -- Stripe customer ID, PayPal payer ID, etc.
  
  -- Billing Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_company ON platform_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_status ON platform_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_gateway_subscription ON platform_subscriptions(gateway, gateway_subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_period_end ON platform_subscriptions(current_period_end);

-- ==========================================
-- 4. PLATFORM PAYMENTS TABLE
-- ==========================================
-- Companies paying platform (subscription fees, platform fees)

CREATE TABLE IF NOT EXISTS platform_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES platform_subscriptions(id) ON DELETE SET NULL,
  
  -- Payment Details
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  
  -- Gateway Info
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square', 'manual')),
  gateway_payment_id VARCHAR(255), -- Stripe charge ID, PayPal transaction ID, etc.
  gateway_account_id VARCHAR(255), -- Company's gateway account ID
  
  -- Payment Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'canceled')),
  failure_reason TEXT,
  
  -- Payment Type
  payment_type TEXT DEFAULT 'subscription' CHECK (payment_type IN ('subscription', 'platform_fee', 'setup_fee', 'manual')),
  
  -- Receipt
  receipt_url TEXT,
  
  -- Metadata
  gateway_metadata JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_platform_payments_company ON platform_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_subscription ON platform_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_gateway ON platform_payments(gateway);
CREATE INDEX IF NOT EXISTS idx_platform_payments_status ON platform_payments(status);
CREATE INDEX IF NOT EXISTS idx_platform_payments_gateway_payment_id ON platform_payments(gateway_payment_id);

-- ==========================================
-- 5. PAYMENT GATEWAY CONNECTIONS TABLE
-- ==========================================
-- Store company gateway connections (supports multiple gateways per company)

CREATE TABLE IF NOT EXISTS payment_gateway_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  gateway_account_id VARCHAR(255) NOT NULL,
  
  -- Connection Status
  connection_status TEXT DEFAULT 'pending' CHECK (connection_status IN ('pending', 'active', 'restricted', 'disabled', 'disconnected')),
  
  -- Connection Data (gateway-specific info)
  connection_data JSONB,
  
  -- Dates
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One connection per gateway per company
  UNIQUE(company_id, gateway)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gateway_connections_company ON payment_gateway_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_gateway_connections_gateway ON payment_gateway_connections(gateway);
CREATE INDEX IF NOT EXISTS idx_gateway_connections_status ON payment_gateway_connections(connection_status);

-- ==========================================
-- 6. PAYMENT INTENTS TABLE
-- ==========================================
-- Track payment attempts (works for all gateways)

CREATE TABLE IF NOT EXISTS payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Gateway Info
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  gateway_payment_id VARCHAR(255) NOT NULL, -- Stripe payment_intent_id, PayPal order_id, etc.
  gateway_account_id VARCHAR(255) NOT NULL, -- Company's gateway account
  
  -- Payment Details
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  status TEXT NOT NULL, -- Gateway-specific status
  
  -- Payment Method Info
  client_secret TEXT, -- For Stripe
  payment_approval_url TEXT, -- For PayPal/Square
  payment_method_types TEXT[],
  
  -- Metadata
  metadata JSONB,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique per gateway
  UNIQUE(gateway, gateway_payment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_intents_invoice_id ON payment_intents(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway ON payment_intents(gateway, gateway_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_gateway_account ON payment_intents(gateway_account_id);

-- ==========================================
-- 7. GATEWAY OAUTH SESSIONS TABLE
-- ==========================================
-- Track OAuth connection attempts

CREATE TABLE IF NOT EXISTS gateway_oauth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'paypal', 'square')),
  
  -- OAuth State
  state_token VARCHAR(255) UNIQUE NOT NULL,
  gateway_account_id VARCHAR(255), -- Set after successful connection
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'failed')),
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_company ON gateway_oauth_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_state ON gateway_oauth_sessions(state_token);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_status ON gateway_oauth_sessions(status);

-- ==========================================
-- 8. BANK ACCOUNTS TABLE
-- ==========================================
-- Store bank account information for ACH payments

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES company_profiles(id) ON DELETE CASCADE,
  
  -- Bank Info (encrypted/sensitive)
  bank_name TEXT,
  account_type TEXT CHECK (account_type IN ('checking', 'savings')),
  routing_number_encrypted TEXT, -- Should be encrypted
  account_number_encrypted TEXT, -- Should be encrypted
  last4 VARCHAR(4), -- Last 4 digits (safe to display)
  
  -- Verification
  verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_method TEXT CHECK (verification_method IN ('micro_deposits', 'instant', 'manual')),
  
  -- Linkage
  linked_via TEXT CHECK (linked_via IN ('stripe', 'paypal', 'square', 'plaid', 'manual')),
  gateway_account_token VARCHAR(255), -- Token from gateway
  
  -- Dates
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_verification_status ON bank_accounts(verification_status);

-- ==========================================
-- 9. RLS POLICIES
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE platform_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateway_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gateway_oauth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

-- Platform Subscriptions Policies
DROP POLICY IF EXISTS "Users can view their company subscriptions" ON platform_subscriptions;
CREATE POLICY "Users can view their company subscriptions" ON platform_subscriptions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = platform_subscriptions.company_id
    AND (
      company_profiles.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = company_profiles.id
      )
    )
  )
);

DROP POLICY IF EXISTS "Company owners can manage subscriptions" ON platform_subscriptions;
CREATE POLICY "Company owners can manage subscriptions" ON platform_subscriptions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = platform_subscriptions.company_id
    AND company_profiles.owner_id = auth.uid()
  )
);

-- Platform Payments Policies
DROP POLICY IF EXISTS "Users can view their company platform payments" ON platform_payments;
CREATE POLICY "Users can view their company platform payments" ON platform_payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = platform_payments.company_id
    AND (
      company_profiles.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = company_profiles.id
      )
    )
  )
);

-- Payment Gateway Connections Policies
DROP POLICY IF EXISTS "Users can view their company gateway connections" ON payment_gateway_connections;
CREATE POLICY "Users can view their company gateway connections" ON payment_gateway_connections
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = payment_gateway_connections.company_id
    AND (
      company_profiles.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = company_profiles.id
      )
    )
  )
);

DROP POLICY IF EXISTS "Company owners can manage gateway connections" ON payment_gateway_connections;
CREATE POLICY "Company owners can manage gateway connections" ON payment_gateway_connections
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = payment_gateway_connections.company_id
    AND company_profiles.owner_id = auth.uid()
  )
);

-- Payment Intents Policies
DROP POLICY IF EXISTS "Users can view payment intents for their invoices" ON payment_intents;
CREATE POLICY "Users can view payment intents for their invoices" ON payment_intents
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM invoices 
    WHERE invoices.id = payment_intents.invoice_id
    AND (
      invoices.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM company_profiles 
        JOIN user_profiles ON user_profiles.company_id = company_profiles.id
        WHERE user_profiles.id = auth.uid()
        AND invoices.site_id IN (
          SELECT id FROM sites WHERE company_id = company_profiles.id
        )
      )
    )
  )
);

-- Gateway OAuth Sessions Policies
DROP POLICY IF EXISTS "Company owners can manage OAuth sessions" ON gateway_oauth_sessions;
CREATE POLICY "Company owners can manage OAuth sessions" ON gateway_oauth_sessions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = gateway_oauth_sessions.company_id
    AND company_profiles.owner_id = auth.uid()
  )
);

-- Bank Accounts Policies
DROP POLICY IF EXISTS "Company owners can manage bank accounts" ON bank_accounts;
CREATE POLICY "Company owners can manage bank accounts" ON bank_accounts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = bank_accounts.company_id
    AND company_profiles.owner_id = auth.uid()
  )
);

-- ==========================================
-- 10. TRIGGERS FOR AUTO-UPDATE
-- ==========================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to new tables
DROP TRIGGER IF EXISTS update_platform_subscriptions_updated_at ON platform_subscriptions;
CREATE TRIGGER update_platform_subscriptions_updated_at
  BEFORE UPDATE ON platform_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_gateway_connections_updated_at ON payment_gateway_connections;
CREATE TRIGGER update_payment_gateway_connections_updated_at
  BEFORE UPDATE ON payment_gateway_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_intents_updated_at ON payment_intents;
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ✅ PHASE 2 SCHEMA COMPLETE
-- ==========================================
-- All tables created with proper indexes and RLS policies
-- Ready for Phase 3: Gateway Connection UI
