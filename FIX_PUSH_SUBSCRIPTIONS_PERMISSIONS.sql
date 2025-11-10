-- Fix permissions for push_subscriptions table
-- This ensures the service role key can read/write to the table

-- Grant usage on schema (if needed)
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant all permissions on push_subscriptions to service_role
GRANT ALL ON public.push_subscriptions TO service_role;

-- Also grant to authenticated role (for client-side operations)
GRANT ALL ON public.push_subscriptions TO authenticated;

-- Verify the grants
SELECT 
  grantee, 
  privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'push_subscriptions'
ORDER BY grantee, privilege_type;

