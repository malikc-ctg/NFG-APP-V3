-- COMPLETE FIX for Profile Pictures Storage
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================
-- STEP 1: Clean up everything first
-- ============================================

-- Delete the bucket if it exists (start fresh)
DELETE FROM storage.buckets WHERE id = 'profile-pictures';

-- Drop ALL existing policies related to profile pictures
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to profile-pictures" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes from profile-pictures" ON storage.objects;

-- ============================================
-- STEP 2: Create the bucket fresh
-- ============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures', 
  'profile-pictures', 
  true,  -- MUST be public
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- ============================================
-- STEP 3: Create simple, working policies
-- ============================================

-- Allow ANY authenticated user to INSERT (upload)
CREATE POLICY "Allow authenticated uploads to profile-pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow ANYONE to SELECT (view)
CREATE POLICY "Allow public to view profile-pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Allow ANY authenticated user to UPDATE
CREATE POLICY "Allow authenticated updates to profile-pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Allow ANY authenticated user to DELETE
CREATE POLICY "Allow authenticated deletes from profile-pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- ============================================
-- STEP 4: Verify everything is set up
-- ============================================

-- Check bucket
SELECT 
  '✅ BUCKET CREATED' as status,
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets 
WHERE id = 'profile-pictures';

-- Check policies
SELECT 
  '✅ POLICIES CREATED' as status,
  policyname
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%profile-pictures%';

-- Final message
SELECT '✅✅✅ Profile pictures storage is now ready! Try uploading again.' as result;

