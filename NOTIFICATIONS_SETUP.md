# 🔔 NFG Notifications System - Setup Guide

## ✅ What's Been Implemented

### 1. Database Schema
- ✅ `notifications` table - Stores all user notifications
- ✅ `notification_preferences` table - User preferences for notification types
- ✅ RLS policies for security
- ✅ Helper functions for common operations

### 2. Notification Center UI
- ✅ Bell icon with unread badge in header
- ✅ Dropdown notification center
- ✅ Notification list with icons
- ✅ Mark as read/unread functionality
- ✅ Dark mode support
- ✅ Mobile responsive

### 3. JavaScript Module
- ✅ Real-time updates via Supabase Realtime
- ✅ Polling fallback (every 30 seconds)
- ✅ Auto-refresh unread count
- ✅ Click to navigate to relevant pages

### 4. Notification Triggers
- ✅ Job assigned notifications
- ✅ Job completed notifications
- ✅ Job updated notifications
- ✅ Booking created notifications
- ✅ Booking cancelled notifications

---

## 🚀 Setup Steps

### Step 1: Run SQL Script
1. Open **Supabase SQL Editor**
2. Run `SETUP_NOTIFICATIONS_SYSTEM.sql`
3. Wait for confirmation: `✅ Notifications System Setup Complete!`

### Step 2: Add to Pages (Already done for dashboard.html)

For other pages, add these two lines:

**In `<head>` section:**
```html
<!-- Notification Center -->
<link rel="stylesheet" href="./css/notification-center.css">
```

**Before `</body>`:**
```html
<script type="module" src="./js/notification-center.js"></script>
```

**Pages that need it:**
- ✅ `dashboard.html` (DONE)
- ⏳ `sites.html`
- ⏳ `jobs.html`
- ⏳ `bookings.html`
- ⏳ `reports.html`
- ⏳ `settings.html`
- ⏳ `inventory.html`

---

## 📝 Usage Examples

### Create a Notification Manually

```javascript
import { createNotification } from './js/notification-center.js';

// Create a notification
await createNotification(
  userId,           // User to notify
  'job_assigned',   // Type
  'New Job',        // Title
  'You have a new job assigned', // Message
  'jobs.html#job-123', // Link (optional)
  { job_id: '123' }    // Metadata (optional)
);
```

### Using Notification Triggers

```javascript
import { notifyJobAssigned } from './js/notification-triggers.js';

// When assigning a job to a worker
await notifyJobAssigned(jobId, workerId, jobTitle, siteName);
```

---

## 🎯 Integration Points

### Jobs Page
Add notifications when:
- Job is assigned to worker → `notifyJobAssigned()`
- Job is completed → `notifyJobCompleted()`
- Job status changes → `notifyJobUpdated()`

### Bookings Page
Add notifications when:
- Booking is created → `notifyBookingCreated()`
- Booking is cancelled → `notifyBookingCancelled()`

### Settings Page
Add notification preferences UI (future enhancement)

---

## 🔧 Customization

### Notification Types
Available types in `notification-center.js`:
- `job_assigned`
- `job_completed`
- `job_updated`
- `booking_created`
- `booking_updated`
- `booking_cancelled`
- `mention`
- `system`

### Icons
Icons are defined in `NOTIFICATION_TYPE_ICONS` in `notification-center.js`

### Styling
All styles are in `css/notification-center.css`

---

## 🐛 Troubleshooting

### Notifications not showing?
1. Check browser console for errors
2. Verify SQL script was run successfully
3. Check RLS policies allow access
4. Verify user is authenticated

### Real-time not working?
- Real-time requires Supabase Realtime to be enabled
- Falls back to polling every 30 seconds automatically
- Check Supabase dashboard → Database → Replication

### Badge not updating?
- Check browser console for errors
- Verify `updateUnreadCount()` is being called
- Check network tab for API calls

---

## 📱 Future Enhancements

- [ ] Push notifications (PWA)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Notification preferences UI
- [ ] Full notifications page
- [ ] Sound alerts
- [ ] Desktop notifications

---

## 🎉 You're Ready!

After running the SQL script, the notification center will appear in the header on pages where it's been added. Users will see:
- Bell icon with unread count badge
- Click to view notifications
- Real-time updates
- Click notifications to navigate

