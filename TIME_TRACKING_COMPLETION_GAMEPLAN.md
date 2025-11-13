# ⏱️ Time Tracking Completion - Game Plan

## 📊 Current Status

### ✅ Already Implemented
1. **Job Timer System**
   - Begin/End Work buttons for staff
   - Timer display in job modal
   - Work timestamps (`work_started_at`, `work_ended_at`, `total_duration`)
   - Auto-complete when all tasks done
   - Timer persistence across page refreshes

2. **Database Structure**
   - `jobs` table has timer columns
   - `time_entries` table exists (for clock in/out) but no UI

### ❌ Missing Features
1. **Time Sheets View** - Staff view their weekly/monthly time
2. **Time Approval Workflow** - Admin approves/rejects time entries
3. **Time Reports** - Analytics on time spent (by staff, job, site)
4. **Overtime Tracking** - Flag and track overtime hours
5. **Individual Staff Time Logs** - Track time per staff member (not just job time)
6. **Clock In/Out System** - Daily shift tracking with UI

---

## 🎯 Phase 1: Individual Staff Time Logs (Foundation)

### Goal
Track time per staff member, not just per job. This enables all other features.

### Implementation Steps

#### 1.1 Database Schema
**File:** `ADD_STAFF_TIME_LOGS.sql`

```sql
-- Create staff_time_logs table for individual time tracking
CREATE TABLE IF NOT EXISTS staff_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_duration INTEGER, -- seconds
  is_overtime BOOLEAN DEFAULT FALSE,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_staff_time_logs_user_id ON staff_time_logs(user_id);
CREATE INDEX idx_staff_time_logs_job_id ON staff_time_logs(job_id);
CREATE INDEX idx_staff_time_logs_clock_in ON staff_time_logs(clock_in);
CREATE INDEX idx_staff_time_logs_status ON staff_time_logs(status);
```

**What it does:**
- Tracks individual staff time entries
- Links to jobs (optional - can be general time tracking)
- Supports approval workflow
- Tracks overtime flag

#### 1.2 Modify Job Timer to Create Time Logs
**File:** `jobs.html`

**When "Begin Work" clicked:**
- Create `staff_time_logs` entry with `clock_in = NOW()`
- Link to job via `job_id`
- Set `status = 'pending'`

**When "End Work" clicked:**
- Update `staff_time_logs` entry with `clock_out = NOW()`
- Calculate `total_duration` (seconds)
- Check for overtime (if > 8 hours or configurable threshold)
- Set `is_overtime = true` if applicable

**Changes needed:**
- Modify `begin-work-btn` handler to insert into `staff_time_logs`
- Modify `end-work-btn` handler to update `staff_time_logs`
- Keep existing `jobs` table updates for backward compatibility

---

## 🎯 Phase 2: Time Sheets View

### Goal
Staff can view their weekly/monthly time entries in a table format.

### Implementation Steps

#### 2.1 Create Time Sheets Page
**File:** `timesheets.html` (new file)

**Features:**
- Date range filter (week/month/custom)
- Table showing:
  - Date
  - Job (if linked)
  - Clock In Time
  - Clock Out Time
  - Duration (HH:MM)
  - Overtime indicator
  - Status (Pending/Approved/Rejected)
  - Notes
- Summary cards:
  - Total hours this period
  - Overtime hours
  - Pending approval count
  - Average hours per day

**Data Loading:**
```javascript
async function loadTimeSheets(startDate, endDate) {
  const { data, error } = await supabase
    .from('staff_time_logs')
    .select('*, jobs(title, sites(name))')
    .eq('user_id', currentUser.id)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate)
    .order('clock_in', { ascending: false });
  
  return data;
}
```

#### 2.2 Add Navigation Link
- Add "Time Sheets" link to sidebar (for staff only)
- Or add tab in Settings page
- Or add section in Dashboard

---

## 🎯 Phase 3: Overtime Tracking

### Goal
Automatically detect and flag overtime hours.

### Implementation Steps

#### 3.1 Overtime Calculation Logic
**File:** `jobs.html` or `js/time-tracking.js` (new file)

**Rules:**
- Overtime threshold: 8 hours per day (configurable)
- Calculate total hours worked in a day
- If > threshold, mark as overtime
- Calculate regular hours vs overtime hours

