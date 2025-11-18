# 📅 Calendar Event Sidebar Game Plan

## 🎯 Goal
Add a right-side sidebar that appears when clicking calendar events, displaying comprehensive job/booking details with all assigned staff, site info, and quick actions.

---

## 📋 Feature Overview

### Current Behavior
- Clicking events navigates to jobs page OR opens booking modal
- No inline detail view
- Must leave calendar to see full details

### New Behavior
- Click event → Sidebar slides in from right
- Shows complete event details without leaving calendar
- Quick actions directly from sidebar
- Close sidebar to continue viewing calendar

---

## 🎨 UI/UX Design (Based on Reference Image)

### Layout Structure
```
┌─────────────────────────────┬──────────────────┐
│                             │                  │
│   Calendar Grid             │   Event Detail   │
│   (Week/Day/Month View)     │   Sidebar        │
│                             │   (Slides In)    │
│                             │                  │
│                             │   - Header       │
│                             │   - Details      │
│                             │   - Staff List   │
│                             │   - Site Info    │
│                             │   - Actions      │
│                             │                  │
└─────────────────────────────┴──────────────────┘
```

### Sidebar Components

#### 1. **Header Section**
- Event title (Job title or Booking title)
- Close button (X icon)
- Edit button (pencil icon) - if user has permission
- Delete/Cancel button (trash icon) - if user has permission

#### 2. **Event Details Section**
- **Date & Time**
  - Calendar icon + date (e.g., "28 December 2024")
  - Clock icon + time range (e.g., "8:00 - 10:00 AM")
  - "All Day" badge if applicable
  
- **Status Badge**
  - Color-coded status (Pending, In Progress, Completed, Cancelled)
  - Visual indicator

- **Event Type Indicator**
  - "Job" or "Booking" label
  - Icon differentiation

#### 3. **Assigned Staff Section** ⭐ KEY FEATURE
- Section title: "Assigned Staff" or "Team Members"
- List of all assigned workers:
  - Staff profile picture/avatar
  - Staff name
  - Role/title (if available)
  - Contact info (optional - phone/email icons)
- "Unassigned" message if no staff assigned
- "Add Staff" button for jobs (if user has permission)

#### 4. **Site Information Section**
- Site name (clickable → navigate to site details)
- Site address (with map pin icon)
- Site contact info
- Deal value (if available)

#### 5. **Client Information Section** (if applicable)
- Client name
- Client contact info (phone, email)
- Client address

#### 6. **Additional Details**
- **For Jobs:**
  - Job type
  - Frequency (one-time, recurring pattern)
  - Estimated hours
  - Priority/urgency
  - Description/notes
  
- **For Bookings:**
  - Services selected
  - Recurrence pattern
  - Notes

#### 7. **Action Buttons**
- **Primary Actions:**
  - "View Full Details" (link to jobs/booking detail page)
  - "Reschedule" (opens quick reschedule modal)
  - "Edit" (if draft/pending - opens edit modal)
  
- **Secondary Actions:**
  - "Change Status" (for jobs - quick status dropdown)
  - "Assign Staff" (for jobs - if not fully assigned)
  - "Cancel" (if allowed)
  - "Duplicate" (optional)

---

## 🔧 Technical Implementation

