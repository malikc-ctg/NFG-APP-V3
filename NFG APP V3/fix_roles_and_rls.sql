-- Fix Roles and RLS Policies
-- Correct roles: admin, client, staff (NOT manager/worker)

-- First, drop ALL existing policies
DROP POLICY IF EXISTS "Temp allow all" ON user_profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON user_profiles;

DROP POLICY IF EXISTS "Allow all select inv" ON user_invitations;
DROP POLICY IF EXISTS "Allow all insert inv" ON user_invitations;
DROP POLICY IF EXISTS "Allow all update inv" ON user_invitations;

DROP POLICY IF EXISTS "Allow all select assign" ON worker_site_assignments;
DROP POLICY IF EXISTS "Allow all insert assign" ON worker_site_assignments;
DROP POLICY IF EXISTS "Allow all update assign" ON worker_site_assignments;
DROP POLICY IF EXISTS "Allow all delete assign" ON worker_site_assignments;

-- Drop and recreate user_profiles table with correct roles
DROP TABLE IF EXISTS user_profiles CASCADE;

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'client', 'staff')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  avatar_url TEXT,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop and recreate user_invitations table with correct roles
DROP TABLE IF EXISTS user_invitations CASCADE;

CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'client', 'staff')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  invitation_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keep worker_site_assignments table as is
CREATE TABLE IF NOT EXISTS worker_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  site_id BIGINT NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  can_manage BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DISABLE RLS for now (we'll add proper policies later)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_site_assignments DISABLE ROW LEVEL SECURITY;

-- Insert your admin profile
INSERT INTO user_profiles (id, email, full_name, role, status)
VALUES (
  '4c5dc516-e83e-4dba-872e-e344b6ef8916',
  'malikjcampbell05@gmail.com',
  'Malik Campbell',
  'admin',
  'active'
)
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', status = 'active', email = 'malikjcampbell05@gmail.com';