**Implementation:**
```javascript
async function checkForOvertime(userId, clockIn, clockOut) {
  // Get all time logs for the same day
  const dayStart = new Date(clockIn);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(clockIn);
  dayEnd.setHours(23, 59, 59, 999);
  
  const { data: dayLogs } = await supabase
    .from('staff_time_logs')
    .select('total_duration')
    .eq('user_id', userId)
    .gte('clock_in', dayStart.toISOString())
    .lte('clock_in', dayEnd.toISOString());
  
  const totalSeconds = dayLogs.reduce((sum, log) => sum + (log.total_duration || 0), 0);
  const totalHours = totalSeconds / 3600;
  
  const OVERTIME_THRESHOLD = 8; // hours
  const isOvertime = totalHours > OVERTIME_THRESHOLD;
  
  if (isOvertime) {
    const regularHours = OVERTIME_THRESHOLD * 3600; // seconds
    const overtimeSeconds = totalSeconds - regularHours;
    return {
      isOvertime: true,
      regularHours: regularHours,
      overtimeHours: overtimeSeconds
    };
  }
  
  return { isOvertime: false };
}
```

#### 3.2 Display Overtime in UI
- Add overtime indicator (badge/icon) in time sheets
- Highlight overtime hours in different color
- Show overtime summary in reports

---

## 🎯 Phase 4: Time Approval Workflow

### Goal
Admins can review and approve/reject time entries.

### Implementation Steps

#### 4.1 Admin Time Approval Page
**File:** `time-approval.html` (new file) or section in `reports.html`

**Features:**
- Filter by:
  - Staff member
  - Date range
  - Status (Pending/Approved/Rejected)
- Table showing:
  - Staff name
  - Date
  - Job (if linked)
  - Clock In/Out times
  - Duration
  - Overtime flag
  - Status badge
  - Actions (Approve/Reject buttons)
- Bulk actions:
  - Approve all pending
  - Reject selected
  - Export for payroll

**Data Loading:**
```javascript
async function loadPendingTimeEntries(filters = {}) {
  let query = supabase
    .from('staff_time_logs')
    .select('*, user_profiles(full_name, email), jobs(title, sites(name))')
    .eq('status', 'pending');
  
  if (filters.staffId) {
    query = query.eq('user_id', filters.staffId);
  }
  
  if (filters.startDate) {
    query = query.gte('clock_in', filters.startDate);
  }
  
  if (filters.endDate) {
    query = query.lte('clock_in', filters.endDate);
  }
  
  const { data, error } = await query.order('clock_in', { ascending: false });
  return data;
}
```

#### 4.2 Approval Actions
**File:** `time-approval.html`

**Approve:**
```javascript
async function approveTimeEntry(entryId) {
  const { error } = await supabase
    .from('staff_time_logs')
    .update({
      status: 'approved',
      approved_by: currentUser.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', entryId);
}
```

**Reject:**
```javascript
async function rejectTimeEntry(entryId, reason) {
  const { error } = await supabase
    .from('staff_time_logs')
    .update({
      status: 'rejected',
      approved_by: currentUser.id,
      approved_at: new Date().toISOString(),
      notes: reason || 'Rejected by admin'
    })
    .eq('id', entryId);
}
```

#### 4.3 Notifications
- Notify staff when time is approved/rejected
- Notify admin when new time entries are pending (daily summary)

---

## 🎯 Phase 5: Time Reports & Analytics

### Goal
Comprehensive reports on time spent across jobs, staff, and sites.

### Implementation Steps

#### 5.1 Enhanced Reports Page
**File:** `reports.html` (add new section)

**New Report Sections:**

**A. Staff Time Summary**
- Total hours per staff member
- Average hours per day
- Overtime hours
- Jobs completed
- Productivity metrics

**B. Job Time Analysis**
- Estimated vs actual time
- Time per job type
- Time per site
- Efficiency metrics

**C. Weekly/Monthly Reports**
- Time distribution by day
- Peak work hours
- Overtime trends
- Attendance patterns

#### 5.2 Charts & Visualizations
- Bar chart: Hours per staff member
- Line chart: Daily hours trend
- Pie chart: Time distribution by job type
- Calendar heatmap: Work activity by date

#### 5.3 Export Functionality
- Export time sheets to CSV/PDF
- Export for payroll systems
- Custom date ranges

---

