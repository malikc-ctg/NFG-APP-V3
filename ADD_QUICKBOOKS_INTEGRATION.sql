-- ============================================
-- QuickBooks Multi-Tenant Integration Schema
-- ============================================
-- Creates the core tables needed to let every
-- organization connect its own QuickBooks tenant.
-- ============================================

-- Ensure we can generate UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- quickbooks_connections
-- Stores OAuth tokens + metadata per organization
-- ============================================
CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID, -- nullable until orgs table exists
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  realm_id TEXT NOT NULL, -- QuickBooks company id
  token_type TEXT DEFAULT 'bearer',
  scope TEXT[] DEFAULT ARRAY[]::TEXT[],
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  disconnected_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','error','disconnected')),
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure one active connection per organization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = current_schema()
      AND indexname = 'uq_qb_connections_org'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uq_qb_connections_org ON quickbooks_connections(organization_id)';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_qb_connections_status ON quickbooks_connections(status);

-- ============================================
-- quickbooks_sync_state
-- Tracks per-org sync checkpoints
-- ============================================
CREATE TABLE IF NOT EXISTS quickbooks_sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID UNIQUE,
  last_invoice_sync TIMESTAMPTZ,
  last_po_sync TIMESTAMPTZ,
  last_payment_sync TIMESTAMPTZ,
  last_inventory_sync TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  sync_cursor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qb_sync_state_org ON quickbooks_sync_state(organization_id);

-- ============================================
-- integration_states
-- One-time state tokens for OAuth callbacks
-- ============================================
CREATE TABLE IF NOT EXISTS integration_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  state_token TEXT UNIQUE NOT NULL,
  redirect_to TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_integration_states_provider ON integration_states(provider);
CREATE INDEX IF NOT EXISTS idx_integration_states_org ON integration_states(organization_id);

-- ============================================
-- Row Level Security (restricted to service role)
-- ============================================
ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_states ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies before creating new ones
DROP POLICY IF EXISTS "Service role manage qb connections" ON quickbooks_connections;
DROP POLICY IF EXISTS "Service role manage qb sync state" ON quickbooks_sync_state;
DROP POLICY IF EXISTS "Service role manage integration states" ON integration_states;

CREATE POLICY "Service role manage qb connections"
  ON quickbooks_connections
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manage qb sync state"
  ON quickbooks_sync_state
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manage integration states"
  ON integration_states
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- Trigger helpers to keep updated_at fresh
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_qb_connections_updated ON quickbooks_connections;
CREATE TRIGGER trg_qb_connections_updated
  BEFORE UPDATE ON quickbooks_connections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_qb_sync_state_updated ON quickbooks_sync_state;
CREATE TRIGGER trg_qb_sync_state_updated
  BEFORE UPDATE ON quickbooks_sync_state
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Success notice
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ QuickBooks integration tables created/updated successfully.';
END $$;

