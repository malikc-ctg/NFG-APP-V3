-- ============================================
-- FIX: Job Photos Storage RLS Policies
-- Error: new row violates row-level security policy
-- ============================================

-- Step 1: Check if job-photos bucket exists
SELECT 'Checking job-photos bucket...' as status;
SELECT id, name, public 
FROM storage.buckets 
WHERE name = 'job-photos';

-- Step 2: Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Drop ALL existing policies for job-photos
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND policyname LIKE '%job%photo%'
        OR policyname LIKE '%job-photos%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Step 4: Create new permissive policies (allow all authenticated users)

-- Allow SELECT (read/view)
CREATE POLICY "Anyone can view job photos"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'job-photos');

-- Allow INSERT (upload)
CREATE POLICY "Authenticated users can upload job photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

-- Allow UPDATE
CREATE POLICY "Authenticated users can update job photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'job-photos')
WITH CHECK (bucket_id = 'job-photos');

-- Allow DELETE
CREATE POLICY "Authenticated users can delete job photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos');

-- Step 5: Verify policies were created
SELECT 'Verifying policies...' as status;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%job%photo%'
ORDER BY policyname;

SELECT '✅ Job photos storage fixed!' as result;
SELECT '📸 Try uploading a photo now!' as next_step;

