-- ========================================
-- SETUP COMPLIANCE & INSURANCE DOCUMENT STORAGE
-- ========================================
-- This script creates a Supabase Storage bucket for compliance documents
-- (WSIB, Insurance, Licenses) and sets up RLS policies

-- ========================================
-- STEP 1: CREATE STORAGE BUCKET
-- ========================================

-- Create the compliance-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-documents', 'compliance-documents', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- STEP 2: SETUP RLS POLICIES FOR BUCKET
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own compliance documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all compliance documents" ON storage.objects;

-- Policy 1: Users can upload their own documents
CREATE POLICY "Users can upload their own compliance documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Users can view their own documents
CREATE POLICY "Users can view their own compliance documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'compliance-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Users can update their own documents
CREATE POLICY "Users can update their own compliance documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'compliance-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Users can delete their own documents
CREATE POLICY "Users can delete their own compliance documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'compliance-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 5: Admins can view all documents (optional - for admin oversight)
CREATE POLICY "Admins can view all compliance documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'compliance-documents'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ========================================
-- VERIFICATION
-- ========================================

-- Verify the bucket was created
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets
WHERE id = 'compliance-documents';

-- Verify the policies were created
SELECT 
  policyname, 
  cmd, 
  qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%compliance%';

-- ========================================
-- FOLDER STRUCTURE
-- ========================================
-- Documents will be organized as:
-- compliance-documents/
--   ├── {user_id}/
--   │   ├── wsib/
--   │   │   └── {timestamp}_{filename}
--   │   ├── insurance/
--   │   │   └── {timestamp}_{filename}
--   │   └── licenses/
--   │       └── {timestamp}_{filename}

-- ========================================
-- NOTES
-- ========================================
-- 1. The bucket is PUBLIC, meaning URLs are accessible without auth
-- 2. However, RLS policies control who can upload/delete files
-- 3. Users can only access files in their own folder (user_id)
-- 4. Admins can view all documents for compliance oversight
-- 5. Files are organized by document type (wsib, insurance, licenses)
-- 6. Filenames include timestamp to prevent conflicts

-- ========================================
-- CLEANUP (if needed)
-- ========================================
-- To remove the bucket and all its contents (USE WITH CAUTION):
-- DELETE FROM storage.objects WHERE bucket_id = 'compliance-documents';
-- DELETE FROM storage.buckets WHERE id = 'compliance-documents';