### 1. **HTML Structure**
```html
<!-- Event Detail Sidebar -->
<div id="calendar-event-sidebar" class="hidden fixed right-0 top-0 h-full w-full md:w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform translate-x-full transition-transform duration-300">
  <div class="h-full flex flex-col overflow-y-auto">
    
    <!-- Header -->
    <div class="p-4 border-b border-nfgray flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
      <h3 id="sidebar-event-title" class="text-lg font-semibold text-nfgblue dark:text-blue-400"></h3>
      <div class="flex items-center gap-2">
        <button id="sidebar-edit-btn" class="p-2 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700">
          <i data-lucide="edit" class="w-4 h-4"></i>
        </button>
        <button id="sidebar-delete-btn" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
        <button id="sidebar-close-btn" class="p-2 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 p-4 space-y-6">
      
      <!-- Date & Time -->
      <div>
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
          <i data-lucide="calendar" class="w-4 h-4"></i>
          <span id="sidebar-date"></span>
        </div>
        <div class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <i data-lucide="clock" class="w-4 h-4"></i>
          <span id="sidebar-time"></span>
        </div>
        <div id="sidebar-status-badge" class="mt-2"></div>
      </div>

      <!-- Assigned Staff -->
      <div>
        <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
          <i data-lucide="users" class="w-4 h-4"></i>
          Assigned Staff
        </h4>
        <div id="sidebar-staff-list" class="space-y-2">
          <!-- Staff items will be rendered here -->
        </div>
        <button id="sidebar-add-staff-btn" class="mt-2 text-sm text-nfgblue dark:text-blue-400 hover:underline">
          + Add Staff Member
        </button>
      </div>

      <!-- Site Information -->
      <div>
        <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          Site Information
        </h4>
        <div id="sidebar-site-info"></div>
      </div>

      <!-- Client Information (if applicable) -->
      <div id="sidebar-client-section" class="hidden">
        <h4 class="font-semibold text-sm mb-3 flex items-center gap-2">
          <i data-lucide="user" class="w-4 h-4"></i>
          Client Information
        </h4>
        <div id="sidebar-client-info"></div>
      </div>

      <!-- Additional Details -->
      <div id="sidebar-additional-details"></div>

    </div>

    <!-- Action Buttons Footer -->
    <div class="p-4 border-t border-nfgray space-y-2 sticky bottom-0 bg-white dark:bg-gray-800">
      <button id="sidebar-view-details-btn" class="w-full px-4 py-2.5 rounded-xl bg-nfgblue dark:bg-blue-900 text-white hover:bg-nfgdark font-medium">
        View Full Details
      </button>
      <div class="grid grid-cols-2 gap-2">
        <button id="sidebar-reschedule-btn" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight dark:hover:bg-gray-700 font-medium">
          Reschedule
        </button>
        <button id="sidebar-change-status-btn" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight dark:hover:bg-gray-700 font-medium">
          Change Status
        </button>
      </div>
    </div>

  </div>
</div>

<!-- Overlay (click to close sidebar) -->
<div id="sidebar-overlay" class="hidden fixed inset-0 bg-black/40 z-40"></div>
```

### 2. **JavaScript Functions**

#### `openEventSidebar(eventId, eventType)`
- Fetch complete event data (job or booking)
- Fetch related data (staff, site, client)
- Populate sidebar with all information
- Animate sidebar slide-in
- Show overlay

#### `closeEventSidebar()`
- Animate sidebar slide-out
- Hide overlay
- Clear sidebar content

#### `renderStaffList(staffMembers)`
- Create staff cards with:
  - Avatar/initials
  - Name
  - Contact icons (if available)
  - Role badge

#### `renderSiteInfo(site)`
- Display site name, address, contact
- Make clickable to navigate to site details

#### `renderClientInfo(client)` (if applicable)
- Display client name, contact info
- Link to client profile

#### `handleSidebarActions()`
- Edit button → Open edit modal
- Delete button → Confirm and delete
- Reschedule → Open quick reschedule modal
- View Details → Navigate to full detail page
- Change Status → Quick status dropdown

### 3. **Data Fetching**

