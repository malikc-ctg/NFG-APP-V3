-- Fix RLS policy for gateway_oauth_sessions to allow service role inserts
-- The Edge Function uses service role which should bypass RLS, but we need to ensure it works

-- First, let's grant direct permissions to service_role
GRANT ALL ON gateway_oauth_sessions TO service_role;
GRANT ALL ON gateway_oauth_sessions TO authenticated;
GRANT ALL ON gateway_oauth_sessions TO anon;

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Company owners can manage OAuth sessions" ON gateway_oauth_sessions;

-- Create a new policy that allows service role and company owners
-- Service role (used by Edge Functions) can do everything
-- Company owners can manage their own sessions
CREATE POLICY "Allow service role and company owners to manage OAuth sessions" 
ON gateway_oauth_sessions
FOR ALL 
USING (
  -- Service role can do everything (this is checked first, service role bypasses RLS anyway)
  -- But we also allow company owners
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = gateway_oauth_sessions.company_id
    AND (
      company_profiles.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = company_profiles.id
        AND user_profiles.role IN ('admin', 'super_admin')
      )
    )
  )
)
WITH CHECK (
  -- Same check for inserts
  EXISTS (
    SELECT 1 FROM company_profiles 
    WHERE company_profiles.id = gateway_oauth_sessions.company_id
    AND (
      company_profiles.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_profiles.id = auth.uid() 
        AND user_profiles.company_id = company_profiles.id
        AND user_profiles.role IN ('admin', 'super_admin')
      )
    )
  )
);

-- However, service_role should bypass RLS automatically
-- If it's still not working, let's also ensure the table allows service_role explicitly
ALTER TABLE gateway_oauth_sessions ENABLE ROW LEVEL SECURITY;

-- Verify the grants
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' 
AND table_name = 'gateway_oauth_sessions'
ORDER BY grantee, privilege_type;

