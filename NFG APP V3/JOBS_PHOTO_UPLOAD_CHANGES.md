# 📸 Jobs Page - Photo Upload & Paper Trail Implementation

## Summary of Changes

This document outlines the changes made to implement photo upload functionality, maintain a paper trail for jobs, and enforce photo requirements before task completion.

---

## 🎯 Features Implemented

### 1. Photo Upload Functionality ✅
- **Upload Modal**: Staff can upload photos for tasks that require them
- **File Validation**: 
  - Maximum file size: 10MB
  - Only image files accepted
  - File type and size validation
- **Loading State**: Button shows loading spinner during upload
- **Storage**: Photos are saved to Supabase Storage bucket `job-photos`
- **Organization**: Photos organized by `{user_id}/{job_id}/{task_id}_{timestamp}.{ext}`
- **Auto-complete**: Tasks automatically marked complete when photo is uploaded
- **View Photos**: Staff can click "View" to see uploaded photos in a new tab

### 2. Task Photo Requirements ✅
- **Validation**: Tasks requiring photos cannot be checked off until a photo is uploaded
- **User Feedback**: Clear alert message: "⚠️ Please upload a photo before completing this task"
- **Visual Indicator**: Tasks show "📸 Photo required" badge
- **Status Display**: Green checkmark shown when photo is uploaded

### 3. Paper Trail (Archive System) ✅
- **Changed**: "Delete Job" → "Archive Job"
- **Soft Delete**: Jobs are marked as `archived` instead of being deleted
- **Database**: Jobs keep `status = 'archived'` and `archived_at` timestamp
- **Hidden**: Archived jobs don't appear in active job lists
- **Preserved**: All job data, tasks, photos, and history are kept in the database
- **Filter**: Active jobs query now includes `.neq('status', 'archived')`

### 4. Role-Based Permissions ✅
Staff users CANNOT:
- ❌ Delete/Archive jobs
- ❌ Add tasks to jobs
- ❌ Delete tasks from jobs
- ❌ Assign workers to jobs
- ❌ Create new jobs

Staff users CAN:
- ✅ View assigned jobs
- ✅ View job details
- ✅ Complete tasks
- ✅ Upload photos for tasks
- ✅ Mark tasks as complete (only after photo upload if required)

---

## 📋 Code Changes

### Changed Files
1. **jobs.html**
   - Updated photo upload handler with validation and loading states
   - Changed delete job to archive job functionality
   - Updated `getJobs()` to exclude archived jobs
   - Enhanced console logging for debugging
   - Added file validation (size, type)
   - Added loading spinner during upload

### New Files
1. **SETUP_PHOTO_STORAGE.md**
   - Complete guide for setting up Supabase storage bucket
   - SQL scripts for creating policies
   - Troubleshooting guide
   - Security notes

2. **JOBS_PHOTO_UPLOAD_CHANGES.md** (this file)
   - Summary of all changes
   - Feature documentation

---

## 🗄️ Database Schema Updates Needed

### Jobs Table
The `jobs` table should have these columns:
```sql
-- Add archived_at column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Status can be: 'pending', 'in-progress', 'completed', 'cancelled', 'archived'
```

### Job Tasks Table
The `job_tasks` table should have:
```sql
-- Existing columns used:
- id (uuid primary key)
- job_id (uuid, foreign key to jobs.id)
- title (text)
- description (text)
- photo_required (boolean)
- photo_url (text) -- stores the public URL from Supabase storage
- completed (boolean)
- completed_at (timestamptz)
```

---

## 🪣 Supabase Storage Setup

### Required: Create Storage Bucket

**⚠️ IMPORTANT**: You must create the storage bucket before photo upload will work.

See **SETUP_PHOTO_STORAGE.md** for detailed instructions.

Quick setup:
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `job-photos`
3. Make it **public**
4. Run the SQL policies from the setup guide

---

## 🔄 How It Works

