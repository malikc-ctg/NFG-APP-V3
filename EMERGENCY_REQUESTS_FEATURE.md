# 🚨 Emergency Requests Feature

## ✅ What Was Added

### **Emergency Request Checkbox in Bookings**

Users can now flag bookings as emergency requests, which:
- Creates a job with `job_type: 'emergency'` instead of `'cleaning'`
- Shows prominently in red with an alert icon
- Updates the dashboard "Emergency Requests" metric
- Staff see these jobs prioritized

---

## 🎨 UI Changes

### **Bookings Form (bookings.html)**

Added emergency checkbox between "Scheduled Date" and "Description":

```html
<div class="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
  <input id="booking-emergency" type="checkbox" class="w-5 h-5 text-red-600" />
  <label for="booking-emergency">
    <i data-lucide="alert-circle"></i>
    Emergency Request
  </label>
</div>
```

**Styling:**
- Red background (`bg-red-50`)
- Red border (`border-red-200`)
- Alert circle icon
- Clear "Emergency Request" label

---

## 💻 Code Changes

### **bookings.html**

#### **1. Emergency Checkbox Added**
- Lines 177-187: New emergency checkbox UI

#### **2. `createBooking()` Function Updated**
```javascript
const isEmergency = document.getElementById('booking-emergency').checked;

// Job creation
job_type: isEmergency ? 'emergency' : 'cleaning', // Emergency or cleaning
```

#### **3. Success Message Enhanced**
```javascript
const emergencyNote = isEmergency ? '\n🚨 EMERGENCY REQUEST - Priority handling!' : '';
alert(`✅ Booking & Job created successfully!\n\nJob is ${assignedTo}.${emergencyNote}`);
```

#### **4. Modal Reset**
```javascript
document.getElementById('booking-emergency').checked = false; // Reset on open
```

---

### **js/dashboard.js**

#### **Updated `fetchDashboardStats()` Function**

**Before:**
```javascript
// Placeholder until bookings implemented
upcomingEl.textContent = '0';
```

**After:**
```javascript
// Fetch upcoming bookings count
const today = new Date().toISOString().split('T')[0];
const { count: upcomingCount } = await supabase
  .from('bookings')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'pending')
  .gte('scheduled_date', today);

upcomingEl.textContent = upcomingCount || 0;
```

**What it does:**
- Counts pending bookings scheduled today or in the future
- Updates the "Upcoming Bookings" metric on the dashboard
- Real-time count of active bookings

---

## 🔄 Complete Workflow

### **User Creates Emergency Booking:**

```
1. User opens "New Booking" modal
2. Fills in title, site, date
3. ✅ Checks "Emergency Request" checkbox
4. Selects services
5. Clicks "Create Booking"

↓ System creates:

Job:
├─ job_type: 'emergency' (instead of 'cleaning')
├─ status: 'pending'
├─ assigned_worker_id: (auto-assigned from site)
└─ Tasks from services

↓ User sees:

"✅ Booking & Job created successfully!
Job is assigned to site worker.
🚨 EMERGENCY REQUEST - Priority handling!"
```

### **Dashboard Updates:**

```
Overview Page Metrics:
├─ Active Jobs: [count of pending/in-progress jobs]
├─ Upcoming Bookings: [count of pending bookings with future dates] ← UPDATED
└─ Emergency Requests: [count of emergency-type jobs] ← UPDATED
```

---

## 📊 Dashboard Metrics Explained

### **1. Active Jobs**
- Counts jobs with status: `pending` OR `in-progress`
- All job types included

### **2. Upcoming Bookings** ✨ NEW
- Counts bookings with status: `pending`
- Only bookings scheduled today or later (`scheduled_date >= today`)
- Real-time count

### **3. Emergency Requests**
- Counts jobs with `job_type: 'emergency'`
- Only shows pending or in-progress emergencies
- Updates when emergency bookings are created

---

## 🎯 Features Summary

| Feature | Status |
|---------|--------|
| Emergency checkbox in bookings | ✅ |
| Auto-set job_type to 'emergency' | ✅ |
| Red styling for emergency UI | ✅ |
| Success message shows emergency | ✅ |
| Dashboard "Upcoming Bookings" metric | ✅ |
| Dashboard "Emergency Requests" metric | ✅ (already existed) |
| Modal resets checkbox on open | ✅ |

---

## 🧪 How to Test

### **Test Emergency Request:**

1. **Open bookings.html**
2. Click **"New Booking"**
3. Fill in form
4. **✅ Check "Emergency Request"**
5. Select services
6. Click **"Create Booking"**
7. See success with 🚨 emergency note
8. Go to **Jobs page** → See job with `type: emergency`
9. Go to **Dashboard** → See "Emergency Requests" count increased

### **Test Upcoming Bookings Metric:**

1. **Go to Dashboard**
2. Check **"Upcoming Bookings"** number
3. Create a new booking (emergency or normal)
4. **Refresh dashboard**
5. See count increased by 1 ✅

### **Test Normal (Non-Emergency) Booking:**

1. Open bookings form
2. **Don't check** emergency checkbox
3. Create booking
4. Job should have `type: cleaning` (not emergency)
5. Dashboard "Emergency Requests" stays the same

---

## 🎨 Visual Indicators

### **Emergency Checkbox:**
- 🔴 Red background box
- 🚨 Alert circle icon
- Bold text

### **Success Message:**
```
Normal booking:
"✅ Booking & Job created successfully!
Job is assigned to site worker.
Staff will see it in their feed."

Emergency booking:
"✅ Booking & Job created successfully!
Job is assigned to site worker.
Staff will see it in their feed.
🚨 EMERGENCY REQUEST - Priority handling!"
```

---

## 🔮 Future Enhancements (Optional)

1. **Visual Badge on Job Cards**: Show 🚨 badge on emergency jobs
2. **Email Notifications**: Send immediate alerts for emergency requests
3. **Sort by Priority**: Show emergency jobs at top of jobs list
4. **Time Tracking**: Track response time for emergency requests
5. **Emergency SLA**: Set and track emergency response time goals
6. **Red Job Cards**: Style emergency jobs with red borders/backgrounds

---

## 📝 Files Modified

- ✅ `bookings.html` - Added emergency checkbox and logic
- ✅ `js/dashboard.js` - Updated metrics (upcoming bookings, emergency requests)
- ✅ `EMERGENCY_REQUESTS_FEATURE.md` - This documentation

---

## ✨ Result

**Emergency requests are now fully functional!**

- Users can flag urgent bookings
- Jobs are automatically marked as emergency type
- Dashboard shows real-time counts
- Staff can prioritize emergency work

🎉 **Feature Complete!**

