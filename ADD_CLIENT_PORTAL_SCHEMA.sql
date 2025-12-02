-- ==========================================
-- CLIENT PORTAL DATABASE SCHEMA
-- Run this in Supabase SQL Editor
-- ==========================================

BEGIN;

-- ==========================================
-- 1. CLIENT PREFERENCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Notification Preferences
  email_notifications BOOLEAN DEFAULT true,
  job_completed_notifications BOOLEAN DEFAULT true,
  invoice_notifications BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  
  -- Display Preferences
  default_view TEXT DEFAULT 'dashboard',
  items_per_page INTEGER DEFAULT 20,
  
  -- Communication Preferences
  preferred_contact_method TEXT DEFAULT 'email',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_preferences_client ON client_preferences(client_id);

-- RLS Policies
ALTER TABLE client_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own preferences" ON client_preferences;
CREATE POLICY "Clients can view own preferences"
  ON client_preferences FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Clients can update own preferences" ON client_preferences;
CREATE POLICY "Clients can update own preferences"
  ON client_preferences FOR UPDATE
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can insert own preferences" ON client_preferences;
CREATE POLICY "Clients can insert own preferences"
  ON client_preferences FOR INSERT
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Admins can insert preferences" ON client_preferences;
CREATE POLICY "Admins can insert preferences"
  ON client_preferences FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin')
    )
  );

-- ==========================================
-- 2. SERVICE REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  
  -- Request Details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent', 'emergency')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'scheduled', 'in-progress', 'completed', 'cancelled')),
  
  -- Service Selection
  requested_services JSONB,
  requested_date DATE,
  preferred_time TEXT,
  
  -- Attachments
  attachments JSONB,
  
  -- Response
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  response_notes TEXT,
  
  -- Linked Job (if converted to job)
  linked_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_requests_client ON service_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_site ON service_requests(site_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created ON service_requests(created_at DESC);

-- RLS Policies
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own requests" ON service_requests;
CREATE POLICY "Clients can view own requests"
  ON service_requests FOR SELECT
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

DROP POLICY IF EXISTS "Clients can create requests" ON service_requests;
CREATE POLICY "Clients can create requests"
  ON service_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can update own requests" ON service_requests;
CREATE POLICY "Clients can update own requests"
  ON service_requests FOR UPDATE
  USING (
    client_id = auth.uid() 
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Admins/Staff can update all requests" ON service_requests;
CREATE POLICY "Admins/Staff can update all requests"
  ON service_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- ==========================================
-- 3. ADD client_id COLUMN TO SITES TABLE (if doesn't exist)
-- ==========================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sites' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE sites ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);
  END IF;
END $$;

-- ==========================================
-- 4. UPDATE SITES RLS FOR CLIENTS
-- ==========================================
DROP POLICY IF EXISTS "Clients can view own sites" ON sites;
CREATE POLICY "Clients can view own sites" ON sites
FOR SELECT USING (
  (client_id IS NOT NULL AND client_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
  OR (created_by IS NOT NULL AND created_by = auth.uid())
);

-- ==========================================
-- 5. UPDATE JOBS RLS FOR CLIENTS
-- ==========================================
DROP POLICY IF EXISTS "Clients can view jobs for their sites" ON jobs;
CREATE POLICY "Clients can view jobs for their sites" ON jobs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites
    WHERE sites.id = jobs.site_id
    AND sites.client_id IS NOT NULL
    AND sites.client_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
  OR (assigned_worker_id IS NOT NULL AND assigned_worker_id = auth.uid())
);

-- ==========================================
-- 6. UPDATE INVOICES RLS FOR CLIENTS
-- ==========================================
-- Check if invoices table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
    DROP POLICY IF EXISTS "Clients can view own invoices" ON invoices;
    CREATE POLICY "Clients can view own invoices" ON invoices
    FOR SELECT USING (
      client_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'staff')
      )
    );
  END IF;
END $$;

-- ==========================================
-- 7. UPDATE BOOKINGS RLS FOR CLIENTS
-- ==========================================
DROP POLICY IF EXISTS "Clients can view own bookings" ON bookings;
CREATE POLICY "Clients can view own bookings" ON bookings
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM sites
    WHERE sites.id = bookings.site_id
    AND sites.client_id IS NOT NULL
    AND sites.client_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

COMMIT;

-- ==========================================
-- Success Message
-- ==========================================
SELECT '✅ Client Portal schema created successfully!' as result;

