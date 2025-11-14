# 📦 Inventory Stock Alerts Setup Guide

## Overview
Automatic notifications are sent to admins when inventory items fall below their low stock threshold.

---

## ✅ What's Already Working

1. **Visual Alerts on Inventory Page**
   - Low stock banner at the top of the page
   - Summary cards showing low stock counts
   - Color-coded status badges in the inventory table

2. **Notification System Integration**
   - Low stock notifications appear in the notification center (bell icon)
   - Real-time updates when stock levels drop
   - Clicking a notification navigates to the inventory page

---

## 🚀 Enable Automatic Notifications

### Step 1: Run the SQL Trigger
The database trigger creates notifications automatically when inventory drops below threshold.

**Option A: Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `ADD_INVENTORY_LOW_STOCK_NOTIFICATIONS.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**

**Option B: Command Line**
```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 2: Verify Trigger is Active
Run this query in SQL Editor to check:
```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_low_stock_notification';
```

If you see a result, the trigger is active! ✅

---

## 🔔 How It Works

### Automatic Notifications
- **Triggers when**: Inventory quantity drops **below** the `low_stock_threshold`
- **Who gets notified**: All active admin, client, and super_admin users
- **When**: Only triggers when crossing the threshold (not on every update)
  - If stock goes from 10 → 5 (threshold is 5), notification is sent
  - If stock goes from 4 → 3 (already below threshold), no new notification

### Visual Indicators
- **Out of Stock** (quantity = 0): Red badge
- **Low Stock** (quantity < threshold): Orange badge
- **Warning** (quantity < threshold × 2): Yellow indicator
- **OK** (quantity >= threshold × 2): Green/normal

### Notification Details
Each notification includes:
- Item name
- Site name
- Current quantity
- Threshold value
- Unit of measurement
- Link to inventory page

---

## 📊 Testing the Alerts

### Test Low Stock Notification
1. Go to **Inventory** page
2. Click on an item with quantity above threshold
3. Click **Manage Stock**
4. Reduce quantity to below the threshold
5. Save
6. Check notification bell - you should see a new notification! 🔔

### Verify on Inventory Page
- Low stock banner should appear at the top
- Summary cards should update
- Item should show orange/red badge in table

---

## 🎯 Notification Center Features

### Real-Time Updates
- Notifications appear immediately when stock drops
- No page refresh needed
- Badge count updates automatically

### Click to Navigate
- Click any low stock notification
- Automatically navigates to inventory page
- Item is highlighted in the table

### Mark as Read
- Click notification to mark as read
- Use "Mark all read" button in notification center
- Badge count updates automatically

---

## ⚙️ Configuration

### Set Low Stock Threshold
1. Go to **Inventory** page
2. Click **Add Item** or edit existing item
3. Set **Low Stock Threshold** (default: 5)
4. Save

### Per-Item Threshold
Each inventory item can have its own threshold:
- Cleaning supplies: Threshold of 10
- Emergency items: Threshold of 20
- Custom thresholds per item

---

## 🔧 Troubleshooting

### Notifications Not Appearing
1. **Check if trigger is enabled** (see Step 2 above)
2. **Verify user role**: Only admins/clients get notifications
3. **Check threshold**: Item must have a threshold set
4. **Verify stock level**: Must cross threshold (not already below)

### Visual Alerts Not Showing
1. **Refresh inventory page** after updating stock
2. **Check browser console** for errors
3. **Verify inventory data** is loading correctly

### Notification Center Not Working
1. **Check browser console** for errors
2. **Verify Supabase connection** is active
3. **Check real-time subscription** in console logs

---

## 📝 SQL Files Reference

- **`ADD_INVENTORY_LOW_STOCK_NOTIFICATIONS.sql`**: Creates trigger and function
- **`SETUP_INVENTORY_*.sql`**: Creates inventory tables and views (if needed)

---

## ✅ Checklist

- [ ] SQL trigger has been run
- [ ] Trigger verified in database
- [ ] Tested reducing stock below threshold
- [ ] Notifications appear in notification center
- [ ] Clicking notification navigates to inventory page
- [ ] Visual alerts show on inventory page

---

**Status**: Ready to use once SQL trigger is enabled! 🎉

