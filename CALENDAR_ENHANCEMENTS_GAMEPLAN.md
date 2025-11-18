# 📅 Calendar Enhancements Game Plan

## Current Features
- ✅ Week/Day/Month views
- ✅ Drag-and-drop rescheduling
- ✅ Click to create/view events
- ✅ Shows jobs and bookings
- ✅ Recurring events support
- ✅ Custom modern styling
- ✅ Dark mode support
- ✅ Time-based event display (based on estimated hours)

---

## 🎯 Proposed Enhancements

### Phase 1: Filtering & Search (High Priority)
**Goal:** Make it easier to find specific events

1. **Event Type Filter**
   - Toggle buttons: "All", "Jobs", "Bookings"
   - Visual indicators when filters are active
   - Persist filter state

2. **Status Filter**
   - Filter by job/booking status (Pending, In Progress, Completed, etc.)
   - Color-coded status badges in filter UI

3. **Worker/Staff Filter**
   - Dropdown to filter by assigned worker
   - "Unassigned" option
   - Only show jobs for selected worker

4. **Site Filter**
   - Dropdown to filter by site
   - "All Sites" option
   - Quick site selection

5. **Search Bar**
   - Search events by title, site name, worker name
   - Real-time filtering
   - Highlight matching events

6. **Filter Summary Badge**
   - Show active filter count
   - Quick "Clear All Filters" button

---

### Phase 2: Quick Actions & Context Menu (Medium Priority)
**Goal:** Faster access to common actions

1. **Right-Click Context Menu**
   - View Details
   - Edit (if draft/pending)
   - Reschedule
   - Duplicate
   - Delete/Cancel
   - Change Status (for jobs)

2. **Event Tooltip/Popover**
   - Hover to see quick info (site, worker, status, time)
   - Click to open full details
   - Better mobile touch support

3. **Quick Action Buttons**
   - "Today" button (already exists, enhance)
   - "Jump to Date" picker
   - "Go to Next Week/Month" shortcuts

---

### Phase 3: Export & Print (Medium Priority)
**Goal:** Share and print calendar views

1. **Export to iCal**
   - Export visible events to .ics file
   - Subscribe to calendar feed (future)
   - Include event details

2. **Print Calendar View**
   - Print-friendly layout
   - Current view (week/day/month)
   - Include event details
   - Hide controls, show only calendar

3. **Export to PDF**
   - Generate PDF of calendar view
   - Include date range and filters
   - Professional formatting

---

### Phase 4: Visual Enhancements (Low Priority)
**Goal:** Better visual clarity and information

1. **Event Legend**
   - Color-coded legend for event types
   - Status indicators
   - Job vs Booking distinction
   - Show/hide toggle

2. **Conflict Detection**
   - Visual indicators for overlapping events
   - Warning badges for scheduling conflicts
   - Worker availability checking

3. **Event Count Badges**
   - Show count of events per day in month view
   - "More events" indicator
   - Click to expand

4. **Better Recurring Event Display**
   - Visual indicator for recurring series
   - "Edit Series" option
   - Show recurrence pattern in tooltip

5. **Time Zone Display**
   - Show current time zone
   - Time zone selector (if multi-timezone support needed)

---

### Phase 5: Mobile Optimizations (Low Priority)
**Goal:** Better mobile experience

1. **Touch Gestures**
   - Swipe to navigate weeks/months
   - Pinch to zoom (if applicable)
   - Long-press for context menu

2. **Mobile-Specific UI**
   - Larger touch targets
   - Simplified controls
   - Bottom sheet for event details

---

## 🚀 Implementation Order

### Recommended: Start with Phase 1 (Filtering & Search)
**Why:** Highest impact, most requested feature, improves usability significantly

**Estimated Effort:** Medium (2-3 hours)

**Features:**
1. Event Type Filter (Jobs/Bookings toggle)
2. Status Filter (dropdown)
3. Worker Filter (dropdown)
4. Site Filter (dropdown)
5. Search Bar
6. Filter Summary & Clear All

---

## 📋 Detailed Implementation Plan for Phase 1

### UI Components to Add:
1. **Filter Bar** (above calendar controls)
   - Event Type: Toggle buttons (All | Jobs | Bookings)
   - Status: Dropdown (All | Pending | In Progress | Completed | Cancelled)
   - Worker: Dropdown (All | [Worker List] | Unassigned)
   - Site: Dropdown (All | [Site List])
   - Search: Text input with search icon
   - Clear Filters: Button (only visible when filters active)

2. **Filter State Management**
   - Store active filters in variables
   - Apply filters to `formatJobsForCalendar` and `formatBookingsForCalendar`
   - Update calendar when filters change

3. **Visual Feedback**
   - Highlight active filter buttons
   - Show filter count badge
   - Disable/enable filters based on user role (staff restrictions)

### Code Structure:
```javascript
// Filter state
let calendarFilters = {
  eventType: 'all', // 'all', 'jobs', 'bookings'
  status: 'all', // 'all', 'pending', 'in_progress', etc.
  workerId: 'all', // 'all', worker ID, or 'unassigned'
  siteId: 'all', // 'all' or site ID
  search: '' // search query
};

// Filter functions
function applyCalendarFilters() {
  // Filter jobs and bookings based on active filters
  // Update calendar
}

function clearCalendarFilters() {
  // Reset all filters
  // Update calendar
}
```

---

## ✅ Approval Needed

**Please approve Phase 1 (Filtering & Search) before implementation.**

Would you like me to:
1. ✅ Implement Phase 1 (Filtering & Search) - **RECOMMENDED**
2. Skip to Phase 2 (Quick Actions)
3. Skip to Phase 3 (Export & Print)
4. Custom selection of specific features

