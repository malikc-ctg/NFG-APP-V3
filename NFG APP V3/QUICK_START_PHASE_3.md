# 🚀 Phase 3 Quick Start Guide

## ⚡ Run This First!

### **Step 1: Update Database (30 seconds)**

1. Open **Supabase SQL Editor**
2. Copy and run **`ADD_SITE_WORKER_AND_JOB_AUTO_CREATE.sql`**
3. Wait for: `✅ Phase 3 Database Ready!`

---

## ✅ What You Got

### **Automatic Workflow:**
```
Create Booking → Auto-creates Job → Auto-assigns to Site Worker → Staff sees it in feed
```

### **Key Features:**
- ✅ Jobs auto-created from bookings
- ✅ Workers auto-assigned based on site
- ✅ Services become job tasks (with photo requirements)
- ✅ Deep-linking between bookings and jobs
- ✅ Staff only see their assigned jobs

---

## 🧪 Test It Now!

### **Quick Test (5 minutes)**

1. **Create a booking:**
   - Open `bookings.html`
   - Click "New Booking"
   - Fill form + select 2-3 services
   - Click "Create Booking"
   - ✅ See: "Job is assigned to site worker" (or "unassigned")

2. **Verify job was created:**
   - Go to `jobs.html`
   - See the new job in the list
   - Click "View Details"
   - ✅ See tasks matching your selected services

3. **Test the link:**
   - Go back to `bookings.html`
   - Click "View Details" on your booking
   - Click "View Job Details" button
   - ✅ Should jump to jobs page and open the job modal

---

## 👷 Assign Workers to Sites (Optional)

**To auto-assign jobs, you need to set which staff work at which sites:**

### **Option 1: Manual (via Supabase)**
```sql
-- Get staff user IDs
SELECT id, full_name, email FROM user_profiles WHERE role = 'staff';

-- Assign staff to site
UPDATE sites 
SET assigned_worker_id = '<staff-user-id>' 
WHERE id = <site-id>;
```

### **Option 2: Future UI Feature**
We can add a dropdown in the site detail modal to easily assign workers. Want this? Let me know!

---

## 📊 What Happens Now

### **When You Create a Booking:**

1. **Booking created** ✅
2. **Job auto-created** with:
   - Same title, site, date
   - Status: pending
   - Assigned to site's worker (if set)
3. **Tasks auto-created** from services:
   - Each service = 1 task
   - All require photos
4. **Links established**:
   - Booking → Job (via `job_id`)
   - Job → Worker (via `assigned_worker_id`)

### **Staff Experience:**

1. Log in
2. Go to Jobs page
3. **See only their assigned jobs**
4. Complete tasks with photos
5. Submit job

---

## 🎯 Files Changed

- `ADD_SITE_WORKER_AND_JOB_AUTO_CREATE.sql` ← **Run this!**
- `bookings.html` ← Enhanced with auto-job creation
- `jobs.html` ← Added deep-linking support
- `PHASE_3_AUTO_JOB_CREATION_COMPLETE.md` ← Full documentation

---

## 🐛 Common Issues

**"Job not assigned to worker"**
→ Site doesn't have `assigned_worker_id` set
→ Solution: Assign worker to site (see above)

**"Staff can't see job"**
→ Staff user ID doesn't match `assigned_worker_id`
→ Solution: Check assignments in Supabase

**"Tasks not created"**
→ No services selected in booking
→ Solution: Select at least 1 service when creating booking

---

## 📞 Need Help?

Check browser console for detailed logs:
- `✅ Job created: <job-id>`
- `✅ Booking created: <booking-id>`
- `✅ Tasks created from services: X`

All major operations are logged for easy debugging!

---

**That's it! You now have a complete bookings → jobs pipeline.** 🎉

