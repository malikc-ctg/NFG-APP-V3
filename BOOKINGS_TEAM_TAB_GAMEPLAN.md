# 👥 Team Tab in Bookings Page - Gameplan

## 🎯 Goal
Add an improved employee/team management view as a third tab (Team) in the bookings page, alongside Table and Calendar views.

---

## 📊 Current Bookings Page Structure

### **Existing Views:**
1. **Table View** - List of bookings in table format
2. **Calendar View** - Calendar with bookings displayed

### **New View to Add:**
3. **Team View** - Enhanced employee management interface

---

## 🏗️ Implementation Plan

### **Phase 1: Add Team Tab & Container** (30 min)

#### Step 1.1: Add Team View Button
- Add "Team" button to view toggle section
- Icon: `users`
- Position: After Calendar button

#### Step 1.2: Create Team View Container
- Create `team-view-container` div (similar to table/calendar containers)
- Initially hidden
- Add placeholder content

#### Step 1.3: Update View Toggle Logic
- Extend `toggleView()` function to handle 'team' view
- Update button styles accordingly
- Hide/show appropriate containers

---

### **Phase 2: Employee Statistics Header** (45 min)

#### Step 2.1: Summary Cards
Display at top of team view:
- **Total Employees:** X
- **Active:** X
- **Pending:** X
- **Inactive:** X

#### Step 2.2: Role Breakdown
- Admin: X
- Staff: X
- Client: X

---

### **Phase 3: Search & Filter Bar** (45 min)

#### Step 3.1: Search Input
- Real-time search by name/email/phone
- Clear button

#### Step 3.2: Filter Dropdowns
- **Role Filter:** All, Admin, Staff, Client
- **Status Filter:** All, Active, Pending, Inactive

#### Step 3.3: Sort Dropdown
- Name (A-Z, Z-A)
- Most Jobs
- Most Sites
- Last Active

---

### **Phase 4: Enhanced Employee Cards** (1.5 hours)

#### Step 4.1: Card Design
Each card shows:
- **Avatar** (with online indicator)
- **Name** (bold, primary)
- **Email** (secondary)
- **Phone** (if available)
- **Role Badge** (Admin/Staff/Client)
- **Status Badge** (Active/Pending/Inactive)
- **Quick Stats:**
  - Jobs assigned: X
  - Jobs completed: X
  - Sites assigned: X
- **Quick Actions:**
  - View Details
  - Assign Site
  - Send Message

#### Step 4.2: Data Fetching
- Fetch user profiles
- Fetch job counts per user
- Fetch site assignment counts
- Calculate statistics

---

### **Phase 5: Grid Layout** (30 min)

#### Step 5.1: Responsive Grid
- **Desktop:** 3 columns
- **Tablet:** 2 columns
- **Mobile:** 1 column

#### Step 5.2: Card Styling
- Hover effects
- Status indicators (colored left border)
- Proper spacing

---

### **Phase 6: Quick Actions** (1 hour)

#### Step 6.1: View Details Modal
- Full employee information
- All assigned sites
- Job history
- Activity timeline

#### Step 6.2: Quick Assign Site
- Inline modal/dropdown
- Select site from dropdown
- Save assignment

#### Step 6.3: Send Message
- Link to messages page
- Pre-select user

---

## 🎨 UI Structure

```
Bookings Page
├── View Toggle Section
│   ├── Table Button
│   ├── Calendar Button
│   └── Team Button (NEW)
│
└── Scrollable Content
    ├── Table Container
    ├── Calendar Container
    └── Team Container (NEW)
        ├── Statistics Header
        ├── Search & Filter Bar
        └── Employee Cards Grid
```

---

## 📋 Files to Modify

1. **`bookings.html`**
   - Add Team button to view toggle
   - Create team-view-container
   - Add employee cards HTML structure
   - Add search/filter UI

2. **`bookings.html` (inline script)**
   - Extend `toggleView()` function
   - Add `initTeamView()` function
   - Add employee fetching logic
   - Add search/filter/sort logic
   - Add quick action handlers

---

## ⏱️ Time Estimate

**Total:** ~4-5 hours

- Phase 1: 30 min
- Phase 2: 45 min
- Phase 3: 45 min
- Phase 4: 1.5 hours
- Phase 5: 30 min
- Phase 6: 1 hour

---

## 🚀 Ready to Start!

Let's begin with **Phase 1** - adding the Team tab and basic container structure.

