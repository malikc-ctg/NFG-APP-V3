# ⏱️ Time Tracking Integration - Reports Page Tabs Game Plan

## 🎯 Overview

Integrate time tracking features as tabs within the existing Reports page, replacing the current single-view design with a tabbed interface.

---

## 📊 Current Reports Page Structure

### Existing Features:
- Time period filter (Last 7/30/90 days, This Year, Custom Range)
- Metric cards (Total Jobs, Completed, Active Sites, Emergencies)
- Charts (Jobs Over Time, Staff Hours, Worker Performance)
- Data tables (Worker Stats, Top Sites, Top Services, Recent Jobs)
- Export CSV button
- Print button

### Current Layout:
```
Reports Page
├── Header (with time period filter)
├── Metric Cards (4 cards)
├── Charts Row (2-3 charts)
└── Data Tables (4 tables)
```

---

## 🎨 Proposed Tab Structure

### Tab Navigation:
```
[Overview] [Time Tracking] [Job Analytics] [Site Analytics]
```

Or simplified:
```
[Overview] [Time Tracking]
```

### Tab Breakdown:

#### **Tab 1: Overview** (Current Reports - Renamed)
- All existing features
- Metric cards
- Charts (Jobs Over Time, Worker Performance)
- Data tables

#### **Tab 2: Time Tracking** (NEW)
- Staff: Time Sheets view
- Admin: Time Approval + Time Reports
- Date range filter (shared with Overview)
- Time-specific metrics and charts

#### **Tab 3: Job Analytics** (Optional - Future)
- Job performance metrics
- Job type analysis
- Job completion rates

#### **Tab 4: Site Analytics** (Optional - Future)
- Site performance
- Site metrics
- Site comparisons

---

## 🚀 Implementation Plan

### **Phase 1: Tab System Setup**

#### 1.1 Add Tab Navigation HTML
**File:** `reports.html`

**Location:** After the header, before content

```html
<!-- Tab Navigation -->
<div class="border-b border-nfgray dark:border-gray-700 mb-6">
  <nav class="flex gap-2 -mb-px">
    <button 
      id="tab-overview" 
      class="tab-btn px-4 py-2 text-sm font-medium border-b-2 border-nfgblue text-nfgblue dark:text-blue-400 transition-colors"
      data-tab="overview"
    >
      <i data-lucide="bar-chart-3" class="w-4 h-4 inline mr-2"></i>
      Overview
    </button>
    <button 
      id="tab-time-tracking" 
      class="tab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-nfgblue hover:border-gray-300 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
      data-tab="time-tracking"
    >
      <i data-lucide="clock" class="w-4 h-4 inline mr-2"></i>
      Time Tracking
    </button>
  </nav>
</div>
```

#### 1.2 Wrap Content in Tab Containers
**File:** `reports.html`

```html
<!-- Overview Tab Content (existing content) -->
<div id="tab-content-overview" class="tab-content">
  <!-- All existing metric cards, charts, tables -->
</div>

<!-- Time Tracking Tab Content (new) -->
<div id="tab-content-time-tracking" class="tab-content hidden">
  <!-- Time tracking content here -->
</div>
```

#### 1.3 Tab Switching JavaScript
**File:** `reports.html`

```javascript
// Tab switching logic
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      
      // Update button styles
      tabButtons.forEach(btn => {
        btn.classList.remove('border-nfgblue', 'text-nfgblue', 'dark:text-blue-400');
        btn.classList.add('border-transparent', 'text-gray-500', 'dark:text-gray-400');
      });
      
      button.classList.remove('border-transparent', 'text-gray-500', 'dark:text-gray-400');
      button.classList.add('border-nfgblue', 'text-nfgblue', 'dark:text-blue-400');
      
      // Show/hide tab content
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      
      document.getElementById(`tab-content-${targetTab}`)?.classList.remove('hidden');
      
      // Load tab-specific data if needed
      if (targetTab === 'time-tracking') {
        loadTimeTrackingData();
      }
    });
  });
  
  // Set default tab (Overview)
  const overviewTab = document.getElementById('tab-overview');
  if (overviewTab) {
    overviewTab.click();
  }
}
```

---

### **Phase 2: Database Schema (Individual Staff Time Logs)**

