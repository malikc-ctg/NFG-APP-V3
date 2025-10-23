# 🔄 Recurring Bookings Implementation

This document outlines the complete implementation of recurring bookings and jobs for the NFG App.

## Overview

The recurring system allows both **bookings** and **jobs** to automatically create their next instance when completed. The system intelligently handles:
- **Booking-linked jobs**: When a recurring booking's job is completed, it creates the next booking (which auto-creates its own job)
- **Standalone recurring jobs**: When a recurring job (not linked to a booking) is completed, it creates the next job directly

## 1. Database Schema Changes

### Bookings Table (`ADD_RECURRING_BOOKING_FIELDS.sql`)

Run this SQL script in your Supabase SQL Editor to add recurring functionality to bookings:

```sql
-- Add recurrence_pattern column (weekly, monthly, etc.)
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurrence_pattern TEXT DEFAULT 'weekly'
CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly'));

-- Add recurrence_series_id to link bookings in the same series
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurrence_series_id UUID;

-- Add next_occurrence_date to track when the next booking should be created
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS next_occurrence_date DATE;

-- Add is_recurring_template to mark the original recurring booking
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS is_recurring_template BOOLEAN DEFAULT FALSE;

-- Add frequency column to match jobs
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'single visit'
CHECK (frequency IN ('single visit', 'recurring'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_recurrence_series ON bookings(recurrence_series_id);
CREATE INDEX IF NOT EXISTS idx_bookings_frequency ON bookings(frequency);
CREATE INDEX IF NOT EXISTS idx_bookings_next_occurrence ON bookings(next_occurrence_date);
```

### Jobs Table (`ADD_RECURRING_JOB_FIELDS.sql`)

This script was already created for jobs:

```sql
-- Add recurrence_pattern column to jobs table
ALTER TABLE public.jobs
ADD COLUMN recurrence_pattern TEXT NULL;

-- Add recurrence_series_id column to jobs table
ALTER TABLE public.jobs
ADD COLUMN recurrence_series_id UUID NULL;

-- Add check constraint for recurrence_pattern
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_recurrence_pattern_check
CHECK (recurrence_pattern IN ('weekly', 'biweekly', 'monthly') OR recurrence_pattern IS NULL);
```

## 2. Frontend Implementation

### A. Booking Form Updates (`bookings.html`)

**Added Frequency Selection:**
```html
<!-- Frequency Selection -->
<div>
  <label class="block text-sm font-medium mb-1.5">Frequency *</label>
  <select 
    id="booking-frequency" 
    class="w-full border border-nfgray rounded-xl p-2.5 focus:ring-2 focus:ring-nfgblue outline-none"
    required
  >
    <option value="single visit">Single Visit</option>
    <option value="recurring">Recurring</option>
  </select>
</div>
```

**Added Recurrence Pattern (shown only for recurring):**
```html
<!-- Recurrence Pattern (only shown for recurring bookings) -->
<div id="booking-recurrence-pattern-section" class="hidden">
  <label class="block text-sm font-medium mb-1.5">Recurrence Pattern *</label>
  <select 
    id="booking-recurrence-pattern" 
    class="w-full border border-nfgray rounded-xl p-2.5 focus:ring-2 focus:ring-nfgblue outline-none"
  >
    <option value="weekly" selected>Weekly</option>
    <option value="biweekly">Every 2 Weeks</option>
    <option value="monthly">Monthly</option>
  </select>
  <p class="text-xs text-gray-500 mt-1.5">
    📅 The next booking will automatically be created when the job is completed.
  </p>
</div>
```

**Event Listener for Show/Hide:**
```javascript
document.getElementById('booking-frequency')?.addEventListener('change', (e) => {
  const recurrenceSection = document.getElementById('booking-recurrence-pattern-section');
  if (e.target.value === 'recurring') {
    recurrenceSection?.classList.remove('hidden');
  } else {
    recurrenceSection?.classList.add('hidden');
  }
});
```

