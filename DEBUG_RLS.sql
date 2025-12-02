-- DEBUG: Check what's actually blocking access
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'company_profiles';

-- 2. Check what policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_profiles';

-- 3. Check if company exists
SELECT id, company_name, owner_id 
FROM company_profiles 
WHERE id = '28da591c-ae99-4f51-96b0-0f42105571fe';

-- 4. Check if user has company_id
SELECT id, email, company_id 
FROM user_profiles 
WHERE email = 'malikjcampbell05@gmail.com';

-- 5. Check your user ID
SELECT id, email 
FROM auth.users 
WHERE email = 'malikjcampbell05@gmail.com';
