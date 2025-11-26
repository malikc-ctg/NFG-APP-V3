# ⏱️ Team Active Jobs & Real-Time Timers - Gameplan

## 🎯 Goal
Enhance the Team tab to show which jobs/projects each employee is currently working on, along with real-time timers that sync with the actual job timers.

---

## 📊 Current State Analysis

### **What We Have:**
- ✅ Job timer system (start/stop work)
- ✅ `work_started_at` timestamp in jobs table
- ✅ `work_ended_at` timestamp in jobs table
- ✅ `total_duration` calculated field
- ✅ Job status tracking (pending, in-progress, completed)
- ✅ Employee performance table (jobs assigned, completed, etc.)

### **What's Missing:**
- ❌ Active jobs display per employee
- ❌ Real-time timer display in Team tab
- ❌ Live sync with job timers
- ❌ "Currently Working On" section
- ❌ Timer status indicators

---

## 🎨 Proposed Features

### **Feature 1: Active Jobs Column in Employee Table**

**Add new column:** "Active Jobs" or "Working On"

**Display:**
- Shows count of jobs with `status = 'in-progress'` AND `work_started_at IS NOT NULL`
- Click to expand and see list of active jobs
- Real-time timer for each active job
- Job title, site name, time elapsed

**Example:**
```
Employee | Role | Status | Jobs | Active Jobs | ...
John Doe | Staff| Active | 12   | 2 ⏱️ 1h 23m | ...
```

---

### **Feature 2: "Currently Working On" Section**

**New section above or below the table:**

**Card Layout:**
- Shows employees who are actively working (have in-progress jobs with timers)
- Each card shows:
  - Employee name & avatar
  - Active job(s) they're working on
  - Real-time timer(s)
  - Job title and site
  - Time elapsed

**Example:**
```
┌─────────────────────────────────────────┐
│ Currently Working On                    │
├─────────────────────────────────────────┤
│ [Avatar] John Doe                       │
│ Monthly Cleaning - ABC Office           │
│ ⏱️ 1h 23m 45s                          │
│                                         │
│ [Avatar] Jane Smith                     │
│ Emergency Repair - XYZ Warehouse        │
│ ⏱️ 0h 45m 12s                          │
└─────────────────────────────────────────┘
```

---

### **Feature 3: Real-Time Timer Sync**

**Timer Calculation:**
- If `work_started_at` exists and `work_ended_at` is NULL:
  - Timer = Current Time - `work_started_at`
  - Updates every second
- If `work_ended_at` exists:
  - Timer = `work_ended_at` - `work_started_at`
  - Shows final duration (static)

**Real-Time Updates:**
- Use Supabase Realtime to listen for job updates
- When job status changes or timer starts/stops, update display
- Refresh timer display every second for active jobs

---

### **Feature 4: Enhanced Employee Details Modal**

**Add "Active Work" section:**
- List of currently active jobs
- Real-time timers for each
- Quick actions:
  - View Job Details
  - End Work (if admin)
  - Message Employee

---

## 🏗️ Implementation Plan

### **Phase 1: Active Jobs Data Fetching** (1 hour)

**Tasks:**
1. Modify `fetchEmployeeStats()` to include active jobs
2. Query jobs with:
   - `assigned_worker_id = employee.id`
   - `status = 'in-progress'`
   - `work_started_at IS NOT NULL`
   - `work_ended_at IS NULL`
3. Calculate elapsed time for each active job
4. Store active jobs in employee data structure

**Database Query:**
```sql
SELECT 
  id, 
  title, 
  site_id, 
  work_started_at,
  sites(name)
FROM jobs
WHERE assigned_worker_id = $employeeId
  AND status = 'in-progress'
  AND work_started_at IS NOT NULL
  AND work_ended_at IS NULL
```

---

### **Phase 2: Active Jobs Column in Table** (1.5 hours)

**Tasks:**
1. Add "Active Jobs" column to employee table
2. Display count of active jobs
3. Add expand/collapse functionality
4. Show job list with timers when expanded
5. Format timer display (HH:MM:SS)

**UI Design:**
```
Active Jobs
───────────
2 ⏱️ 1h 23m
  ▼ Monthly Cleaning (ABC Office) - 1h 23m
  ▼ Emergency Repair (XYZ) - 0h 45m
```

---

### **Phase 3: "Currently Working On" Section** (1.5 hours)

**Tasks:**
1. Create new section above employee table
2. Filter employees with active jobs
3. Display cards for each active employee
4. Show active job(s) with real-time timers
5. Add "View Job" links

**Layout:**
- Grid layout (2-3 columns on desktop, 1 on mobile)
- Card design matching existing style
- Real-time timer updates
- Empty state when no one is working

---

### **Phase 4: Real-Time Timer Updates** (2 hours)