## 🎯 Phase 6: Clock In/Out System (Optional Enhancement)

### Goal
Daily shift tracking (separate from job timers).

### Implementation Steps

#### 6.1 Clock In/Out UI
**File:** `dashboard.html` or `timesheets.html`

**Features:**
- Large "Clock In" / "Clock Out" button on dashboard
- Current status indicator (Clocked In/Out)
- Today's hours display
- Quick access to time sheet

**Implementation:**
- Use existing `time_entries` table
- Create entry when clock in
- Update entry when clock out
- Display status in header/navbar

---

## 📋 Implementation Order (Recommended)

### Week 1: Foundation
1. ✅ Create `staff_time_logs` table
2. ✅ Modify job timer to create time logs
3. ✅ Test individual time tracking

### Week 2: Time Sheets
4. ✅ Create time sheets page
5. ✅ Add date range filtering
6. ✅ Display time entries table
7. ✅ Add summary cards

### Week 3: Overtime & Approval
8. ✅ Implement overtime detection
9. ✅ Create approval workflow UI
10. ✅ Add approve/reject actions
11. ✅ Add notifications

### Week 4: Reports & Polish
12. ✅ Add time reports section
13. ✅ Create charts/visualizations
14. ✅ Add export functionality
15. ✅ Testing & bug fixes

---

## 🗂️ Files to Create/Modify

### New Files
1. `ADD_STAFF_TIME_LOGS.sql` - Database migration
2. `timesheets.html` - Time sheets page
3. `time-approval.html` - Admin approval page (optional, can be section in reports)
4. `js/time-tracking.js` - Time tracking utilities (optional)

### Files to Modify
1. `jobs.html` - Update Begin/End Work handlers
2. `reports.html` - Add time reports section
3. `dashboard.html` - Add time sheets link, clock in/out (optional)
4. `js/notification-triggers.js` - Add time approval notifications

---

## 📊 Database Schema Summary

### `staff_time_logs` Table
```sql
- id (UUID, primary key)
- user_id (UUID, FK to auth.users)
- job_id (UUID, FK to jobs, nullable)
- clock_in (TIMESTAMPTZ)
- clock_out (TIMESTAMPTZ, nullable)
- total_duration (INTEGER, seconds)
- is_overtime (BOOLEAN)
- notes (TEXT, nullable)
- approved_by (UUID, FK to auth.users, nullable)
- approved_at (TIMESTAMPTZ, nullable)
- status (TEXT: 'pending', 'approved', 'rejected')
- created_at, updated_at
```

### Existing Tables (Keep)
- `jobs` table timer columns (for backward compatibility)
- `time_entries` table (for optional clock in/out system)

---

## 🎨 UI/UX Considerations

### Time Sheets View
- Clean, table-based layout
- Sortable columns
- Date range picker
- Summary cards at top
- Mobile-responsive

### Approval Workflow
- Clear pending/rejected badges
- Bulk selection
- Approve/Reject with optional notes
- Filter/search functionality

### Reports
- Visual charts (use Chart.js)
- Export buttons
- Custom date ranges
- Print-friendly layout

---

## ✅ Success Criteria

1. **Staff can:**
   - View their time sheets for any period
   - See overtime hours clearly marked
   - Track time accurately per job

2. **Admins can:**
   - Review all pending time entries
   - Approve/reject time entries
   - View comprehensive time reports
   - Export time data for payroll

3. **System:**
   - Automatically detects overtime
   - Calculates accurate time durations
   - Sends notifications for approvals
   - Maintains data integrity

---

## 🚀 Quick Start (MVP)

If you want to start with minimal features:

1. **Phase 1 only** - Individual time logs
2. **Basic time sheets** - Simple table view for staff
3. **Basic approval** - Approve/reject buttons for admins

This gives you 80% of the value with 20% of the effort!

---

## ❓ Questions to Consider

1. **Overtime threshold:** 8 hours? Configurable per staff member?
2. **Time rounding:** Round to nearest 15 minutes? 5 minutes?
3. **Break time:** Deduct break time automatically? Manual entry?
4. **Multiple jobs per day:** How to handle time switching between jobs?
5. **Time edits:** Allow staff to edit time? Or admin only?
6. **Payroll integration:** Export format? Integration with payroll software?

---

**Ready to start? Which phase would you like to begin with?**

