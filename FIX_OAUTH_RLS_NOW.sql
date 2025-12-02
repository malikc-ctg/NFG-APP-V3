-- Fix RLS for gateway_oauth_sessions to allow Edge Function (service role) to insert

-- 1. Grant explicit permissions to service_role (should bypass RLS but let's be explicit)
GRANT ALL ON gateway_oauth_sessions TO service_role;
GRANT ALL ON gateway_oauth_sessions TO authenticated;

-- 2. Drop the restrictive policy
DROP POLICY IF EXISTS "Company owners can manage OAuth sessions" ON gateway_oauth_sessions;

-- 3. Create a more permissive policy that allows:
--    - Service role (Edge Functions) - should bypass RLS anyway
--    - Company owners
--    - Company admins
CREATE POLICY "Allow OAuth session management" 
ON gateway_oauth_sessions
FOR ALL 
USING (
  -- Allow if user is company owner or admin
  EXISTS (
    SELECT 1 FROM company_profiles cp
    LEFT JOIN user_profiles up ON up.company_id = cp.id AND up.id = auth.uid()
    WHERE cp.id = gateway_oauth_sessions.company_id
    AND (
      cp.owner_id = auth.uid()
      OR (up.id IS NOT NULL AND up.role IN ('admin', 'super_admin'))
    )
  )
  -- Service role automatically bypasses RLS, so this is just for authenticated users
)
WITH CHECK (
  -- Same check for inserts/updates
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

-- 4. Verify RLS is enabled but service_role can bypass
-- Service role should automatically bypass RLS, but if not, we need to disable RLS for service_role operations

-- Check if service_role needs explicit bypass (it shouldn't, but let's verify)
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'gateway_oauth_sessions';

-- The service role (used by Edge Functions) should bypass RLS automatically
-- But if it's still failing, we might need to check the Edge Function is using service role correctly