**Tasks:**
1. Create timer update function
2. Calculate elapsed time: `now - work_started_at`
3. Update display every second
4. Format time as HH:MM:SS or "Xh Ym" for longer durations
5. Handle timezone correctly

**Timer Function:**
```javascript
function updateActiveJobTimer(job) {
  if (!job.work_started_at || job.work_ended_at) {
    return job.total_duration || '0:00:00';
  }
  
  const startTime = new Date(job.work_started_at);
  const now = new Date();
  const elapsed = Math.floor((now - startTime) / 1000); // seconds
  
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  return `${hours}h ${minutes}m ${seconds}s`;
}
```

---

### **Phase 5: Supabase Realtime Sync** (1.5 hours)

**Tasks:**
1. Subscribe to `jobs` table changes
2. Listen for:
   - Status changes (to 'in-progress')
   - `work_started_at` updates
   - `work_ended_at` updates
3. Update employee data when jobs change
4. Refresh active jobs display
5. Update timers in real-time

**Realtime Subscription:**
```javascript
const jobsChannel = supabase
  .channel('team-active-jobs')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'jobs',
    filter: 'status=eq.in-progress'
  }, (payload) => {
    // Update active jobs for affected employee
    updateEmployeeActiveJobs(payload.new.assigned_worker_id);
  })
  .subscribe();
```

---

### **Phase 6: Enhanced Employee Details Modal** (1 hour)

**Tasks:**
1. Add "Active Work" section to modal
2. Display active jobs with timers
3. Show job details (title, site, time elapsed)
4. Add quick actions (View Job, End Work)
5. Real-time timer updates in modal

---

## 📋 Detailed Feature Specs

### **Active Jobs Column**

**Display Format:**
- **No active jobs:** `-` or `0`
- **1 active job:** `1 ⏱️ 1h 23m` (with timer)
- **Multiple active jobs:** `3 ⏱️ 2h 15m` (total time or longest)

**Expandable Row:**
- Click count to expand
- Shows list of active jobs
- Each job shows:
  - Job title
  - Site name
  - Individual timer
  - Link to job details

---

### **"Currently Working On" Section**

**Card Structure:**
```html
<div class="active-work-card">
  <div class="employee-header">
    <avatar />
    <name />
  </div>
  <div class="active-jobs">
    <job-card>
      <title />
      <site />
      <timer /> <!-- Real-time -->
    </job-card>
  </div>
</div>
```

**Empty State:**
- "No employees currently working"
- Icon and message

---

### **Timer Display Formats**

**Short Duration (< 1 hour):**
- `45m 23s`
- `12m 5s`

**Medium Duration (1-24 hours):**
- `1h 23m 45s`
- `5h 12m 30s`

**Long Duration (24+ hours):**
- `1d 2h 15m`
- `2d 5h 30m`

**Real-Time Updates:**
- Update every second
- Smooth transitions
- Highlight if timer is running

---

## 🔄 Data Flow

### **Initial Load:**
1. Fetch all employees
2. For each employee, fetch active jobs
3. Calculate elapsed times
4. Render table and "Currently Working On" section
5. Start timer updates

### **Real-Time Updates:**
1. Supabase Realtime detects job change
2. Update employee's active jobs list
3. Recalculate timers
4. Update UI (table + cards)
5. Continue timer updates

### **Timer Updates:**
1. Every second, for each active job:
2. Calculate elapsed time
3. Update display
4. Continue until job ends

---

## 🎨 UI/UX Design

### **Active Jobs Column:**
- **Count Badge:** Small badge with number
- **Timer Display:** Inline timer next to count
- **Expand Icon:** Arrow or chevron
- **Expanded View:** Indented list below row

### **"Currently Working On" Cards:**
- **Card Style:** Match existing report cards
- **Timer:** Large, prominent display
- **Job Info:** Title and site name
- **Status Indicator:** Green dot for active
- **Hover Effect:** Subtle shadow

### **Timer Styling:**
- **Active Timer:** Green text, pulsing animation (optional)
- **Final Timer:** Gray text, static
- **Font:** Monospace for alignment
- **Size:** Medium (readable but not overwhelming)

---

## 📊 Database Considerations

### **Required Fields (Already Exist):**
- `jobs.assigned_worker_id` - Links job to employee
- `jobs.status` - 'in-progress' for active jobs
- `jobs.work_started_at` - Timer start time
- `jobs.work_ended_at` - Timer end time (NULL if active)
- `jobs.total_duration` - Final duration (seconds)

### **Indexes (Optional - for Performance):**
```sql
CREATE INDEX idx_jobs_active_worker 
ON jobs(assigned_worker_id, status) 
WHERE status = 'in-progress' AND work_started_at IS NOT NULL;
```

---

## ⚡ Performance Considerations