### Upload Flow
1. Staff opens job with task requiring photo
2. Clicks "Upload Photo" button
3. Selects image from device/camera
4. Preview shows selected image
5. Clicks "Upload & Complete Task"
6. File is validated (size, type)
7. Photo uploads to Supabase Storage
8. Task is updated with photo URL and marked complete
9. Success message shown
10. Task list refreshes to show completion

### Archive Flow
1. Admin/Client opens job detail modal
2. Clicks "Archive Job" button
3. Confirms archive action
4. Job status updated to 'archived' with timestamp
5. Job disappears from active lists
6. All data preserved in database

### Photo Requirement Validation
1. Staff tries to check off a task
2. System checks if photo is required
3. If required and not uploaded: Alert shown, checkbox unchecked
4. If uploaded or not required: Task marked complete

---

## 🧪 Testing Checklist

### Photo Upload
- [ ] Upload photo for task requiring photo
- [ ] Verify file size validation (try >10MB)
- [ ] Verify file type validation (try .txt file)
- [ ] Check loading spinner appears
- [ ] Verify task auto-completes after upload
- [ ] Click "View" to see uploaded photo
- [ ] Check photo is accessible via public URL

### Photo Requirements
- [ ] Try to complete task without photo (should fail)
- [ ] Upload photo, then complete task (should succeed)
- [ ] Verify alert message is clear
- [ ] Check checkbox resets if validation fails

### Archive Jobs
- [ ] Archive a job as admin
- [ ] Verify job disappears from list
- [ ] Check database shows status='archived'
- [ ] Verify archived_at timestamp is set
- [ ] Confirm job data is preserved

### Staff Permissions
- [ ] Login as staff
- [ ] Verify "Archive Job" button hidden
- [ ] Verify "Add Task" button hidden
- [ ] Verify delete task icons hidden
- [ ] Verify can still upload photos
- [ ] Verify can still complete tasks

---

## 🐛 Troubleshooting

### "Failed to upload photo"
**Solution**: Storage bucket not created. See SETUP_PHOTO_STORAGE.md

### "Storage bucket not found"
**Solution**: Create the `job-photos` bucket in Supabase Dashboard → Storage

### "Permission denied" on upload
**Solution**: Check storage policies. User must be authenticated and policies must allow insert.

### Photos not loading
**Solution**: Ensure bucket is set to **public** and read policy exists.

### Archive button not working
**Solution**: Check if `archived_at` column exists in jobs table. Add it if missing.

---

## 📊 Benefits

### For Staff
- ✅ Easy photo upload with mobile camera support
- ✅ Clear validation messages
- ✅ Can't accidentally skip required photos
- ✅ See photo status at a glance

### For Admin/Client
- ✅ All jobs preserved in database (paper trail)
- ✅ Can archive completed jobs to clean up lists
- ✅ Photo proof for all tasks requiring it
- ✅ Audit trail with timestamps

### For Business
- ✅ **Paper trail**: All job history preserved
- ✅ **Compliance**: Photo proof for quality assurance
- ✅ **Accountability**: Can't complete tasks without required photos
- ✅ **Audit-ready**: Full history of jobs and completions
- ✅ **Organized**: Photos stored systematically by user/job/task

---

## 🔮 Future Enhancements

Potential improvements:
- [ ] Add "View Archived Jobs" page for admins
- [ ] Bulk archive multiple jobs at once
- [ ] Photo gallery view for all job photos
- [ ] Download all job photos as ZIP
- [ ] Restore archived jobs
- [ ] Archive after X days of completion (auto-archive)
- [ ] Photo compression before upload
- [ ] Multiple photos per task
- [ ] Photo annotations/notes

---

✅ **All features implemented and ready for testing!**

**Next Steps:**
1. Follow SETUP_PHOTO_STORAGE.md to create storage bucket
2. Test photo upload functionality
3. Verify archive system works
4. Test with staff account for permissions

