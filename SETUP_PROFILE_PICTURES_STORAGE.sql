-- Setup storage bucket for profile pictures
-- Run this in Supabase SQL Editor

-- Step 1: Create the storage bucket (public so pictures can be viewed)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures', 
  'profile-pictures', 
  true,  -- Make it public so profile pictures can be viewed
  5242880,  -- 5 MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own profile picture" ON storage.objects;

-- Step 3: Create policy for authenticated users to upload profile pictures
-- Simplified version that allows any authenticated user to upload to this bucket
CREATE POLICY "Authenticated users can upload profile pictures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-pictures');

-- Step 4: Create policy for public to view profile pictures
CREATE POLICY "Public can view profile pictures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

-- Step 5: Create policy for authenticated users to update profile pictures
CREATE POLICY "Authenticated users can update profile pictures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Step 6: Create policy for authenticated users to delete profile pictures
CREATE POLICY "Authenticated users can delete profile pictures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-pictures');

-- Verification query
SELECT 
  '✅ Storage bucket "profile-pictures" is now ready!' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'profile-pictures';

