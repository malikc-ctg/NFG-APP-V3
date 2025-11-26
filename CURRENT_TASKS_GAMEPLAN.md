# 🎯 Current Tasks & Gameplan

**Last Updated:** 2025-01-23  
**Status:** Messages fixed, ready for next phase

---

## ✅ **Recently Completed**
- ✅ Messages loading issue (fixed)
- ✅ CSV Import - Phase 1.1: Sites Import (working)
- ✅ Production cleanup (debug logs removed)

---

## 🔥 **Immediate Next Tasks** (Priority Order)

### **1. Improve Employee View** (High Priority)
**Status:** Gameplan ready, not started  
**Why:** You explicitly requested this before messages fix  
**Estimated Time:** 4-5 hours

**Gameplan:** `IMPROVE_EMPLOYEE_VIEW_GAMEPLAN.md`

**Phases:**
1. **Phase 1:** Enhanced Information Display (stats, phone, better cards) - 1.5 hours
2. **Phase 2:** Search & Filter (search bar, filters, sort) - 1.5 hours
3. **Phase 3:** Quick Actions (assign site, change role buttons) - 1 hour
4. **Phase 4:** Visual Polish (better layout, hover effects) - 30 min
5. **Phase 5:** Advanced Features (if time permits) - 1 hour

**Files to Modify:**
- `settings.html` - Add search/filter UI, stats header
- `js/user-management.js` - Enhance cards, add filtering logic

---

### **2. CSV Import - Phase 1.2: Users/Workers Import** (High Priority)
**Status:** Phase 1.1 (Sites) complete, ready for next phase  
**Why:** Critical for client onboarding  
**Estimated Time:** 3-4 hours

**Gameplan:** `CSV_IMPORT_GAMEPLAN.md` (Phase 1.2 section)

**Tasks:**
1. Extend import modal for users/workers
2. Add user validation logic (email uniqueness, role validation)
3. Handle duplicate email detection (skip or update option)
4. Add auto-invite option (optional - send invitation emails)
5. Create user template CSV
6. Test with various user data formats

**Files to Modify:**
- `js/csv-import.js` - Add user import logic
- `settings.html` - Enable "Users/Workers" option in import modal

---

### **3. CSV Import - Phase 1.3: Jobs Import** (Medium Priority)
**Status:** Not started  
**Why:** Historical job data important for clients  
**Estimated Time:** 4-5 hours

**Tasks:**
1. Extend import modal for jobs
2. Add site lookup/matching (fuzzy match by site name)
3. Add worker lookup/matching (by email)
4. Handle date parsing (multiple formats: YYYY-MM-DD, MM/DD/YYYY, etc.)
5. Add status validation
6. Create jobs template CSV