#### 2.1 Create Staff Time Logs Table
**File:** `ADD_STAFF_TIME_LOGS.sql` (new file)

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

-- Indexes for performance
CREATE INDEX idx_staff_time_logs_user_id ON staff_time_logs(user_id);
CREATE INDEX idx_staff_time_logs_job_id ON staff_time_logs(job_id);
CREATE INDEX idx_staff_time_logs_clock_in ON staff_time_logs(clock_in);
CREATE INDEX idx_staff_time_logs_status ON staff_time_logs(status);
CREATE INDEX idx_staff_time_logs_user_clock ON staff_time_logs(user_id, clock_in DESC);

-- RLS Policies (optional - can enable later)
-- ALTER TABLE staff_time_logs ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON staff_time_logs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE IF EXISTS staff_time_logs_id_seq TO authenticated;
```

---

### **Phase 3: Modify Job Timer to Create Time Logs**

#### 3.1 Update Begin Work Handler
**File:** `jobs.html`

**Current:** Creates `work_started_at` in `jobs` table
**New:** Also creates entry in `staff_time_logs` table

```javascript
// Begin Work button handler
document.getElementById('begin-work-btn')?.addEventListener('click', async () => {
  // ... existing code ...
  
  // Create time log entry
  const { data: timeLog, error: timeLogError } = await supabase
    .from('staff_time_logs')
    .insert({
      user_id: currentUser.id,
      job_id: currentJobId,
      clock_in: new Date().toISOString(),
      status: 'pending'
    })
    .select()
    .single();
  
  if (timeLogError) {
    console.warn('⚠️ Could not create time log:', timeLogError);
    // Continue anyway - time log is not critical
  }
  
  // ... rest of existing code ...
});
```

#### 3.2 Update End Work Handler
**File:** `jobs.html`

**Current:** Updates `work_ended_at` and `total_duration` in `jobs` table
**New:** Also updates entry in `staff_time_logs` table

```javascript
// End Work button handler
document.getElementById('end-work-btn')?.addEventListener('click', async () => {
  // ... existing confirmation ...
  
  const clockOutTime = new Date();
  const clockInTime = job.work_started_at ? new Date(job.work_started_at) : new Date();
  const totalSeconds = Math.floor((clockOutTime - clockInTime) / 1000);
  
  // Check for overtime (8 hours = 28800 seconds)
  const OVERTIME_THRESHOLD = 8 * 3600; // 8 hours in seconds
  const isOvertime = totalSeconds > OVERTIME_THRESHOLD;
  
  // Update jobs table (existing)
  await supabase
    .from('jobs')
    .update({
      work_ended_at: clockOutTime.toISOString(),
      total_duration: totalSeconds,
      status: allTasksComplete ? 'completed' : 'in-progress'
    })
    .eq('id', currentJobId);
  
  // Update or create time log entry
  const { data: existingLog } = await supabase
    .from('staff_time_logs')
    .select('id')
    .eq('user_id', currentUser.id)
    .eq('job_id', currentJobId)
    .is('clock_out', null)
    .order('clock_in', { ascending: false })
    .limit(1)
    .single();
  
  if (existingLog) {
    // Update existing log
    await supabase
      .from('staff_time_logs')
      .update({
        clock_out: clockOutTime.toISOString(),
        total_duration: totalSeconds,
        is_overtime: isOvertime
      })
      .eq('id', existingLog.id);
  } else {
    // Create new log (fallback if Begin Work didn't create one)
    await supabase
      .from('staff_time_logs')
      .insert({
        user_id: currentUser.id,
        job_id: currentJobId,
        clock_in: clockInTime.toISOString(),
        clock_out: clockOutTime.toISOString(),
        total_duration: totalSeconds,
        is_overtime: isOvertime,
        status: 'pending'
      });
  }
  
  // ... rest of existing code ...
});
```

---

### **Phase 4: Time Tracking Tab Content**

#### 4.1 Tab Content Structure
**File:** `reports.html`

```html
<!-- Time Tracking Tab Content -->
<div id="tab-content-time-tracking" class="tab-content hidden space-y-6">
  
  <!-- Role-Based Header -->
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-semibold text-nfgblue dark:text-blue-400">
        <!-- Staff: My Time Sheet -->
        <!-- Admin: Time Tracking & Approval -->
      </h2>
    </div>
    
    <!-- Staff: Export my time sheet -->
    <!-- Admin: Bulk approve, Export all -->
    <div class="flex gap-2">
      <button id="export-time-sheet-btn" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight text-sm">
        <i data-lucide="download" class="w-4 h-4 inline mr-2"></i>
        Export
      </button>
    </div>
  </div>
  
  <!-- Staff View: Time Sheets -->
  <div id="time-sheets-view" class="hidden">
    <!-- Summary Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
        <p class="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
        <p id="time-total-hours" class="text-2xl font-bold text-nfgblue dark:text-blue-400 mt-1">0h</p>
      </div>
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
        <p class="text-sm text-gray-500 dark:text-gray-400">Overtime Hours</p>
        <p id="time-overtime-hours" class="text-2xl font-bold text-orange-600 mt-1">0h</p>
      </div>
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
        <p class="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
        <p id="time-pending-count" class="text-2xl font-bold text-yellow-600 mt-1">0</p>
      </div>
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
        <p class="text-sm text-gray-500 dark:text-gray-400">Average/Day</p>
        <p id="time-avg-hours" class="text-2xl font-bold text-green-600 mt-1">0h</p>
      </div>
    </div>
    
    <!-- Time Entries Table -->
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg overflow-hidden">
      <div class="p-4 border-b border-nfgray">
        <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400">My Time Entries</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-nfglight dark:bg-gray-700">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Job</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Clock In</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Clock Out</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Duration</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Overtime</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody id="time-entries-table" class="divide-y divide-nfgray">
            <!-- Time entries will be populated here -->
          </tbody>
        </table>
      </div>
    </div>
  </div>
  
  <!-- Admin View: Time Approval + Reports -->
  <div id="time-admin-view" class="hidden">
    <!-- Sub-tabs for Admin -->
    <div class="border-b border-nfgray dark:border-gray-700 mb-6">
      <nav class="flex gap-2 -mb-px">
        <button 
          id="subtab-approval" 
          class="subtab-btn px-4 py-2 text-sm font-medium border-b-2 border-nfgblue text-nfgblue dark:text-blue-400"
          data-subtab="approval"
        >
          Time Approval
        </button>
        <button 
          id="subtab-reports" 
          class="subtab-btn px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-nfgblue"
          data-subtab="reports"
        >
          Time Reports
        </button>
      </nav>
    </div>
    
    <!-- Approval Sub-tab -->
    <div id="subtab-content-approval" class="subtab-content space-y-4">
      <!-- Filters -->
      <div class="flex flex-wrap gap-2 items-center">
        <select id="approval-filter-staff" class="px-3 py-2 rounded-xl border border-nfgray text-sm">
          <option value="">All Staff</option>
          <!-- Populated with staff list -->
        </select>
        <select id="approval-filter-status" class="px-3 py-2 rounded-xl border border-nfgray text-sm">
          <option value="pending" selected>Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All</option>
        </select>
        <button id="bulk-approve-btn" class="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 text-sm">
          <i data-lucide="check-circle" class="w-4 h-4 inline mr-2"></i>
          Bulk Approve Selected
        </button>
      </div>
      
      <!-- Pending Time Entries Table -->
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg overflow-hidden">
        <div class="p-4 border-b border-nfgray">
          <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400">Pending Time Entries</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-nfglight dark:bg-gray-700">
              <tr>
                <th class="px-4 py-3 text-left">
                  <input type="checkbox" id="select-all-time-entries" class="rounded">
                </th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Staff</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Date</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Job</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Clock In</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Clock Out</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Duration</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Overtime</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody id="pending-time-entries-table" class="divide-y divide-nfgray">
              <!-- Pending entries will be populated here -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Reports Sub-tab -->
    <div id="subtab-content-reports" class="subtab-content hidden space-y-6">
      <!-- Time Summary Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Hours</p>
          <p id="admin-total-hours" class="text-2xl font-bold text-nfgblue dark:text-blue-400 mt-1">0h</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
          <p class="text-sm text-gray-500 dark:text-gray-400">Overtime Hours</p>
          <p id="admin-overtime-hours" class="text-2xl font-bold text-orange-600 mt-1">0h</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
          <p class="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
          <p id="admin-pending-count" class="text-2xl font-bold text-yellow-600 mt-1">0</p>
        </div>
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 shadow-nfg">
          <p class="text-sm text-gray-500 dark:text-gray-400">Active Staff</p>
          <p id="admin-active-staff" class="text-2xl font-bold text-green-600 mt-1">0</p>
        </div>
      </div>
      
      <!-- Charts -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Hours by Staff Chart -->
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-6 shadow-nfg">
          <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400 mb-4">Hours by Staff</h3>
          <div style="height: 300px; position: relative;">
            <canvas id="hours-by-staff-chart"></canvas>
          </div>
        </div>
        
        <!-- Daily Hours Trend Chart -->
        <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-6 shadow-nfg">
          <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400 mb-4">Daily Hours Trend</h3>
          <div style="height: 300px; position: relative;">
            <canvas id="daily-hours-trend-chart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Staff Time Summary Table -->
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg overflow-hidden">
        <div class="p-4 border-b border-nfgray">
          <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400">Staff Time Summary</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-nfglight dark:bg-gray-700">
              <tr>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Staff</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Total Hours</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Regular Hours</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Overtime Hours</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Jobs</th>
                <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Avg/Day</th>
              </tr>
            </thead>
            <tbody id="staff-time-summary-table" class="divide-y divide-nfgray">
              <!-- Staff summary will be populated here -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
