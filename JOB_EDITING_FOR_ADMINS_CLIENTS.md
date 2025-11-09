# Job Editing for Admins and Clients

## Overview
This implementation allows admins and clients to edit any job in the system, not just jobs they created.

## Changes Made

### 1. Database (RLS Policies)
**File:** `ENABLE_JOB_EDITING_FOR_ADMINS_CLIENTS.sql`

- Created `is_admin_or_client()` helper function to check if current user has admin or client role
- Updated `jobs` table UPDATE policy to allow admins and clients to edit any job
- Updated `jobs` table SELECT policy to allow admins and clients to view all jobs
- Maintains existing permissions for:
  - Super admins (via `is_super_admin()`)
  - Job creators (`created_by = auth.uid()`)
  - Assigned workers (`assigned_worker_id = auth.uid()`)

**To apply:** Run the SQL file in your Supabase SQL Editor.

### 2. UI Changes
**File:** `jobs.html`

#### Edit Job Button
- Added "Edit Job" button to the job details modal
- Button is only visible to admins and clients (hidden for staff)
- Located next to "Update Status" button

#### Edit Job Modal
- Created new `editJobModal` with form fields matching the create job form
- Fields include:
  - Job Title
  - Site
  - Job Type
  - Frequency (Single Visit / Recurring)
  - Recurrence Pattern (shown only for recurring jobs)
  - Scheduled Date
  - Estimated Hours
  - Description

#### JavaScript Functionality
- **Edit Button Handler:** Opens edit modal and populates form with current job data
- **Edit Form Submission:** Updates job in database and refreshes the view
- **Role-based Visibility:** Edit button only shown to admins/clients
- **getJobs() Update:** Admins and clients now see all jobs (RLS handles filtering)

## User Experience

### For Admins and Clients:
1. Open any job's details by clicking "View Details"
2. Click "Edit Job" button (visible only to admins/clients)
3. Edit job information in the modal
4. Click "Save Changes" to update
5. Job details refresh automatically

### For Staff:
- Edit button is hidden
- Staff can still update task status and upload photos
- Staff can begin/end work on assigned jobs

## Testing

1. **As Admin/Client:**
   - Log in as admin or client
   - View any job
   - Verify "Edit Job" button is visible
   - Click "Edit Job" and verify form is populated
   - Make changes and save
   - Verify changes are reflected in job details

2. **As Staff:**
   - Log in as staff
   - View assigned job
   - Verify "Edit Job" button is NOT visible
   - Verify other functionality still works

## Database Schema Requirements

The jobs table should have these columns:
- `id` (primary key)
- `title`
- `site_id`
- `job_type`
- `frequency`
- `recurrence_pattern` (for recurring jobs)
- `scheduled_date`
- `estimated_hours`
- `description`
- `created_by`
- `assigned_worker_id`
- `status`
- `updated_at`

## Security

- RLS policies ensure only authorized users can edit jobs
- Admins and clients can edit any job (per business requirement)
- Staff cannot edit job details (only update tasks)
- All updates are logged via `updated_at` timestamp

## Notes

- The edit functionality preserves all existing job relationships (tasks, employees, assigned worker)
- Recurring job patterns can be edited
- Job status can still be updated via the "Update Status" button
- Edit modal uses the same validation as create job form