**Updated `createBooking` Function:**
```javascript
// Get frequency and recurrence pattern
const frequency = document.getElementById('booking-frequency').value;
const recurrencePattern = document.getElementById('booking-recurrence-pattern').value;

// Generate recurrence series ID if this is a recurring booking
const recurrenceSeriesId = frequency === 'recurring' ? crypto.randomUUID() : null;

// Add to job data
if (frequency === 'recurring') {
  jobData.recurrence_pattern = recurrencePattern;
  jobData.recurrence_series_id = recurrenceSeriesId;
}

// Add to booking data
if (frequency === 'recurring') {
  bookingData.recurrence_pattern = recurrencePattern;
  bookingData.recurrence_series_id = recurrenceSeriesId;
  bookingData.is_recurring_template = true;
}
```

### B. Recurring Logic Module (`js/recurring-jobs.js`)

This module handles BOTH recurring jobs and recurring bookings.

**Key Functions:**

1. **`calculateNextOccurrence(currentDate, pattern)`**
   - Calculates the next scheduled date based on pattern
   - Supports: weekly (+7 days), biweekly (+14 days), monthly (+1 month)

2. **`handleJobCompletion(job)`**
   - Main entry point called when a job is marked 'completed'
   - Checks if the job is linked to a recurring booking
   - If yes: creates next booking instance (which auto-creates its job)
   - If no: creates next job instance directly (for standalone recurring jobs)

3. **`createNextBookingInstance(completedBooking)`**
   - Creates the next booking in the series
   - Creates a new job for that booking
   - Copies all services from the completed booking
   - Creates job tasks from those services
   - Links everything together with `recurrence_series_id`

4. **`createNextRecurringInstance(completedJob)`**
   - Creates the next job in the series (for standalone recurring jobs)
   - Copies all tasks from the completed job
   - Links with `recurrence_series_id`

### C. Integration Points (`jobs.html`)

The `handleJobCompletion` function is called at three points where a job becomes 'completed':

1. **When all tasks are auto-completed** (checked off with photos):
```javascript
const completedJob = { ...job, status: 'completed' };
const recurrenceResult = await handleJobCompletion(completedJob);
alert(`🎉 ${recurrenceResult.message}\nTotal time: ${formatDuration(totalDuration)}`);
```

2. **When staff manually ends work** (all tasks complete):
```javascript
const updatedJob = { ...job, status: 'completed' };
const recurrenceResult = await handleJobCompletion(updatedJob);
alert(recurrenceResult.message + `\nTotal time: ${formatDuration(totalDuration)}`);
```

3. **When admin/client manually sets status to 'completed'**:
```javascript
const completedJob = { ...job, status: 'completed' };
const recurrenceResult = await handleJobCompletion(completedJob);
if (recurrenceResult.nextJob || recurrenceResult.nextBooking) {
  alert(recurrenceResult.message);
}
```

## 3. Data Flow

### Creating a Recurring Booking

1. User fills out "Create New Booking" form
2. Selects "Recurring" for frequency
3. Chooses recurrence pattern (weekly, biweekly, monthly)
4. Submits form
5. System creates:
   - A job with recurring fields
   - A booking with recurring fields
   - Links them with `job_id`
   - Both share the same `recurrence_series_id`
   - Services are linked to booking
   - Tasks are created from services for the job

### When a Recurring Booking's Job is Completed

1. Staff completes all tasks and ends work (or admin marks as complete)
2. `handleJobCompletion()` is called
3. System checks if job is linked to a booking
4. If yes and booking is recurring:
   - Calculates next scheduled date based on pattern
   - Creates new job for that date
   - Creates new booking for that date
   - Links new job to new booking
   - Copies all services to new booking
   - Creates tasks from services for new job
   - Both new records share the same `recurrence_series_id` as the original
5. Shows success message with next scheduled date

### When a Standalone Recurring Job is Completed