**Special Handling:**
- Site matching (if site doesn't exist, offer to create it)
- Worker matching (if worker doesn't exist, offer to create user)
- Date format auto-detection

---

### **4. CSV Import - Phase 1.4: Bookings Import** (Medium Priority)
**Status:** Not started  
**Why:** Future scheduled work migration  
**Estimated Time:** 3-4 hours

**Tasks:**
1. Extend import modal for bookings
2. Add service catalog matching
3. Handle service selection
4. Create bookings template CSV

---

## 🟡 **Medium Priority Tasks**

### **5. Inventory Alerts** (Low Effort, High Value)
**Status:** Not started  
**Why:** Operational efficiency - prevent stockouts  
**Estimated Time:** 2-3 hours

**Tasks:**
1. Add `low_stock_threshold` column to inventory items
2. Add alert logic in `js/inventory.js`
3. Add visual indicators (red badges) on inventory page
4. Add low stock notifications (optional)
5. Add alert history tracking

**Files to Modify:**
- `js/inventory.js` - Add alert checking and display
- `inventory.html` - Add alert UI (badges, warnings)
- Database: Add `low_stock_threshold` column

---

### **6. Bulk Operations** (Time Saver)
**Status:** 10% complete (only time entries have bulk approve)  
**Why:** Save time on repetitive tasks  
**Estimated Time:** 4-6 hours

**Gameplan:** `BULK_OPERATIONS_GAMEPLAN.md`

**Tasks:**
1. Bulk select UI (checkboxes on list items)
2. Bulk actions menu (approve, delete, assign, etc.)
3. Bulk operations for:
   - Jobs (bulk assign, bulk status change, bulk delete)
   - Sites (bulk assign workers, bulk archive)
   - Users (bulk role change, bulk invite)
   - Time entries (already done)

---

### **7. Photo Management Enhancements** (UX Improvement)
**Status:** 40% complete (basic upload only)  
**Why:** Better job documentation  
**Estimated Time:** 3-4 hours

**Tasks:**
1. Photo gallery for jobs (grid view, lightbox)
2. Photo approval workflow (optional)
3. Before/after comparisons
4. Photo notes/captions
5. Bulk photo upload

**Files to Modify:**
- `js/jobs.js` - Add photo gallery logic
- `jobs.html` - Add photo gallery UI

---

## 🔴 **High Priority Missing Features** (Future)

### **8. Billing & Invoicing System** (Revenue Feature)
**Status:** 0% complete  
**Why:** Critical revenue feature  
**Estimated Time:** 2-3 weeks

**Gameplan:** `BILLING_INVOICING_GAMEPLAN.md`

**Missing:**
- Invoice generation from jobs/bookings
- Invoice templates
- PDF export
- Payment tracking
- Client billing history
- Expense tracking
- Payment reminders
- Recurring billing

---

### **9. Client Portal** (Differentiator)
**Status:** 0% complete  
**Why:** Competitive advantage  
**Estimated Time:** 2-3 weeks

**Missing:**
- Client dashboard
- Client job requests
- Client job history view
- Client communication portal
- Client invoice viewing
- Client photo viewing

---

## 📋 **Recommended Implementation Order**

### **This Week:**
1. ✅ **Improve Employee View** (Phase 1-2) - 3 hours
2. ✅ **CSV Import - Users/Workers** (Phase 1.2) - 3-4 hours

### **Next Week:**
3. ✅ **CSV Import - Jobs** (Phase 1.3) - 4-5 hours
4. ✅ **Inventory Alerts** - 2-3 hours

### **Following Weeks:**
5. ✅ **CSV Import - Bookings** (Phase 1.4) - 3-4 hours
6. ✅ **Bulk Operations** - 4-6 hours
7. ✅ **Photo Management Enhancements** - 3-4 hours

### **Future (Major Features):**
8. ✅ **Billing & Invoicing** - 2-3 weeks
9. ✅ **Client Portal** - 2-3 weeks

---

## 🎯 **Quick Wins** (Low Effort, High Value)

1. **Better Error Messages** - 1 hour
   - User-friendly error dialogs
   - Better validation messages

2. **Export Functionality** - 2-3 hours
   - Export jobs to CSV
   - Export reports to PDF/CSV
   - Export sites list

3. **Keyboard Shortcuts** - 2-3 hours
   - Quick navigation (Cmd+K for search)
   - Quick actions (Cmd+N for new job)
   - Shortcuts help modal

4. **Loading States** - 1-2 hours
   - Skeleton screens
   - Better loading indicators
   - Progress bars for long operations

---

## 📊 **Current Status Summary**

### ✅ **Complete:**
- Core messaging (direct, reactions, replies, groups)
- CSV Import - Sites
- User management & authentication
- Jobs management
- Bookings system
- Sites management
- Basic inventory tracking
- Time tracking
- Reports (basic)
- Notifications (email, push, in-app)
- PWA features

### 🚧 **In Progress / Next:**
- Employee view improvements (gameplan ready)
- CSV Import - Users/Workers (next phase)
- CSV Import - Jobs (planned)

### ❌ **Missing:**
- Billing & invoicing (0%)
- Client portal (0%)
- Inventory alerts (0%)
- Bulk operations (10%)
- Advanced reports (30%)
- Photo management enhancements (40%)

---

## 💡 **Recommendation**

**Start with:** **Improve Employee View** (you requested this before)

**Then:** **CSV Import - Users/Workers** (logical next step after sites)

**Why this order:**
1. Employee view is quick win (4-5 hours)
2. Improves daily workflow immediately
3. CSV Users import builds on existing CSV infrastructure
4. Both are high value, medium effort

---

**Ready to start?** Let me know which task you want to tackle first! 🚀

