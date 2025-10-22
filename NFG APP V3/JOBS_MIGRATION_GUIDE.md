# Jobs System - Supabase Migration Guide

## ✅ Migration Complete!

The jobs system has been successfully migrated from localStorage to Supabase. All data is now stored in your Supabase database with proper authentication and row-level security.

---

## 🚀 Setup Instructions

### Step 1: Create Database Tables

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **zqcbldgheimqrnqmbbed**
3. Navigate to **SQL Editor** in the left sidebar
4. Open the file `supabase_jobs_schema.sql` from your project folder
5. Copy the entire SQL content
6. Paste it into the SQL Editor
7. Click **Run** to execute the schema

This will create:
- ✅ `jobs` table - stores all job information
- ✅ `job_tasks` table - stores task checklists for each job
- ✅ `job_employees` table - stores employee assignments
- ✅ `job-photos` storage bucket - stores task verification photos
- ✅ Row Level Security (RLS) policies - ensures users can only see their own data
- ✅ Indexes for optimal performance

### Step 2: Verify Tables Created

1. Go to **Table Editor** in your Supabase dashboard
2. You should see three new tables:
   - `jobs`
   - `job_tasks`
   - `job_employees`
3. Go to **Storage** and verify the `job-photos` bucket exists

### Step 3: Test the Application

1. Open `jobs.html` in your browser
2. Try creating a new job
3. Add tasks to the job
4. Assign employees
5. Upload a photo for a task
6. Everything should work seamlessly!

---

## 📊 What Changed?

### Before (localStorage)
- ❌ Data stored only in browser
- ❌ Lost when clearing browser data
- ❌ Not accessible from other devices
- ❌ No backup or recovery
- ❌ Photos stored as base64 strings (inefficient)

### After (Supabase)
- ✅ Data stored in cloud database
- ✅ Persistent and reliable
- ✅ Accessible from any device
- ✅ Automatic backups
- ✅ Photos stored in Supabase Storage (efficient)
- ✅ Row-level security (your data is private)
- ✅ Real-time capabilities (future enhancement)

---

## 🔒 Security Features

### Row Level Security (RLS)
Each user can only:
- View their own jobs, tasks, and employees
- Create new jobs under their account
- Update and delete only their own data
- Upload photos to their own jobs

### Authentication
- User ID (`user_id`) is automatically attached to all jobs
- Users must be authenticated to access any data
- Automatic redirect to login if not authenticated

---

## 📸 Photo Storage

Photos are now stored in **Supabase Storage** with the following structure:

```
job-photos/
  └── {user_id}/
      └── {job_id}/
          └── {task_id}_{timestamp}.{ext}
```

Benefits:
- Efficient storage (no base64 bloat)
- Fast loading with CDN
- Automatic optimization
- Secure access control

---

## 🗃️ Database Schema

### `jobs` Table
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key (auto-generated) |
| title | TEXT | Job title |
| site_id | BIGINT | Reference to sites table |
| job_type | TEXT | Type: cleaning, maintenance, repair, inspection, emergency |
| priority | TEXT | Priority: low, medium, high, urgent |
| status | TEXT | Status: pending, in-progress, completed, cancelled |
| scheduled_date | DATE | When job is scheduled |
| estimated_hours | NUMERIC | Estimated time to complete |
| description | TEXT | Job description |
| user_id | UUID | Owner of the job (for RLS) |
| created_at | TIMESTAMPTZ | When job was created |
| updated_at | TIMESTAMPTZ | Last update time |

### `job_tasks` Table
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| job_id | BIGINT | Reference to jobs.id |
| title | TEXT | Task title |
| description | TEXT | Task description |
| photo_required | BOOLEAN | Whether photo is required |
| completed | BOOLEAN | Task completion status |
| photo_url | TEXT | URL to uploaded photo |
| completed_at | TIMESTAMPTZ | When task was completed |
| created_at | TIMESTAMPTZ | When task was created |

### `job_employees` Table
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| job_id | BIGINT | Reference to jobs.id |
| name | TEXT | Employee name |
| role | TEXT | Employee role |
| assigned_at | TIMESTAMPTZ | When assigned to job |

---

## 🔄 Migration from Old Data

If you have existing jobs in localStorage that you want to keep:

### Option 1: Manual Re-entry (Recommended for small datasets)
Simply recreate your jobs in the new system. The old data will remain in localStorage but won't be used.

### Option 2: Create Migration Script (For large datasets)
Let me know if you have a lot of existing data and need a migration script to transfer it from localStorage to Supabase.

---

## 🎯 New Features Available

With Supabase backend, you now have access to:

1. **Multi-device sync** - Access your jobs from any device
2. **Team collaboration** - Share jobs with team members (future feature)
3. **Real-time updates** - See changes instantly (future feature)
4. **Advanced reporting** - Query your data for insights (future feature)
5. **Backup & restore** - Your data is automatically backed up
6. **API access** - Build mobile apps or integrations (future feature)

---

## 🐛 Troubleshooting

### Jobs not showing up?
- Check the browser console for errors
- Verify you're logged in
- Ensure the database tables were created successfully

### Can't upload photos?
- Verify the `job-photos` storage bucket exists
- Check storage policies were created
- Ensure you have sufficient storage space

### "Failed to create job" error?
- Check that the `jobs` table exists
- Verify RLS policies are enabled
- Check that `user_id` is being set correctly

### Database connection errors?
- Verify your Supabase URL and anon key in `js/supabase.js`
- Check your internet connection
- Ensure your Supabase project is active

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console for error messages
2. Verify all tables and policies were created
3. Test with a fresh browser session
4. Clear browser cache if needed

---

## 🎉 You're All Set!

Your jobs system is now powered by Supabase with:
- ✅ Cloud database storage
- ✅ Photo upload and verification
- ✅ Employee assignment tracking
- ✅ Task checklist management
- ✅ Secure authentication
- ✅ Data persistence

Enjoy your upgraded NFG Jobs System! 🚀


