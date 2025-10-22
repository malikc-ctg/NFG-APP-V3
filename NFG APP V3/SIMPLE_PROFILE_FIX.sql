-- Simple Profile Pictures Fix
-- Copy ONLY this file into Supabase SQL Editor

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can delete profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;

-- Step 2: Make sure bucket exists and is public
UPDATE storage.buckets 
SET public = true
WHERE id = 'profile-pictures';

-- Step 3: Create working policies
CREATE POLICY "Allow uploads to profile-pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow viewing profile-pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Allow updates to profile-pictures"
ON storage.objects FOR UPDATE
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

CREATE POLICY "Allow deletes from profile-pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Done!
SELECT '✅ Profile pictures fixed! Try uploading now.' as result;