1. Job is completed (not linked to a booking, or linked to non-recurring booking)
2. `handleJobCompletion()` is called
3. System checks if job is recurring
4. If yes:
   - Calculates next scheduled date
   - Creates new job for that date
   - Copies all tasks to new job
   - Links with same `recurrence_series_id`
5. Shows success message with next scheduled date

## 4. Testing Steps

### Test 1: Create a Recurring Booking

1. ✅ **Run SQL Scripts**
   - Execute `ADD_RECURRING_BOOKING_FIELDS.sql` in Supabase
   - Execute `ADD_RECURRING_JOB_FIELDS.sql` in Supabase (if not already done)

2. ✅ **Create Recurring Booking**
   - Go to Bookings page
   - Click "New Booking"
   - Fill in title, site, date
   - Select "Recurring" for Frequency
   - Choose "Weekly" for Recurrence Pattern
   - Add some services
   - Create booking

3. ✅ **Verify Initial Creation**
   - Check that both job and booking were created
   - Check that they share the same `recurrence_series_id`
   - Check that services were linked to booking
   - Check that tasks were created from services

4. ✅ **Complete the Job**
   - Go to Jobs page
   - Open the created job
   - Upload photos for all tasks
   - Check off all tasks
   - End work (or manually set to completed)

5. ✅ **Verify Next Instance**
   - Alert should confirm next booking scheduled
   - Check Bookings page for new booking with future date
   - Check Jobs page for corresponding new job
   - Verify both have same `recurrence_series_id`
   - Verify new booking has all services copied
   - Verify new job has all tasks copied (uncompleted)

### Test 2: Create a Standalone Recurring Job

1. ✅ **Create Recurring Job**
   - Go to Jobs page
   - Click "Create New Job"
   - Fill in details
   - Select "Recurring" for Frequency
   - Choose "Biweekly" for Recurrence Pattern
   - Add tasks manually
   - Create job

2. ✅ **Complete the Job**
   - Complete all tasks
   - Set status to completed

3. ✅ **Verify Next Instance**
   - Alert should confirm next job scheduled
   - Check Jobs page for new job (2 weeks later)
   - Verify same `recurrence_series_id`
   - Verify all tasks copied

## 5. Dashboard Integration

The dashboard already displays recurring jobs in the "Recurring Jobs" section using `fetchRecurringJobs()` from `js/dashboard.js`. This will automatically show all recurring jobs (both from bookings and standalone).

## 6. Key Benefits

✅ **Automatic Creation**: Next instances are created automatically when jobs complete
✅ **Data Integrity**: All data (services, tasks, assignments) is copied to new instances
✅ **Flexibility**: Supports both booking-linked and standalone recurring jobs
✅ **Tracking**: `recurrence_series_id` links all instances in a series
✅ **User-Friendly**: Clear feedback with scheduled dates in alerts
✅ **Scalable**: Works for weekly, biweekly, and monthly patterns

## 7. Future Enhancements (Optional)

- Add ability to view all instances in a series
- Add ability to cancel/modify future instances
- Add quarterly and yearly recurrence patterns
- Add ability to end a recurring series
- Add a "Skip Next Instance" feature
- Add custom recurrence (e.g., every 3 weeks)
- Email notifications for upcoming recurring bookings/jobs

## 8. Troubleshooting

**Problem**: Next instance not created after job completion
- Check console logs for errors
- Verify `frequency === 'recurring'` on the completed job
- Verify `recurrence_pattern` is set
- Check RLS policies on bookings and jobs tables

**Problem**: Services not copied to new booking
- Verify `booking_services` table has records
- Check RLS policies on `booking_services` table
- Verify service IDs are valid

**Problem**: Tasks not copied to new job
- Verify `job_tasks` table has records
- Check RLS policies on `job_tasks` table
- Verify task data structure matches table schema

---

**Implementation Complete! 🎉**

Your NFG App now fully supports recurring bookings and jobs with automatic instance creation.

