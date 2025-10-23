# 🔄 Recurring Jobs Implementation Guide

## Overview
This document explains the recurring jobs feature that automatically creates new job instances when a recurring job is completed.

## Database Schema Changes

### New Columns Added to `jobs` Table:
- `recurrence_pattern` - TEXT ('weekly', 'biweekly', 'monthly')
- `recurrence_series_id` - UUID (links jobs in the same series)
- `next_occurrence_date` - DATE (when the next job should be created)
- `is_recurring_template` - BOOLEAN (marks the original recurring job)

### SQL Migration:
Run `ADD_RECURRING_JOB_FIELDS.sql` in your Supabase SQL Editor.

## How It Works

### 1. Creating a Recurring Job
When creating a new job:
- Set `frequency` to "recurring"
- Choose a `recurrence_pattern` (weekly, biweekly, monthly)
- The system generates a `recurrence_series_id` to link all instances

### 2. Automatic Job Creation
When a recurring job is completed:
1. System detects `frequency === 'recurring'`
2. Calculates next occurrence date based on `recurrence_pattern`:
   - Weekly: +7 days
   - Biweekly: +14 days
   - Monthly: +1 month
3. Creates a new job instance with:
   - Same title, site, worker, type
   - New scheduled date
   - Status: 'pending'
   - Linked via `recurrence_series_id`
4. Copies all tasks from the completed job to the new job
5. Shows confirmation message to user

### 3. Integration Points

#### jobs.html:
- Import `recurring-jobs.js` module
- Call `handleJobCompletion()` when:
  - End Work button is clicked (staff)
  - All tasks are checked off (staff)
  - Status manually updated to 'completed' (admin/client)
- Show/hide recurrence pattern dropdown based on frequency selection
- Include recurrence_pattern in job creation form

#### bookings.html:
- When creating a booking with auto-job-creation
- Set recurrence pattern based on user selection
- Initialize recurring series

## User Experience

### For Staff:
When completing a recurring job:
```
✅ Job completed! Next occurrence scheduled for Jan 20, 2025
Total time: 2h 30m
```

### For Admin/Client:
- See all jobs in the series linked by `recurrence_series_id`
- Manage recurring patterns
- Cancel recurring series if needed

## Key Features

✅ Automatic next instance creation  
✅ Task copying to new instances  
✅ Flexible recurrence patterns  
✅ Series linking for tracking  
✅ No manual intervention needed  
✅ Works with existing timer and task system  

## Testing

1. Create a recurring job (weekly pattern)
2. Add tasks to it
3. Complete the job
4. Verify:
   - New job created with next week's date
   - Tasks copied to new job
   - Both jobs linked via recurrence_series_id
   - User sees confirmation message

## Future Enhancements

- [ ] End date for recurring series
- [ ] Skip/reschedule specific instances
- [ ] View all jobs in a series
- [ ] Bulk edit recurring series
- [ ] Recurring exceptions (holidays, etc.)
- [ ] Custom recurrence patterns (every X days)

## Files Modified

1. `ADD_RECURRING_JOB_FIELDS.sql` - Database migration
2. `js/recurring-jobs.js` - Core recurring logic
3. `jobs.html` - UI and integration
4. `js/dashboard.js` - Display recurring jobs
5. `dashboard.html` - Recurring jobs section

## API Reference

### `handleJobCompletion(job)`
Checks if job is recurring and creates next instance if needed.

**Parameters:**
- `job` (object) - The completed job object

**Returns:**
- `{ success: boolean, message: string, nextJob?: object }`

### `createNextRecurringInstance(completedJob)`
Creates the next instance of a recurring job.

**Parameters:**
- `completedJob` (object) - The job that was just completed

**Returns:**
- New job object or null if error

### `initializeRecurringSeries(jobData)`
Initializes a new recurring job series.

**Parameters:**
- `jobData` (object) - The job data being created

**Returns:**
- Updated job data with recurrence fields

## Support

If you encounter issues:
1. Check console logs for "🔄" recurring job messages
2. Verify database schema has new columns
3. Ensure RLS policies allow job creation
4. Check that tasks table allows copying

---

**Status:** ✅ Implemented and Ready for Testing  
**Last Updated:** {{date}}