```

---

### **Phase 5: JavaScript Functions**

#### 5.1 Load Time Tracking Data
**File:** `reports.html`

```javascript
// Load time tracking data based on user role
async function loadTimeTrackingData() {
  if (!currentUser || !currentUserProfile) return;
  
  const isStaff = currentUserProfile.role === 'staff';
  
  if (isStaff) {
    // Show staff view
    document.getElementById('time-sheets-view')?.classList.remove('hidden');
    document.getElementById('time-admin-view')?.classList.add('hidden');
    await loadMyTimeSheet();
  } else {
    // Show admin view
    document.getElementById('time-sheets-view')?.classList.add('hidden');
    document.getElementById('time-admin-view')?.classList.remove('hidden');
    await loadPendingTimeEntries();
    await loadTimeReports();
  }
}

// Staff: Load my time sheet
async function loadMyTimeSheet() {
  const timePeriod = document.getElementById('time-period')?.value || '30';
  const { startDate, endDate } = getDateRange(timePeriod);
  
  // Fetch time entries
  const { data: timeEntries, error } = await supabase
    .from('staff_time_logs')
    .select('*, jobs(title, sites(name))')
    .eq('user_id', currentUser.id)
    .gte('clock_in', startDate)
    .lte('clock_in', endDate)
    .order('clock_in', { ascending: false });
  
  if (error) {
    console.error('Error loading time sheet:', error);
    return;
  }
  
  // Calculate summary metrics
  const totalSeconds = timeEntries.reduce((sum, entry) => sum + (entry.total_duration || 0), 0);
  const overtimeSeconds = timeEntries
    .filter(e => e.is_overtime)
    .reduce((sum, entry) => {
      const regularSeconds = 8 * 3600; // 8 hours
      return sum + (entry.total_duration - regularSeconds);
    }, 0);
  
  const totalHours = (totalSeconds / 3600).toFixed(1);
  const overtimeHours = (overtimeSeconds / 3600).toFixed(1);
  const pendingCount = timeEntries.filter(e => e.status === 'pending').length;
  
  // Update summary cards
  document.getElementById('time-total-hours').textContent = `${totalHours}h`;
  document.getElementById('time-overtime-hours').textContent = `${overtimeHours}h`;
  document.getElementById('time-pending-count').textContent = pendingCount;
  
  // Calculate average hours per day
  const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 1;
  const avgHours = (totalSeconds / 3600 / days).toFixed(1);
  document.getElementById('time-avg-hours').textContent = `${avgHours}h`;
  
  // Render time entries table
  renderTimeEntriesTable(timeEntries, 'time-entries-table', true);
}

