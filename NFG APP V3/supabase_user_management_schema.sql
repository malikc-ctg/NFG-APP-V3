-- ============================================
-- NFG User Management - Supabase Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'worker')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  avatar_url TEXT,
  organization_id UUID, -- For multi-tenant support later
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Invitations
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'manager', 'worker')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Assignments (which workers can access which sites)
CREATE TABLE IF NOT EXISTS worker_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id BIGINT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  can_manage BOOLEAN DEFAULT FALSE, -- Can manage the site or just view
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update jobs table to link to assigned worker
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_worker_site_assignments_worker ON worker_site_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_site_assignments_site ON worker_site_assignments(site_id);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_worker ON jobs(assigned_worker_id);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_site_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

-- Create new policies
CREATE POLICY "Admins and managers can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
    OR NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid()) -- Allow first user
  );

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for user_invitations

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins and managers can view invitations" ON user_invitations;
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON user_invitations;
DROP POLICY IF EXISTS "Admins and managers can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins and managers can update invitations" ON user_invitations;

-- Create new policies
CREATE POLICY "Admins and managers can view invitations"
  ON user_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Anyone can view invitation by token (for acceptance page)
CREATE POLICY "Anyone can view invitation by token"
  ON user_invitations FOR SELECT
  USING (TRUE);

-- Admins and managers can create invitations
CREATE POLICY "Admins and managers can create invitations"
  ON user_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins and managers can update invitations
CREATE POLICY "Admins and managers can update invitations"
  ON user_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- RLS Policies for worker_site_assignments

-- Drop existing policies first
DROP POLICY IF EXISTS "Admins and managers can view all assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Workers can view own assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can create assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can update assignments" ON worker_site_assignments;
DROP POLICY IF EXISTS "Admins and managers can delete assignments" ON worker_site_assignments;

-- Create new policies
CREATE POLICY "Admins and managers can view all assignments"
  ON worker_site_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Workers can view their own assignments
CREATE POLICY "Workers can view own assignments"
  ON worker_site_assignments FOR SELECT
  USING (auth.uid() = worker_id);

-- Admins and managers can create assignments
CREATE POLICY "Admins and managers can create assignments"
  ON worker_site_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins and managers can update assignments
CREATE POLICY "Admins and managers can update assignments"
  ON worker_site_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Admins and managers can delete assignments
CREATE POLICY "Admins and managers can delete assignments"
  ON worker_site_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Update jobs RLS to consider worker assignments

-- Drop existing jobs policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view their own jobs or assigned jobs" ON jobs;

CREATE POLICY "Users can view their own jobs or assigned jobs"
  ON jobs FOR SELECT
  USING (
    auth.uid() = user_id -- Owner
    OR auth.uid() = assigned_worker_id -- Assigned worker
    OR EXISTS ( -- Manager/Admin
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager')
    )
  );

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'worker'),
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FINAL STEP: Make yourself admin!
-- ============================================

INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  '4c5dc516-e83e-4dba-872e-e344b6ef8916',
  'malikjcampbell05@gmail.com',
  'Malik Campbell',
  'admin',
  'active'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', status = 'active';

