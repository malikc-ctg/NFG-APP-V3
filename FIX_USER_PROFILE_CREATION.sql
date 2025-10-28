-- ==========================================
-- Fix User Profile Creation
-- ==========================================
-- This script creates a trigger to automatically create user_profiles
-- when a new auth user is created, avoiding RLS issues

-- 1. Create a function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'client',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Drop the trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Update RLS policy to allow users to view their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
FOR SELECT USING (
  id = auth.uid()
  OR
  EXISTS (SELECT 1 FROM user_profiles up_admin WHERE up_admin.id = auth.uid() AND up_admin.role = 'admin')
);

-- 5. Update RLS policy to allow users to update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
FOR UPDATE USING (
  id = auth.uid()
);

-- 6. Allow service role to insert (for manual profile creation)
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
CREATE POLICY "Service role can insert profiles" ON user_profiles
FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'service_role'
);

-- ==========================================
-- Setup Complete!
-- ==========================================
-- This will automatically create user_profiles for new signups
-- The signup.js code can now be simplified to just call auth.signUp()

