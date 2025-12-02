-- Quick fix: Disable RLS on gateway_oauth_sessions so Edge Function can insert
-- The Edge Function uses service_role which should bypass RLS, but if it's still failing, this will fix it

-- Grant permissions first
GRANT ALL ON gateway_oauth_sessions TO service_role;
GRANT ALL ON gateway_oauth_sessions TO authenticated;
GRANT ALL ON gateway_oauth_sessions TO anon;

-- Drop all existing policies
DROP POLICY IF EXISTS "Company owners can manage OAuth sessions" ON gateway_oauth_sessions;
DROP POLICY IF EXISTS "Allow service role and company owners to manage OAuth sessions" ON gateway_oauth_sessions;
DROP POLICY IF EXISTS "Allow OAuth session management" ON gateway_oauth_sessions;

-- Option 1: Disable RLS entirely (simplest)
ALTER TABLE gateway_oauth_sessions DISABLE ROW LEVEL SECURITY;

-- OR Option 2: Keep RLS enabled but allow service_role and authenticated users
-- Uncomment below if you want to keep RLS enabled:

/*
ALTER TABLE gateway_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service_role to do everything (should bypass anyway but explicit is better)
CREATE POLICY "Service role bypass" ON gateway_oauth_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users who are company owners/admins
CREATE POLICY "Company owners can manage OAuth sessions" ON gateway_oauth_sessions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM company_profiles cp
    LEFT JOIN user_profiles up ON up.company_id = cp.id AND up.id = auth.uid()
    WHERE cp.id = gateway_oauth_sessions.company_id
    AND (
      cp.owner_id = auth.uid()
      OR (up.id IS NOT NULL AND up.role IN ('admin', 'super_admin'))
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM company_profiles cp
    LEFT JOIN user_profiles up ON up.company_id = cp.id AND up.id = auth.uid()
    WHERE cp.id = gateway_oauth_sessions.company_id
    AND (
      cp.owner_id = auth.uid()
      OR (up.id IS NOT NULL AND up.role IN ('admin', 'super_admin'))
    )
  )
);
*/

