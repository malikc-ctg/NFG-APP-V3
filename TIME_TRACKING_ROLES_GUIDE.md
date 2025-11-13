# ⏱️ Time Tracking System - Role-Based Access Guide

## 🎯 Overview

The time tracking system is designed to work differently for each user role: **Staff**, **Admin**, and **Client**. This document explains how each role interacts with the time tracking features.

---

## 👷 **STAFF ROLE**

### **What Staff Can Do:**

1. **Track Time on Jobs**
   - Click "Begin Work" on assigned jobs → Automatically creates a time log entry
   - Click "End Work" → Updates time log with duration and overtime detection
   - Timer runs while working
   - Overtime automatically detected (>8 hours/day)

2. **View Their Time Sheets (Reports Page)**
   - **Location:** Reports → Time Tracking tab (ONLY tab visible)
   - **View:** "My Time Sheet"
   - **See:**
     - Summary cards: Total Hours, Overtime Hours, Pending Approval, Average/Day
     - Time entries table with: Date, Job, Clock In, Clock Out, Duration, Overtime flag, Status
   - **Filter:** By date range (Last 7/30/90 days, This Year, Custom Range)
   - **Export:** Download their time sheet as CSV

3. **What Staff CANNOT Do:**
   - ❌ Cannot see other staff members' time entries
   - ❌ Cannot approve/reject time entries
   - ❌ Cannot see admin reports/analytics
   - ❌ Cannot see Overview tab on Reports page
   - ❌ Cannot edit time entries (only admin can)

### **Staff Workflow:**

```
1. Staff logs into app
2. Goes to Jobs page
3. Opens assigned job
4. Clicks "Begin Work" → Timer starts, time log created (status: pending)
5. Works on job
6. Clicks "End Work" → Timer stops, time log updated with duration
7. Time entry is marked as "pending" for admin approval
8. Staff can view their time sheet on Reports page
9. Waits for admin to approve their time entry
10. Once approved, time entry appears in their approved records
```

---

## 👔 **ADMIN ROLE**

### **What Admins Can Do:**

1. **View All Time Tracking Data**
   - **Location:** Reports → Time Tracking tab
   - **See both sub-tabs:**
     - **Time Approval** (review and approve/reject time entries)
     - **Time Reports** (analytics and insights)

2. **Time Approval Sub-Tab:**
   - **View:** All pending time entries from all staff
   - **Filter by:**
     - Staff member (dropdown: All Staff, or specific staff)
     - Status (Pending, Approved, Rejected, All)
   - **Actions:**
     - ✅ Approve individual entries
     - ❌ Reject individual entries (with optional reason)
     - ✅ Bulk approve selected entries (checkbox selection)
   - **See:** Staff name, Date, Job, Clock In/Out, Duration, Overtime flag, Actions

3. **Time Reports Sub-Tab:**
   - **Summary Metrics:**
     - Total Hours (all staff, approved entries only)
     - Overtime Hours
     - Pending Approval count
     - Active Staff count
   - **Charts:**
     - Hours by Staff (bar chart - top 10 staff)
     - Daily Hours Trend (line chart - hours per day over time)
   - **Staff Time Summary Table:**
     - Per staff member: Total Hours, Regular Hours, Overtime Hours, Jobs count, Avg/Day
   - **Filter:** By date range (same as Overview tab)

4. **View Overview Tab:**
   - Admins also have access to the Overview tab with:
     - Job metrics
     - Worker performance charts
     - Site analytics
     - All standard reports