### **Optimizations:**
1. **Batch Queries:** Fetch all active jobs in one query
2. **Client-Side Calculation:** Calculate timers in browser
3. **Debounce Updates:** Don't update UI on every realtime event
4. **Timer Throttling:** Update display every second, not more
5. **Lazy Loading:** Only load active jobs when Team tab is open

### **Scalability:**
- If 100+ employees, consider pagination
- Limit active jobs display to top 10-20
- Use virtual scrolling for large lists

---

## 🔔 Real-Time Sync Strategy

### **Option 1: Polling (Simple)**
- Refresh active jobs every 5-10 seconds
- Simple to implement
- Less real-time, more server load

### **Option 2: Supabase Realtime (Recommended)**
- Subscribe to job changes
- Instant updates
- More efficient
- Requires realtime setup

### **Option 3: Hybrid**
- Realtime for status changes
- Polling for timer updates (every second)
- Best of both worlds

**Recommended: Option 2 (Supabase Realtime) + Timer Updates**

---

## 📝 Implementation Steps

### **Step 1: Modify Data Fetching** (30 min)
- Update `fetchEmployeeStats()` to include active jobs
- Query active jobs per employee
- Calculate elapsed times

### **Step 2: Add Active Jobs Column** (45 min)
- Add column to table
- Display count and timer
- Add expand/collapse

### **Step 3: Create "Currently Working On" Section** (45 min)
- Add section HTML
- Filter employees with active jobs
- Display cards with timers

### **Step 4: Implement Timer Updates** (1 hour)
- Create timer calculation function
- Set up interval for updates
- Format time display

### **Step 5: Add Realtime Sync** (1 hour)
- Subscribe to job changes
- Update active jobs on changes
- Handle connection issues

### **Step 6: Enhance Employee Modal** (30 min)
- Add active jobs to modal
- Show timers
- Add quick actions

### **Step 7: Polish & Testing** (30 min)
- Test timer accuracy
- Test real-time updates
- Test edge cases (job ends, status changes)
- Mobile responsiveness

**Total Estimated Time:** ~5-6 hours

---

## 🎯 Success Criteria

### **Must Have:**
- ✅ Active jobs count in employee table
- ✅ Real-time timer display
- ✅ "Currently Working On" section
- ✅ Timer updates every second
- ✅ Sync with job timer system

### **Nice to Have:**
- ✅ Expandable job list in table
- ✅ Realtime sync (vs polling)
- ✅ Timer animations
- ✅ Quick actions (end work, view job)
- ✅ Historical timer data

---

## 🐛 Edge Cases to Handle

1. **Job Ends While Viewing:**
   - Timer stops updating
   - Show final duration
   - Remove from "Currently Working On"

2. **Multiple Active Jobs:**
   - Show all jobs
   - Display individual timers
   - Total time calculation

3. **Timer Calculation Errors:**
   - Handle missing `work_started_at`
   - Handle future timestamps
   - Handle timezone issues

4. **Realtime Connection Loss:**
   - Fallback to polling
   - Show connection status
   - Reconnect automatically

5. **No Active Jobs:**
   - Show empty state
   - Hide "Currently Working On" section
   - Show "0" in table

---

## 📊 Example Data Structure

```javascript
{
  id: "user-123",
  full_name: "John Doe",
  email: "john@example.com",
  role: "staff",
  status: "active",
  jobsAssigned: 12,
  jobsCompleted: 8,
  completionRate: 67,
  sitesAssigned: 3,
  activeJobs: [
    {
      id: "job-456",
      title: "Monthly Cleaning",
      site_id: "site-789",
      site_name: "ABC Office",
      work_started_at: "2025-01-23T10:00:00Z",
      work_ended_at: null,
      elapsed_seconds: 5023, // calculated
      elapsed_display: "1h 23m 43s" // formatted
    },
    {
      id: "job-457",
      title: "Emergency Repair",
      site_id: "site-790",
      site_name: "XYZ Warehouse",
      work_started_at: "2025-01-23T11:30:00Z",
      work_ended_at: null,
      elapsed_seconds: 2712,
      elapsed_display: "45m 12s"
    }
  ]
}
```

---

## 🚀 Implementation Order

1. **Phase 1:** Data fetching (active jobs)
2. **Phase 2:** Active Jobs column in table
3. **Phase 3:** "Currently Working On" section
4. **Phase 4:** Real-time timer updates
5. **Phase 5:** Realtime sync
6. **Phase 6:** Enhanced modal

---

## 💡 Future Enhancements

1. **Timer History:** Show timer history per employee
2. **Productivity Metrics:** Average work time per job
3. **Overtime Alerts:** Warn if timer exceeds expected time
4. **Timer Controls:** Admin can end work from Team tab
5. **Time Tracking Reports:** Detailed time reports per employee
6. **Multi-Job Timer:** Handle employees working on multiple jobs simultaneously

---

**Ready to implement?** This will make the Team tab show real-time work activity! 🚀

