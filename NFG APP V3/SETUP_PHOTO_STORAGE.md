# 📸 Setup Photo Storage in Supabase

## Overview
This guide will help you create a storage bucket in Supabase for storing job task photos.

## Steps

### 1. Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project

### 2. Create Storage Bucket
1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Configure the bucket:
   - **Name**: `job-photos`
   - **Public bucket**: ✅ **Check this** (so photos can be viewed)
   - **File size limit**: 50 MB (optional)
   - **Allowed MIME types**: `image/*` (optional)
4. Click **Create bucket**

### 3. Set Storage Policies
After creating the bucket, set up access policies:

#### Policy 1: Allow authenticated users to upload photos
```sql
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');
```

#### Policy 2: Allow anyone to view photos (public bucket)
```sql
-- Allow public read access
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-photos');
```

#### Policy 3: Allow users to delete their own photos
```sql
-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 4. Alternative: Quick Setup via SQL
Run this SQL in the Supabase SQL Editor:

```sql
-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'job-photos');

CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'job-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Verification

### Test the Setup
1. Log into your app as a staff member
2. Open a job with a task that requires a photo
3. Click **Upload Photo**
4. Select an image and click **Upload & Complete Task**
5. The photo should upload successfully and the task should be marked complete

### Troubleshooting

**Error: "Failed to upload photo"**
- Check that the bucket name is exactly `job-photos`
- Verify the bucket is set to **public**
- Ensure the upload policies are created

**Error: "Failed to save photo"**
- Check that the `job_tasks` table has a `photo_url` column
- Verify your user is authenticated

## File Structure
Photos are organized by user ID and job ID:
```
job-photos/
  ├── {user_id}/
  │   ├── {job_id}/
  │   │   ├── {task_id}_{timestamp}.jpg
  │   │   ├── {task_id}_{timestamp}.png
  │   │   └── ...
```

## Security Notes
- Photos are publicly viewable once uploaded (needed for staff to view)
- Photos are organized by user/job for easy management
- Users can only delete photos they uploaded
- Consider adding file size limits in production

---

✅ **Once complete, staff can upload photos and complete tasks!**

