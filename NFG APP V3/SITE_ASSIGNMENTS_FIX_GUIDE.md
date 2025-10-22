# Site Assignments Fix Guide

## Problem
When you assign a site to a staff member, the assignment is saved to the database, but when you view the user details in Settings, it shows "No sites assigned yet."

## Root Cause
The RLS (Row Level Security) policies in Supabase were configured to allow access for users with the `'manager'` role, but your app uses the `'client'` role instead. This mismatch causes permission errors when trying to read site assignments.

## Solution

### Option 1: Fix RLS Policies (Recommended)
Run the SQL script to update the policies to work with the correct role names.

**Steps:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open the file `FIX_SITE_ASSIGNMENTS_RLS.sql` from your project
4. Copy all the SQL code
5. Paste it into the Supabase SQL Editor
6. Click "Run"
7. Refresh your app

This will update the RLS policies to:
- Allow **admins** and **clients** (not managers) to view, create, update, and delete site assignments
- Allow **staff** to view their own assignments

### Option 2: Disable RLS (Quick Fix, Less Secure)
If you're in development mode and want a quick fix, you can disable RLS entirely.

**Steps:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run this command:
```sql
ALTER TABLE worker_site_assignments DISABLE ROW LEVEL SECURITY;
```

⚠️ **Warning:** This makes the table accessible to all authenticated users. Only use this in development.

## How to Test

After running the fix:

1. Go to **Settings** page
2. Click **View** on any user
3. The **Site Assignments** section should be visible for admins/clients
4. Click **Assign Site** to add a site
5. The assigned site should appear in the list
6. You should be able to remove the assignment by clicking the X button

## Code Improvements Made

I've updated the following files to improve site assignment functionality:

### 1. `js/user-management.js`
- Removed the "View" button for staff users (they shouldn't manage other users)

### 2. `settings.html`
- Improved the `loadUserSites()` function with:
  - Better error handling
  - Loading states
  - Detailed error messages
  - Separate queries for assignments and sites (more reliable)
- Enhanced the `removeAssignment()` function with proper error handling
- Added helpful error messages that detect permission issues

### 3. Created `FIX_SITE_ASSIGNMENTS_RLS.sql`
- SQL script to fix RLS policies
- Updates all policies to use 'client' instead of 'manager'
- Maintains security while allowing proper access

## Features Now Working

✅ **View Site Assignments**
- Admins and clients can view all site assignments for any user
- Staff can view their own assignments

✅ **Assign Sites**
- Admins and clients can assign sites to staff members
- Assignments are immediately visible in the user details modal

✅ **Remove Assignments**
- Click the X button to remove a site assignment
- Confirmation dialog prevents accidental deletions

✅ **Error Handling**
- Clear error messages if something goes wrong
- Helpful guidance if RLS permissions are the issue
- Console logs for debugging

## Troubleshooting

### Still seeing "No sites assigned yet"?
1. Open browser console (F12)
2. Look for error messages
3. If you see permission errors, run `FIX_SITE_ASSIGNMENTS_RLS.sql`
4. Make sure you're logged in as an admin or client

### Assignments not saving?
1. Check console for errors
2. Verify the `worker_site_assignments` table exists in Supabase
3. Run `FIX_SITE_ASSIGNMENTS_RLS.sql` to fix permissions

### Can't see the Site Assignments section?
This section is only visible to **admins** and **clients**. Staff users cannot manage other users.

## Need More Help?

If you're still having issues:

1. Check the browser console for detailed error messages
2. Check the Supabase logs in your dashboard
3. Verify your user role in the `user_profiles` table
4. Make sure you've run the user management schema SQL

---

**Summary:** Run `FIX_SITE_ASSIGNMENTS_RLS.sql` in Supabase to fix the permission issues and make site assignments fully functional! 🎉

