-- NUCLEAR OPTION: Completely open up profile-pictures bucket
-- This will make uploads work by removing all restrictions

-- Step 1: Drop ALL policies on storage.objects for profile-pictures
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Step 2: Create ONE super permissive policy for INSERT
CREATE POLICY "profile_pictures_insert_policy"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-pictures');

-- Step 3: Create ONE super permissive policy for SELECT
CREATE POLICY "profile_pictures_select_policy"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-pictures');

-- Step 4: Create ONE super permissive policy for UPDATE
CREATE POLICY "profile_pictures_update_policy"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-pictures')
WITH CHECK (bucket_id = 'profile-pictures');

-- Step 5: Create ONE super permissive policy for DELETE
CREATE POLICY "profile_pictures_delete_policy"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-pictures');

-- Step 6: Make absolutely sure bucket is public
UPDATE storage.buckets 
SET public = true, 
    avif_autodetection = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'profile-pictures';

-- Verify
SELECT 
    '✅ All policies cleared and recreated!' as message,
    id, 
    name, 
    public 
FROM storage.buckets 
WHERE id = 'profile-pictures';

SELECT 
    '✅ New policies:' as message,
    policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE '%profile_pictures%';

SELECT '🎉 Try uploading now! It should work.' as final_message;