5. **What Admins CANNOT Do:**
   - ❌ Cannot create time entries for themselves (unless they're also assigned as staff on a job)
   - ❌ Cannot edit time entry details directly (only approve/reject)

### **Admin Workflow:**

```
1. Admin logs into app
2. Goes to Reports → Time Tracking tab
3. Sees "Time Approval" sub-tab by default
4. Reviews pending time entries
5. Can filter by staff member or status
6. Approves or rejects entries (individual or bulk)
7. Switches to "Time Reports" sub-tab to see analytics
8. Views charts, summary tables, and metrics
9. Can export reports if needed
```

---

## 🏢 **CLIENT ROLE**

### **What Clients Can Do:**

1. **View Their Own Time Tracking (if they track time)**
   - **Location:** Reports → Time Tracking tab
   - **Same as Staff:** See "My Time Sheet" view
   - **Note:** Clients typically don't track time unless they're also working on jobs

2. **View Overview Tab:**
   - Clients can access the Overview tab to see:
     - Their job metrics
     - Site analytics (for their sites)
     - All standard reports

3. **What Clients CANNOT Do:**
   - ❌ Cannot approve/reject time entries (admin-only)
   - ❌ Cannot see admin reports (Hours by Staff, Daily Hours Trend)
   - ❌ Cannot see other users' time entries
   - ❌ Cannot access "Time Approval" or "Time Reports" admin sub-tabs

### **Client Workflow:**

```
1. Client logs into app
2. Goes to Reports → Time Tracking tab (if they have time entries)
3. Views their own time sheet (if any)
4. Can also view Overview tab for their business metrics
5. Typically don't interact with time tracking unless they also work on jobs
```

---

## 📊 **Data Access by Role**

### **Time Entries Visibility:**

| Role | Own Entries | Other Staff Entries | Approval Actions | Admin Reports |
|------|-------------|---------------------|------------------|---------------|
| **Staff** | ✅ View only | ❌ No | ❌ No | ❌ No |
| **Admin** | ✅ View & Create | ✅ View all | ✅ Approve/Reject | ✅ Full access |
| **Client** | ✅ View only | ❌ No | ❌ No | ❌ No |

### **Reports Page Access:**

| Role | Overview Tab | Time Tracking Tab | Time Approval | Time Reports |
|------|--------------|-------------------|---------------|--------------|
| **Staff** | ❌ Hidden | ✅ Visible (My Time Sheet only) | ❌ Hidden | ❌ Hidden |
| **Admin** | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| **Client** | ✅ Visible | ✅ Visible (My Time Sheet only) | ❌ Hidden | ❌ Hidden |

---

## 🔐 **Security & Permissions**

### **Database Level (RLS):**

Currently, RLS is optional on the `staff_time_logs` table. When enabled, you can set policies like:

```sql
-- Staff can only see their own time entries
CREATE POLICY "Staff can view own time entries"
ON staff_time_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can see all time entries
CREATE POLICY "Admins can view all time entries"
ON staff_time_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);
```

### **Application Level:**

- **Frontend checks:** Role-based UI hiding/showing
- **Query filters:** JavaScript filters by `user_id` for staff
- **Validation:** Server-side validation in Supabase Edge Functions (if used)

---

## 📝 **Time Entry Lifecycle**

```
1. CREATION
   ├─ Staff clicks "Begin Work" on job
   ├─ System creates time log entry
   └─ Status: "pending"

2. TRACKING
   ├─ Timer runs while staff works
   ├─ Staff clicks "End Work"
   ├─ System calculates duration
   ├─ System detects overtime (>8 hours)
   └─ Updates time log with: clock_out, total_duration, is_overtime

3. APPROVAL
   ├─ Admin reviews pending entries
   ├─ Admin approves → Status: "approved"
   └─ OR Admin rejects → Status: "rejected" (with notes)

4. REPORTING
   ├─ Approved entries appear in Time Reports
   ├─ Charts and analytics calculated
   └─ Available for export/analysis
```

---

## 🎨 **UI Differences by Role**

### **Staff View (Reports Page):**

```
[Time Tracking]  ← Only tab visible

My Time Sheet
├─ Summary Cards (4 cards)
├─ Time Entries Table
└─ Export Button
```

### **Admin View (Reports Page):**

```
[Overview] [Time Tracking]  ← Both tabs visible

Time Tracking Tab:
├─ [Time Approval] [Time Reports]  ← Sub-tabs
│
├─ Time Approval:
│  ├─ Filters (Staff, Status)
│  ├─ Bulk Approve Button
│  └─ Pending Entries Table
│
└─ Time Reports:
   ├─ Summary Metrics (4 cards)
   ├─ Charts (Hours by Staff, Daily Trend)
   └─ Staff Summary Table
```

### **Client View (Reports Page):**

```
[Overview] [Time Tracking]  ← Both tabs visible

Time Tracking Tab:
└─ My Time Sheet (same as staff)
```

---

## 💡 **Key Features by Role**

### **For Staff:**
- ✅ Simple time tracking (Begin/End Work)
- ✅ View personal time sheet
- ✅ Export personal time data
- ✅ See overtime flags
- ✅ Track status (pending/approved/rejected)

### **For Admins:**
- ✅ Approve/reject time entries
- ✅ Bulk operations
- ✅ Filter and search
- ✅ Analytics and reports
- ✅ Monitor staff productivity
- ✅ Track overtime trends
- ✅ Export aggregated reports

### **For Clients:**
- ✅ View their own time (if applicable)
- ✅ Access standard reports
- ✅ View site/job metrics

---

## 🚀 **Usage Scenarios**

### **Scenario 1: Staff Tracking Time**

```
Staff Member (John):
1. Assigned to "Clean Office Building" job
2. Opens job detail modal
3. Clicks "Begin Work" at 9:00 AM
4. Works for 4 hours
5. Clicks "End Work" at 1:00 PM
6. Time entry created: 4 hours, status: pending
7. Views time sheet on Reports page
8. Sees entry with "pending" status
9. Waits for admin approval
```

### **Scenario 2: Admin Approving Time**

```
Admin (Sarah):
1. Goes to Reports → Time Tracking → Time Approval
2. Sees 5 pending entries
3. Reviews John's 4-hour entry
4. Clicks "Approve"
5. Entry status changes to "approved"
6. John's time sheet now shows "approved" status
7. Entry appears in Time Reports analytics
```

### **Scenario 3: Admin Viewing Analytics**

```
Admin (Sarah):
1. Goes to Reports → Time Tracking → Time Reports
2. Sees summary: Total Hours: 120h, Overtime: 15h
3. Views "Hours by Staff" chart
4. Sees John has 40 hours, Mike has 30 hours, etc.
5. Views "Daily Hours Trend" to see workload patterns
6. Reviews Staff Summary Table for detailed breakdown
7. Exports data for payroll processing
```

---

## 🔧 **Configuration Options**

### **Overtime Threshold:**
- **Current:** 8 hours per day
- **Location:** `jobs.html` - End Work handler
- **Configurable:** Change `OVERTIME_THRESHOLD` constant

### **Time Entry Status:**
- **Pending:** Default when created
- **Approved:** After admin approval
- **Rejected:** After admin rejection (with notes)

### **Export Format:**
- **Current:** CSV format
- **Future:** Could add PDF export

---

## 📈 **Future Enhancements (Potential)**

1. **Multi-Role Support:**
   - Users with both "staff" and "admin" roles
   - Different permissions per role

2. **Time Entry Editing:**
   - Allow admins to edit time entries directly
   - Allow staff to add notes to entries

3. **Notifications:**
   - Notify staff when time is approved/rejected
   - Notify admins when new entries need approval

4. **Advanced Filtering:**
   - Filter by job type
   - Filter by site
   - Filter by overtime flag

5. **Payroll Integration:**
   - Export formatted payroll data
   - Calculate wages based on hours

---

## ✅ **Summary**

**Staff:** Track time → View time sheet → Wait for approval

**Admin:** Review entries → Approve/reject → View analytics → Export reports

**Client:** View own time (if any) → Access standard reports

The system is designed to be simple for staff (just track time) while providing powerful tools for admins (approval workflow + analytics).