// Admin: Load pending time entries
async function loadPendingTimeEntries() {
  const staffFilter = document.getElementById('approval-filter-staff')?.value || '';
  const statusFilter = document.getElementById('approval-filter-status')?.value || 'pending';
  
  let query = supabase
    .from('staff_time_logs')
    .select('*, user_profiles(full_name, email), jobs(title, sites(name))')
    .eq('status', statusFilter);
  
  if (staffFilter) {
    query = query.eq('user_id', staffFilter);
  }
  
  const { data: entries, error } = await query.order('clock_in', { ascending: false });
  
  if (error) {
    console.error('Error loading pending entries:', error);
    return;
  }
  
  renderPendingTimeEntriesTable(entries);
}

// Admin: Load time reports
async function loadTimeReports() {
  const timePeriod = document.getElementById('time-period')?.value || '30';
  const { startDate, endDate } = getDateRange(timePeriod);
  
  // Fetch all time entries
  const { data: timeEntries, error } = await supabase
    .from('staff_time_logs')
    .select('*, user_profiles(full_name, email), jobs(title, sites(name))')
    .gte('clock_in', startDate)
    .lte('clock_in', endDate)
    .eq('status', 'approved'); // Only approved entries for reports
  
  if (error) {
    console.error('Error loading time reports:', error);
    return;
  }
  
  // Calculate metrics
  const totalSeconds = timeEntries.reduce((sum, e) => sum + (e.total_duration || 0), 0);
  const overtimeSeconds = timeEntries
    .filter(e => e.is_overtime)
    .reduce((sum, e) => {
      const regularSeconds = 8 * 3600;
      return sum + Math.max(0, (e.total_duration || 0) - regularSeconds);
    }, 0);
  
  const pendingEntries = timeEntries.filter(e => e.status === 'pending');
  const activeStaff = [...new Set(timeEntries.map(e => e.user_id))].length;
  
  // Update metrics
  document.getElementById('admin-total-hours').textContent = `${(totalSeconds / 3600).toFixed(1)}h`;
  document.getElementById('admin-overtime-hours').textContent = `${(overtimeSeconds / 3600).toFixed(1)}h`;
  document.getElementById('admin-pending-count').textContent = pendingEntries.length;
  document.getElementById('admin-active-staff').textContent = activeStaff;
  
  // Create charts
  createHoursByStaffChart(timeEntries);
  createDailyHoursTrendChart(timeEntries);
  
  // Render staff summary table
  renderStaffTimeSummaryTable(timeEntries);
}

