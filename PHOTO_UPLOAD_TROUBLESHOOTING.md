# 📸 Photo Upload Troubleshooting Guide

## Quick Diagnosis

### Step 1: Check Console for Errors
1. Open your app in browser
2. Press **F12** (or Cmd+Option+I on Mac) to open console
3. Go to the jobs page
4. Open a job with tasks
5. Try to upload a photo
6. **Look for red error messages in console**

### Common Errors & Solutions

#### Error: "Bucket not found" or "Storage bucket not set up"
**Cause**: The `job-photos` storage bucket doesn't exist yet.

**Solution**: Run `SETUP_STORAGE_BUCKET.sql` in Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Paste contents of `SETUP_STORAGE_BUCKET.sql`
3. Click **Run**
4. Should see: "✅ Storage bucket 'job-photos' is now ready!"

---

#### Error: "new row violates row-level security policy" or "permission denied"
**Cause**: Storage policies aren't set up correctly.

**Solution**: The `SETUP_STORAGE_BUCKET.sql` script includes policies. Re-run it.

---

#### Error: "Please select a photo first"
**Cause**: You clicked upload without selecting a file.

**Solution**: Click the file input and choose an image first, then click upload.

---

#### Error: "File is too large"
**Cause**: Image is over 10MB.

**Solution**: Choose a smaller image or take a new photo.

---

#### Error: "Please select a valid image file"
**Cause**: You selected a non-image file (PDF, doc, etc).

**Solution**: Only .jpg, .png, .gif, .webp images are allowed.

---

## Detailed Debugging Steps

### 1. Verify Storage Bucket Exists
Run this query in Supabase SQL Editor:
```sql
SELECT * FROM storage.buckets WHERE id = 'job-photos';
```

**Expected Result**: Should return 1 row with:
- `id`: job-photos
- `name`: job-photos
- `public`: true

**If empty**: Bucket doesn't exist. Run `SETUP_STORAGE_BUCKET.sql`

---

### 2. Verify Storage Policies Exist
Run this query:
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%photo%';
```

**Expected Result**: Should show 4 policies:
- Authenticated users can upload photos
- Public can view photos
- Users can update own photos
- Users can delete own photos

**If missing**: Run `SETUP_STORAGE_BUCKET.sql` to create policies

---

### 3. Test Upload in Console
Open browser console and run:
```javascript
// Test if you can access storage
const { data: buckets, error } = await supabase.storage.listBuckets();
console.log('Buckets:', buckets);
console.log('Error:', error);
```

**Expected**: Should list `job-photos` in the buckets array.

---

### 4. Check if Modal Opens
1. Go to jobs page
2. Open a job
3. Click "Upload Photo" button
4. **Does the modal appear?**
   - ✅ **Yes**: Modal works, issue is with upload itself
   - ❌ **No**: Check console for JavaScript errors

---

### 5. Check Network Tab
1. Open DevTools → **Network** tab
2. Try to upload a photo
3. Look for a request to `/storage/v1/object/job-photos/...`
4. Click on the request to see the response

**Red/failed request**: 
- Status 404: Bucket doesn't exist
- Status 403: Permission denied (policy issue)
- Status 413: File too large

---

## Manual Storage Bucket Creation (Alternative)

If SQL doesn't work, create it manually in the UI:

### Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in left sidebar
4. Click **New bucket** button
5. Enter details:
   - **Name**: `job-photos`
   - **Public bucket**: ✅ **CHECK THIS BOX**
   - **File size limit**: 50 MB
   - **Allowed MIME types**: `image/*`
6. Click **Create bucket**
7. Then run the policies part from `SETUP_STORAGE_BUCKET.sql`

---

## Test Checklist

After setup, verify:
- [ ] Bucket `job-photos` exists in Supabase Storage
- [ ] Bucket is set to **public**
- [ ] 4 storage policies are created
- [ ] Upload modal opens when clicking "Upload Photo"
- [ ] File input allows selecting images
- [ ] Preview shows selected image
- [ ] Upload button works without errors
- [ ] Task completes after upload
- [ ] "View" button shows the uploaded photo

---

## What to Share if Still Not Working

If it's still not working, share these details:

1. **Console errors** (screenshot or copy/paste)
2. **Network tab errors** (screenshot of failed request)
3. **Result of this query**:
   ```sql
   SELECT id, name, public FROM storage.buckets WHERE id = 'job-photos';
   ```
4. **Browser you're using** (Chrome, Safari, Firefox, etc.)
5. **What happens when you click "Upload Photo"**:
   - Nothing?
   - Modal opens but upload fails?
   - Gets stuck on loading?
   - Shows error message?

---

## Quick Test Script

Run this in browser console after opening the app:
```javascript
console.log('=== PHOTO UPLOAD DEBUG ===');

// Check if we're logged in
const { data: { user } } = await supabase.auth.getUser();
console.log('✅ User logged in:', user?.email);

// Check if bucket exists
const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
console.log('📦 Buckets:', buckets?.map(b => b.name));
console.log('❌ Bucket error:', bucketError);

// Check if job-photos bucket exists
const hasJobPhotos = buckets?.some(b => b.id === 'job-photos');
if (hasJobPhotos) {
  console.log('✅ job-photos bucket EXISTS');
} else {
  console.log('❌ job-photos bucket MISSING - Run SETUP_STORAGE_BUCKET.sql');
}

// Try to list files in bucket (will fail if bucket doesn't exist)
const { data: files, error: listError } = await supabase.storage
  .from('job-photos')
  .list();
  
if (listError) {
  console.log('❌ Cannot access bucket:', listError.message);
  console.log('   → Run SETUP_STORAGE_BUCKET.sql to fix');
} else {
  console.log('✅ Can access bucket, contains', files?.length, 'files');
}

console.log('=== END DEBUG ===');
```

Copy the output and share it if you need more help!

