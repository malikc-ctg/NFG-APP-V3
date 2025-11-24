# 🔔 Phase 3: Automated Low Stock Alerts - Implementation Plan

## 🎯 Goal
Proactive inventory management with automated low stock detection and notifications.

---

## ✅ What Already Exists

### Visual Indicators ✅
- Low stock status badges in inventory table
- Low stock alerts banner on inventory page
- Stock status calculation (out, low, warning, ok)
- Summary cards showing low stock count

---

## ❌ What Needs to Be Added

### **Phase 3.1: Automated Low Stock Detection** (HIGH PRIORITY)
**Status:** Pending  
**Value:** Proactive detection without manual checking

#### Features:
- [ ] `checkLowStock()` function - Detects low stock items
- [ ] Scheduled checks (run every X hours/minutes)
- [ ] Store last check timestamp
- [ ] Track which items were already alerted

**Files to Modify:**
- `js/inventory.js` - Add checkLowStock() function

---

### **Phase 3.2: "Create PO from Low Stock" Button** (HIGH PRIORITY)
**Status:** Pending  
**Value:** Quick action to restock

#### Features:
- [ ] Button on low stock items
- [ ] Button in low stock alerts banner
- [ ] Pre-populate PO with low stock items
- [ ] Suggest reorder quantities

**Files to Modify:**
- `js/inventory.js` - Add createPOFromLowStock() function
- `inventory.html` - Add button to low stock items and banner

---

### **Phase 3.3: Low Stock Notifications** (MEDIUM PRIORITY)
**Status:** Pending  
**Value:** Alert users proactively

#### Features:
- [ ] Email notifications for admins/managers
- [ ] Push notifications (in-app)
- [ ] Notification preferences (per user)
- [ ] Daily digest option

**Files to Modify:**
- `js/inventory.js` - Add notification triggers
- `js/notifications.js` - Add low stock notification type
- `js/notification-triggers.js` - Add low stock notification function

---

### **Phase 3.4: Low Stock Dashboard Widget** (LOW PRIORITY)
**Status:** Pending  
**Value:** Visibility on dashboard

#### Features:
- [ ] Widget showing low stock items
- [ ] Quick view of critical items
- [ ] Link to inventory page

**Files to Modify:**
- `dashboard.html` - Add low stock widget
- `js/dashboard.js` - Fetch and display low stock items

---

## 📋 Implementation Checklist

### **Step 1: Automated Detection** (1-2 hours)
- [ ] Create `checkLowStock()` function
- [ ] Add scheduled check (every 6 hours)
- [ ] Track alerted items (prevent spam)

### **Step 2: Create PO Button** (1 hour)
- [ ] Add button to low stock items in table
- [ ] Add "Create PO" button to alerts banner
- [ ] Implement `createPOFromLowStock()` function
- [ ] Pre-populate PO modal with low stock items

### **Step 3: Notifications** (2-3 hours)
- [ ] Create low stock notification function
- [ ] Add email notification (Edge Function)
- [ ] Add push notification
- [ ] Test notification flow

### **Step 4: Dashboard Widget** (1 hour)
- [ ] Add widget to dashboard
- [ ] Fetch low stock items
- [ ] Display top 5 low stock items

---

## 🎨 UI Design

### **Low Stock Item Actions:**
```
[Item Name] [Quantity] [Status: Low] [Manage] [Create PO] [History]
```

### **Low Stock Banner Enhancement:**
```
⚠️ Low Stock Alert - 5 items need restocking
[Item 1] [Item 2] [Item 3] ... [+2 more]
[Create PO for All Low Stock Items]
```

### **Dashboard Widget:**
```
┌─────────────────────────────┐
│ Low Stock Items             │
├─────────────────────────────┤
│ 📦 Item 1 - Site A (2 left) │
│ 📦 Item 2 - Site B (0 left) │
│ 📦 Item 3 - Site A (3 left) │
│                             │
│ [View All →]                │
└─────────────────────────────┘
```

---

## 🚀 Quick Wins (Do First)

1. **"Create PO from Low Stock" Button** (30 min)
   - Most valuable feature
   - Easy to implement
   - Immediate value

2. **Automated Detection Function** (1 hour)
   - Foundation for notifications
   - Can run on page load

3. **Low Stock Notifications** (2 hours)
   - Complete the automation
   - Proactive alerts

---

## ✅ Success Criteria

- [ ] Low stock items automatically detected
- [ ] Users can create PO with one click from low stock items
- [ ] Admins receive notifications about low stock
- [ ] Dashboard shows low stock overview
- [ ] No duplicate notifications for same items

---

**Ready to start!** Let's begin with the "Create PO from Low Stock" button - it's the quickest win! 🚀