#### For Jobs:
```javascript
async function fetchJobForSidebar(jobId) {
  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      sites:site_id (*),
      assigned_worker:assigned_worker_id (*),
      worker_site_assignments!jobs_site_id_fkey (
        user_profiles:worker_id (*)
      )
    `)
    .eq('id', jobId)
    .single();
    
  // Fetch all assigned workers (including multiple assignments)
  const { data: assignments } = await supabase
    .from('worker_site_assignments')
    .select('user_profiles:worker_id (*)')
    .eq('site_id', job.site_id);
    
  return { job, staff: assignments.map(a => a.user_profiles) };
}
```

#### For Bookings:
```javascript
async function fetchBookingForSidebar(bookingId) {
  const { data: booking } = await supabase
    .from('bookings')
    .select(`
      *,
      sites:site_id (*),
      user_profiles:created_by (*),
      client:client_id (*)
    `)
    .eq('id', bookingId)
    .single();
    
  return booking;
}
```

### 4. **Integration with Existing Calendar**

#### Modify `eventClick` handler:
```javascript
eventClick: (info) => {
  const eventType = info.event.extendedProps.type;
  const eventId = info.event.extendedProps.id;
  
  // Open sidebar instead of navigating
  openEventSidebar(eventId, eventType);
  
  // Prevent default navigation
  info.jsEvent.preventDefault();
}
```

---

## 🎨 Styling Requirements

### Sidebar Styles
- **Width:** 
  - Desktop: 384px (w-96)
  - Mobile: Full width with slide-in
- **Position:** Fixed right, full height
- **Animation:** Slide-in from right (transform: translateX(0))
- **Shadow:** Strong shadow (shadow-2xl)
- **Scroll:** Vertical scroll for content area
- **Sticky:** Header and footer sticky

### Staff Cards
- Avatar circle (initials if no image)
- Name and role
- Hover effect
- Contact icons (optional)

### Responsive Behavior
- **Desktop:** Sidebar slides in, calendar resizes slightly
- **Mobile:** Sidebar full-width overlay, calendar dims

---

## 📱 Mobile Considerations

1. **Full-screen overlay on mobile**
2. **Swipe-to-close gesture**
3. **Touch-friendly buttons (larger tap targets)**
4. **Bottom sheet style on mobile (optional enhancement)**

---

## ✅ Implementation Checklist

### Phase 1: Basic Sidebar (Core Functionality)
- [ ] Create HTML structure for sidebar
- [ ] Add CSS for slide-in animation
- [ ] Create `openEventSidebar()` function
- [ ] Create `closeEventSidebar()` function
- [ ] Modify `eventClick` handler to open sidebar
- [ ] Fetch job/booking data for sidebar
- [ ] Render basic event details (title, date, time, status)

### Phase 2: Staff Assignment Display ⭐
- [ ] Fetch all assigned staff for jobs
- [ ] Create `renderStaffList()` function
- [ ] Display staff avatars/initials
- [ ] Show staff names and roles
- [ ] Handle "no staff assigned" state
- [ ] Add "Add Staff" button functionality

### Phase 3: Site & Client Information
- [ ] Fetch site data
- [ ] Create `renderSiteInfo()` function
- [ ] Make site clickable (navigate to site details)
- [ ] Fetch client data (for bookings)
- [ ] Create `renderClientInfo()` function

### Phase 4: Action Buttons
- [ ] Implement "View Full Details" button
- [ ] Implement "Reschedule" button (quick modal)
- [ ] Implement "Edit" button (opens edit modal)
- [ ] Implement "Delete/Cancel" button
- [ ] Implement "Change Status" dropdown
- [ ] Implement "Add Staff" button (if not in Phase 2)

### Phase 5: Polish & Enhancements
- [ ] Add loading states
- [ ] Add error handling
- [ ] Smooth animations
- [ ] Mobile optimizations
- [ ] Keyboard shortcuts (ESC to close)
- [ ] Overlay click to close

---

## 🚀 Recommended Implementation Order

1. **Start with Phase 1** - Get basic sidebar working
2. **Then Phase 2** - Add staff assignment display (key requirement)
3. **Then Phase 3** - Add site/client info
4. **Then Phase 4** - Add action buttons
5. **Finally Phase 5** - Polish and mobile

---

## 📝 Notes

- **Performance:** Cache staff/site data to avoid excessive API calls
- **Permissions:** Hide edit/delete buttons for staff users
- **State Management:** Track open sidebar state to prevent multiple sidebars
- **Accessibility:** Add ARIA labels, keyboard navigation
- **Backward Compatibility:** Keep option to navigate to full page (if needed)

---

## ✅ Approval Needed

**Ready to implement?** Please approve and I'll start with Phase 1 (Basic Sidebar + Staff Assignment Display).