// Render time entries table
function renderTimeEntriesTable(entries, tableId, isStaff = false) {
  const tbody = document.getElementById(tableId);
  if (!tbody) return;
  
  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-gray-500">
          No time entries found for this period
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = entries.map(entry => {
    const date = new Date(entry.clock_in).toLocaleDateString();
    const clockIn = new Date(entry.clock_in).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const clockOut = entry.clock_out 
      ? new Date(entry.clock_out).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      : 'In Progress';
    
    const duration = entry.total_duration 
      ? formatDuration(entry.total_duration)
      : 'Calculating...';
    
    const overtimeBadge = entry.is_overtime 
      ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Yes</span>'
      : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No</span>';
    
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'approved': 'bg-green-100 text-green-700',
      'rejected': 'bg-red-100 text-red-700'
    };
    
    const statusBadge = `<span class="px-2 py-1 rounded-full text-xs font-medium ${statusColors[entry.status] || statusColors.pending}">${entry.status}</span>`;
    
    return `
      <tr class="hover:bg-nfglight dark:hover:bg-gray-700">
        <td class="px-4 py-3">${date}</td>
        <td class="px-4 py-3">
          ${entry.jobs?.title || 'General Work'}
          ${entry.jobs?.sites?.name ? `<br><span class="text-xs text-gray-500">${entry.jobs.sites.name}</span>` : ''}
        </td>
        <td class="px-4 py-3">${clockIn}</td>
        <td class="px-4 py-3">${clockOut}</td>
        <td class="px-4 py-3 font-medium">${duration}</td>
        <td class="px-4 py-3">${overtimeBadge}</td>
        <td class="px-4 py-3">${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// Render pending time entries for admin approval
function renderPendingTimeEntriesTable(entries) {
  const tbody = document.getElementById('pending-time-entries-table');
  if (!tbody) return;
  
  if (entries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="px-4 py-8 text-center text-gray-500">
          No pending time entries
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = entries.map(entry => {
    const staffName = entry.user_profiles?.full_name || entry.user_profiles?.email || 'Unknown';
    const date = new Date(entry.clock_in).toLocaleDateString();
    const clockIn = new Date(entry.clock_in).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    const clockOut = entry.clock_out 
      ? new Date(entry.clock_out).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })
      : 'In Progress';
    
    const duration = entry.total_duration 
      ? formatDuration(entry.total_duration)
      : 'Calculating...';
    
    const overtimeBadge = entry.is_overtime 
      ? '<span class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Yes</span>'
      : '<span class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">No</span>';
    
    return `
      <tr class="hover:bg-nfglight dark:hover:bg-gray-700">
        <td class="px-4 py-3">
          <input type="checkbox" class="time-entry-checkbox rounded" data-entry-id="${entry.id}">
        </td>
        <td class="px-4 py-3 font-medium">${staffName}</td>
        <td class="px-4 py-3">${date}</td>
        <td class="px-4 py-3">
          ${entry.jobs?.title || 'General Work'}
        </td>
        <td class="px-4 py-3">${clockIn}</td>
        <td class="px-4 py-3">${clockOut}</td>
        <td class="px-4 py-3 font-medium">${duration}</td>
        <td class="px-4 py-3">${overtimeBadge}</td>
        <td class="px-4 py-3">
          <div class="flex gap-2">
            <button 
              onclick="approveTimeEntry('${entry.id}')" 
              class="px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 text-xs"
            >
              Approve
            </button>
            <button 
              onclick="rejectTimeEntry('${entry.id}')" 
              class="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs"
            >
              Reject
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Approve time entry
async function approveTimeEntry(entryId) {
  const confirmed = confirm('Approve this time entry?');
  if (!confirmed) return;
  
  const { error } = await supabase
    .from('staff_time_logs')
    .update({
      status: 'approved',
      approved_by: currentUser.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', entryId);
  
  if (error) {
    console.error('Error approving entry:', error);
    toast.error('Failed to approve time entry');
    return;
  }
  
  toast.success('Time entry approved');
  await loadPendingTimeEntries();
  await loadTimeReports();
}

// Reject time entry
async function rejectTimeEntry(entryId) {
  const reason = prompt('Rejection reason (optional):');
  
  const { error } = await supabase
    .from('staff_time_logs')
    .update({
      status: 'rejected',
      approved_by: currentUser.id,
      approved_at: new Date().toISOString(),
      notes: reason || 'Rejected by admin'
    })
    .eq('id', entryId);
  
  if (error) {
    console.error('Error rejecting entry:', error);
    toast.error('Failed to reject time entry');
    return;
  }
  
  toast.success('Time entry rejected');
  await loadPendingTimeEntries();
}

// Format duration helper
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Get date range helper
function getDateRange(period) {
  const now = new Date();
  let startDate, endDate;
  
  if (period === 'custom') {
    startDate = document.getElementById('date-from')?.value;
    endDate = document.getElementById('date-to')?.value;
  } else if (period === 'all') {
    startDate = '2000-01-01';
    endDate = now.toISOString().split('T')[0];
  } else {
    const days = parseInt(period);
    startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate = startDate.toISOString().split('T')[0];
    endDate = now.toISOString().split('T')[0];
  }
  
  return { startDate, endDate };
}
```

---

## 📋 Implementation Checklist

### Phase 1: Tab System (Week 1)
- [ ] Add tab navigation HTML
- [ ] Wrap existing content in "Overview" tab
- [ ] Create "Time Tracking" tab container
- [ ] Implement tab switching JavaScript
- [ ] Test tab switching works correctly

### Phase 2: Database (Week 1)
- [ ] Create `ADD_STAFF_TIME_LOGS.sql` migration
- [ ] Run migration in Supabase SQL Editor
- [ ] Verify table created correctly
- [ ] Test RLS policies (if enabled)

### Phase 3: Job Timer Integration (Week 1)
- [ ] Modify Begin Work handler to create time log
- [ ] Modify End Work handler to update time log
- [ ] Add overtime detection logic
- [ ] Test timer creates time logs correctly

### Phase 4: Time Sheets View (Week 2)
- [ ] Create staff time sheets HTML structure
- [ ] Implement `loadMyTimeSheet()` function
- [ ] Create `renderTimeEntriesTable()` function
- [ ] Add summary cards calculations
- [ ] Test time sheets display correctly

### Phase 5: Admin Approval View (Week 2)
- [ ] Create approval sub-tab HTML
- [ ] Implement `loadPendingTimeEntries()` function
- [ ] Create `renderPendingTimeEntriesTable()` function
- [ ] Add approve/reject handlers
- [ ] Add bulk approval functionality
- [ ] Test approval workflow

### Phase 6: Time Reports View (Week 3)
- [ ] Create reports sub-tab HTML
- [ ] Implement `loadTimeReports()` function
- [ ] Create hours by staff chart
- [ ] Create daily hours trend chart
- [ ] Create staff time summary table
- [ ] Test reports display correctly

### Phase 7: Charts & Analytics (Week 3)
- [ ] Implement `createHoursByStaffChart()`
- [ ] Implement `createDailyHoursTrendChart()`
- [ ] Style charts to match app theme
- [ ] Test charts render correctly

### Phase 8: Export & Polish (Week 4)
- [ ] Add export time sheet functionality
- [ ] Add print functionality
- [ ] Add loading states
- [ ] Add error handling
- [ ] Test all features end-to-end
- [ ] Fix bugs and edge cases

---

## 🎨 UI/UX Details

### Tab Styling
- Active tab: Blue bottom border, blue text
- Inactive tab: Transparent border, gray text
- Hover: Light gray background
- Smooth transitions

### Responsive Design
- Tabs stack on mobile
- Tables scroll horizontally on mobile
- Cards stack on mobile
- Touch-friendly buttons

### Loading States
- Show skeleton loaders while fetching
- Disable buttons during actions
- Show success/error toasts

---

## 🧪 Testing Plan

### Staff Testing
1. ✅ View my time sheet for current period
2. ✅ See summary metrics (total hours, overtime, pending)
3. ✅ View time entries table
4. ✅ Export time sheet to CSV
5. ✅ Time entries show correct duration
6. ✅ Overtime flagged correctly

### Admin Testing
1. ✅ View pending time entries
2. ✅ Filter by staff member
3. ✅ Approve individual entries
4. ✅ Reject individual entries
5. ✅ Bulk approve selected entries
6. ✅ View time reports
7. ✅ Charts display correctly
8. ✅ Staff summary table accurate

---

## 📁 Files to Create/Modify

### New Files
1. `ADD_STAFF_TIME_LOGS.sql` - Database migration

### Files to Modify
1. `reports.html` - Add tabs, time tracking content
2. `jobs.html` - Update Begin/End Work handlers
3. `js/notification-triggers.js` - Add time approval notifications (optional)

---

## ✅ Success Criteria

1. **Staff can:**
   - View their time sheet for any date range
   - See overtime hours clearly marked
   - Export their time data

2. **Admins can:**
   - Review all pending time entries
   - Approve/reject time entries (individual or bulk)
   - View comprehensive time reports
   - See charts and analytics

3. **System:**
   - Automatically creates time logs when staff begin work
   - Detects overtime accurately
   - Maintains data integrity
   - Handles errors gracefully

---

## 🚀 Quick Start MVP

If you want to start minimal:

1. **Phase 1** - Add tabs (Overview + Time Tracking)
2. **Phase 2** - Create database table
3. **Phase 3** - Modify job timer
4. **Phase 4** - Basic time sheets view for staff
5. **Phase 5** - Basic approval view for admin

This gives you core functionality in ~2-3 days!

---

## ❓ Questions

1. **Overtime threshold:** 8 hours? Configurable?
2. **Time rounding:** Round to nearest 15 minutes? Keep exact?
3. **Multiple timers:** Handle multiple jobs simultaneously?
4. **Edit time:** Allow staff to edit time? Or admin only?
5. **Notifications:** Notify staff when approved/rejected?

---

**Ready to start? Phase 1 (Tab System) is the foundation - everything builds on top!**

