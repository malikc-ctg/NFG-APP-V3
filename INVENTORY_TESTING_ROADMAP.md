# 📋 Inventory Features - Complete Testing Roadmap

**Last Updated:** Phase 5 Completion (Job Integration)
**Purpose:** Comprehensive testing guide for all inventory features

---

## 🎯 Testing Overview

This roadmap covers all inventory features implemented:
- ✅ Job Integration (Phases 1-5)
- ✅ Cost Tracking & Valuation
- ✅ Inventory Transfers
- ✅ Low Stock Alerts
- ✅ PO Approval Workflow
- ✅ Advanced Features (Batch/Lot, Expiration, Locations)
- ✅ Barcode/QR Scanning
- ✅ Photo Uploads
- ✅ Mobile Scanner Integration

---

## 📦 Section 1: Job Integration Testing

### 1.1 Basic Job Linking (Phase 1)

#### Test Case 1.1.1: Job Selector in Stock Modal
**Steps:**
1. Navigate to Inventory page
2. Click "Manage Stock" on any item
3. Select action "Use" from dropdown
4. Verify job selector dropdown appears
5. Check that job selector shows active jobs for the selected site
6. Select a job from dropdown
7. Submit the stock transaction

**Expected:**
- ✅ Job selector appears when action = "use"
- ✅ Job selector hidden when action = "restock" or "adjustment"
- ✅ Only shows active jobs (pending/in-progress) for the site
- ✅ Includes "No Job / General Usage" option
- ✅ Transaction saves with job_id linked

**Edge Cases:**
- [ ] Site with no active jobs (should show "No active jobs" message)
- [ ] Selecting "No Job" option (job_id should be null)
- [ ] Job becomes inactive after modal opens (should still work)

---

#### Test Case 1.1.2: Job Selection Persistence
**Steps:**
1. Open stock modal with "use" action
2. Select a job
3. Change action to "restock"
4. Change action back to "use"
5. Verify job selection is cleared

**Expected:**
- ✅ Job selection clears when switching actions
- ✅ Job selector shows/hides correctly when toggling actions

---

### 1.2 Transaction History Enhancement (Phase 2)

#### Test Case 1.2.1: Job Column in History Table
**Steps:**
1. Navigate to Inventory → History tab
2. Find a transaction that was linked to a job
3. Verify "Job" column displays job title and type
4. Verify transactions without jobs show "—"

**Expected:**
- ✅ Job column appears in history table
- ✅ Job title and type displayed correctly
- ✅ Icon/badge shown for job status
- ✅ Empty state shows "—" for no job

**Edge Cases:**
- [ ] Job was deleted (should show "—" or "Deleted Job")
- [ ] Very long job title (should truncate properly)

---

#### Test Case 1.2.2: Job Filter in History
**Steps:**
1. Go to History tab
2. Find "Job" filter dropdown
3. Select "All Jobs" (should show all transactions)
4. Select a specific job (should filter to that job only)
5. Select "No Job" (should show only unlinked transactions)
6. Clear filters button resets job filter

**Expected:**
- ✅ Job filter dropdown populated with all jobs
- ✅ Filtering works correctly for each option
- ✅ Filter persists when using other filters (site, type, date)
- ✅ Clear filters resets job filter to "All Jobs"

**Edge Cases:**
- [ ] Filter by job with no transactions (should show empty state)
- [ ] Multiple filters combined (job + site + date range)

---

#### Test Case 1.2.3: CSV Export with Job Column
**Steps:**
1. Go to History tab
2. Apply job filter
3. Click "Export to CSV"
4. Open exported CSV file
5. Verify "Job" column exists
6. Verify job data is included correctly

**Expected:**
- ✅ CSV includes "Job" column
- ✅ Job titles exported correctly
- ✅ Empty jobs show blank or "—" in CSV

---

### 1.3 Job Context & Auto-Population (Phase 3)

#### Test Case 1.3.1: Job Context from Jobs Page
**Steps:**
1. Go to Jobs page
2. Open a job detail modal
3. Click "Use Materials" button
4. Verify navigation to Inventory page
5. Verify active job badge appears (top-right)
6. Open stock modal for any item
7. Verify job is auto-selected in dropdown
8. Verify action is set to "use"

**Expected:**
- ✅ Navigation to inventory page works
- ✅ Job badge appears showing job title
- ✅ Job auto-selected in stock modal
- ✅ Site matches context site
- ✅ Action automatically set to "use"

**Edge Cases:**
- [ ] Opening stock modal for different site (job shouldn't auto-select)
- [ ] Job becomes inactive (should still work)
- [ ] Multiple stock modals (context should persist)

---

#### Test Case 1.3.2: Active Job Badge
**Steps:**
1. Set job context (via "Use Materials" button)
2. Verify badge appears with job title
3. Click "X" button on badge
4. Verify badge disappears
5. Verify job selection cleared in modal (if open)

**Expected:**
- ✅ Badge appears after setting context
- ✅ Badge shows correct job title
- ✅ Badge can be dismissed
- ✅ Context clears when badge dismissed

---

#### Test Case 1.3.3: Context Clearing After Transaction
**Steps:**
1. Set job context
2. Open stock modal
3. Submit a stock transaction with job selected
4. Verify context clears automatically
5. Verify badge disappears
6. Open stock modal again - verify no job pre-selected

**Expected:**
- ✅ Context clears after successful transaction
- ✅ Badge disappears
- ✅ No auto-selection on next modal open

**Edge Cases:**
- [ ] Transaction fails (context should remain)
- [ ] Multiple transactions (context clears after first)

---

### 1.4 Job Cost Reports (Phase 4)

#### Test Case 1.4.1: Materials Used Section Display
**Steps:**
1. Go to Jobs page
2. Open a job that has materials used
3. Verify "Materials Used" section appears
4. Verify summary cards show correct data:
   - Items Used count
   - Total Quantity
   - Estimated Cost

**Expected:**
- ✅ Materials Used section visible in job modal
- ✅ Summary cards display correctly
- ✅ Costs formatted as currency
- ✅ All counts accurate

**Edge Cases:**
- [ ] Job with no materials (should show empty state)
- [ ] Very large costs (should format correctly)
- [ ] Zero costs (should show $0.00)

---

#### Test Case 1.4.2: Materials Detail Table
**Steps:**
1. Open job with materials used
2. Scroll to materials table
3. Verify table shows all material transactions:
   - Item name, unit, quantity
   - Unit cost, total cost
   - Usage date, user
   - Notes (if any)
   - Photos (if any)

**Expected:**
- ✅ All transactions displayed
- ✅ Costs calculated correctly
- ✅ Dates formatted properly
- ✅ User names shown correctly

**Edge Cases:**
- [ ] Transactions with photos (thumbnails display)
- [ ] Transactions with notes (notes display)
- [ ] Missing user profiles (should handle gracefully)

---

#### Test Case 1.4.3: Photo Viewing
**Steps:**
1. Open job with materials that have photos
2. Click on photo thumbnail
3. Verify full-size photo modal opens
4. Verify photo displays correctly
5. Click X or outside to close

**Expected:**
- ✅ Thumbnails show in table
- ✅ Click opens full-size modal
- ✅ Photo loads correctly
- ✅ Modal closes properly

---

#### Test Case 1.4.4: SQL View Fallback
**Steps:**
1. **Before running SQL:** Test materials loading
2. Verify fallback query works (direct from inventory_transactions)
3. Run `ADD_JOB_MATERIALS_VIEW.sql` in Supabase
4. Refresh page and verify view is used

**Expected:**
- ✅ Fallback works without SQL views
- ✅ Views work after SQL is run
- ✅ Data matches in both cases

---

### 1.5 Enhanced Features (Phase 5)

#### Test Case 1.5.1: CSV Export from Job Modal
**Steps:**
1. Open job with materials used
2. Click "Export" button in Materials Used section
3. Verify CSV downloads
4. Open CSV file
5. Verify all columns present:
   - Item Name, Unit, Quantity, Costs, Date, User, Notes
6. Verify summary totals row at bottom

**Expected:**
- ✅ CSV downloads successfully
- ✅ All columns included
- ✅ Data matches table
- ✅ Summary totals correct
- ✅ Filename includes job title and date

**Edge Cases:**
- [ ] Special characters in job title (filename sanitized)
- [ ] Very long notes (CSV escapes quotes)
- [ ] Empty materials (button disabled or shows warning)

---

#### Test Case 1.5.2: Cost Breakdown Chart
**Steps:**
1. Open job with multiple materials used
2. Scroll to cost breakdown chart
3. Verify chart displays top 10 items by cost
4. Verify bars show correct proportions
5. Verify item names and costs displayed

**Expected:**
- ✅ Chart appears above table
- ✅ Top 10 items shown
- ✅ Bars proportional to costs
- ✅ Costs formatted as currency
- ✅ Chart hidden when no materials

**Edge Cases:**
- [ ] Job with 1 item (chart still shows)
- [ ] Job with >10 items (only top 10 shown)
- [ ] Items with same cost (all shown)

---

#### Test Case 1.5.3: Chart Calculation Accuracy
**Steps:**
1. Open job with known material costs
2. Manually calculate total cost per item
3. Compare with chart display
4. Verify totals match table totals

**Expected:**
- ✅ Costs grouped correctly by item
- ✅ Totals match table data
- ✅ Chart sums multiple transactions for same item

---

## 💰 Section 2: Cost Tracking & Valuation Testing

### 2.1 Unit Cost Tracking

#### Test Case 2.1.1: Purchase Order Cost Update
**Steps:**
1. Create a Purchase Order with items
2. Receive the PO
3. Mark PO as "Received"
4. Verify unit_cost saved to site_inventory
5. Verify average_cost updated in inventory_items

**Expected:**
- ✅ Costs saved from PO to site_inventory
- ✅ Average cost calculated correctly
- ✅ Historical costs preserved

---

#### Test Case 2.1.2: Inventory Valuation Display
**Steps:**
1. Go to Inventory page
2. Check "Total Value" summary card
3. Verify it shows sum of (quantity × unit_cost) for all items
4. Check individual item "Unit Cost" column

**Expected:**
- ✅ Total value calculated correctly
- ✅ Unit cost shown per item
- ✅ Uses site-specific cost if available
- ✅ Falls back to item average cost

---

## 🔄 Section 3: Inventory Transfers Testing

### 3.1 Transfer Creation

#### Test Case 3.1.1: Create Transfer Request
**Steps:**
1. Go to Inventory → Transfers tab
2. Click "New Transfer Request"
3. Select from site and to site
4. Add items with quantities
5. Submit transfer request

**Expected:**
- ✅ Modal opens and is centered
- ✅ Site dropdowns populated
- ✅ Items can be added/removed
- ✅ Transfer number generated
- ✅ Status set to "pending"

**Edge Cases:**
- [ ] Same site selected (should show error)
- [ ] Quantity exceeds available stock (should warn)
- [ ] Empty items list (should prevent submission)

---

#### Test Case 3.1.2: Transfer Approval
**Steps:**
1. Create transfer request
2. As admin, view transfer details
3. Click "Approve Transfer"
4. Verify status changes to "approved"
5. Verify stock not yet moved

**Expected:**
- ✅ Admin can approve
- ✅ Staff cannot approve
- ✅ Status updates correctly
- ✅ Stock unchanged until completion

---

#### Test Case 3.1.3: Transfer Completion
**Steps:**
1. Create and approve transfer
2. Click "Complete Transfer"
3. Verify stock moved from source site
4. Verify stock added to destination site
5. Verify transfer status = "completed"

**Expected:**
- ✅ Stock quantities update correctly
- ✅ Transactions created for both sites
- ✅ Transfer cannot be completed twice
- ✅ Transfer number displayed

---

### 3.2 Transfer Viewing & Filtering

#### Test Case 3.2.1: Transfer List Display
**Steps:**
1. Go to Transfers tab
2. Verify transfers table shows:
   - Transfer number, status, sites, items count, date
3. Verify summary cards show correct counts

**Expected:**
- ✅ All transfers visible
- ✅ Status badges show correct colors
- ✅ Summary cards accurate
- ✅ Sorted by date (newest first)

---

#### Test Case 3.2.2: Transfer Filtering
**Steps:**
1. Go to Transfers tab
2. Use status filter dropdown
3. Verify only filtered transfers show
4. Clear filter

**Expected:**
- ✅ Filter works for each status
- ✅ "All" shows everything
- ✅ Filter persists during session

---

## 🚨 Section 4: Low Stock Alerts Testing

### 4.1 Alert Detection

#### Test Case 4.1.1: Low Stock Banner Display
**Steps:**
1. Create item with reorder_point = 10
2. Set quantity to 5 (below reorder point)
3. Refresh Inventory page
4. Verify low stock banner appears
5. Verify item appears in list

**Expected:**
- ✅ Banner appears when items below reorder point
- ✅ Shows count of low stock items
- ✅ List shows items with quantities
- ✅ Items sorted by urgency

**Edge Cases:**
- [ ] Multiple low stock items (all shown)
- [ ] Item at exactly reorder point (should not alert)
- [ ] Item with no reorder point (should not alert)

---

#### Test Case 4.1.2: Create PO from Low Stock
**Steps:**
1. View low stock banner
2. Click "Create PO for All Low Stock Items"
3. Verify PO modal opens
4. Verify all low stock items pre-populated
5. Complete PO creation

**Expected:**
- ✅ All low stock items added to PO
- ✅ Quantities set to reorder_quantity
- ✅ PO can be edited before submission
- ✅ Suppliers populated if available

---

### 4.2 Automated Alerts

#### Test Case 4.2.1: Email Notifications
**Steps:**
1. Configure Edge Function for email
2. Trigger low stock condition
3. Wait for scheduled check (or trigger manually)
4. Verify email sent to admins
5. Verify email contains item list

**Expected:**
- ✅ Email sent when items go low
- ✅ Email includes item names and sites
- ✅ Link to inventory page included
- ✅ Rate limiting prevents spam

**Note:** Requires Edge Function setup

---

## ✅ Section 5: PO Approval Workflow Testing

### 5.1 Approval Process

#### Test Case 5.1.1: PO Submission Status
**Steps:**
1. Create Purchase Order
2. Submit PO
3. Verify status = "pending_approval"
4. Verify PO not yet sent to supplier

**Expected:**
- ✅ PO starts as "pending_approval"
- ✅ Cannot be received until approved
- ✅ Approval section visible in PO detail

---

#### Test Case 5.1.2: PO Approval
**Steps:**
1. Create PO as staff user
2. Switch to admin account
3. View PO details
4. Click "Approve PO"
5. Verify status changes to "pending"
6. Verify approver and timestamp saved

**Expected:**
- ✅ Admin can approve
- ✅ Staff cannot approve
- ✅ Status updates correctly
- ✅ Approval details shown

**Edge Cases:**
- [ ] Admin tries to approve own PO (should work)
- [ ] PO already approved (button should be hidden)

---

#### Test Case 5.1.3: PO Rejection
**Steps:**
1. Create PO
2. As admin, view PO details
3. Click "Reject PO"
4. Enter rejection reason
5. Verify status = "rejected"
6. Verify reason displayed

**Expected:**
- ✅ Rejection modal appears
- ✅ Reason required
- ✅ Status updates correctly
- ✅ Rejection details shown
- ✅ PO cannot be approved after rejection

---

## 🔬 Section 6: Advanced Features Testing

### 6.1 Batch/Lot Tracking

#### Test Case 6.1.1: Add Item with Batch Info
**Steps:**
1. Go to Inventory → Add Item
2. Fill in basic item info
3. Expand "Advanced Features" section
4. Enter batch number, lot number, expiration date
5. Submit item

**Expected:**
- ✅ Advanced fields visible
- ✅ Batch data saves correctly
- ✅ Fields optional (can create without)

**Note:** Requires Phase 5 SQL (`ADD_ADVANCED_INVENTORY_FEATURES.sql`)

---

#### Test Case 6.1.2: Batch Tracking in Stock Management
**Steps:**
1. Add item with batch tracking enabled
2. Go to Manage Stock → Restock
3. Verify batch fields appear
4. Enter batch info and quantity
5. Submit

**Expected:**
- ✅ Batch fields show for restock
- ✅ Batch data saved with transaction
- ✅ Can view batch info in history

---

### 6.2 Expiration Date Tracking

#### Test Case 6.2.1: Expiring Items View
**Steps:**
1. Create items with expiration dates
2. Run SQL view `expiring_inventory`
3. Verify expiring items listed
4. Verify days until expiration calculated

**Expected:**
- ✅ Items expiring soon shown
- ✅ Days remaining accurate
- ✅ Sorted by expiration date

**Note:** Requires Phase 5 SQL

---

### 6.3 Warehouse/Bin Locations

#### Test Case 6.3.1: Location Assignment
**Steps:**
1. Create warehouse locations (via SQL)
2. Add item with warehouse/bin location
3. Manage stock and assign location
4. Verify location saved
5. View in inventory table

**Expected:**
- ✅ Locations can be selected
- ✅ Location data saves
- ✅ Location displayed in listings

**Note:** Requires Phase 5 SQL

---

## 📸 Section 7: Barcode/QR Scanning Testing

### 7.1 Scanner Initialization

#### Test Case 7.1.1: Scanner Tab Access
**Steps:**
1. Go to Inventory page
2. Click "Scanner" tab
3. Select a site from dropdown
4. Allow camera permissions
5. Verify camera feed appears

**Expected:**
- ✅ Scanner tab visible
- ✅ Site selector appears
- ✅ Camera requests permission
- ✅ Video feed displays
- ✅ Scanner starts automatically

**Edge Cases:**
- [ ] Camera permission denied (error shown)
- [ ] No camera available (error shown)
- [ ] Mobile vs desktop (different camera handling)

---

#### Test Case 7.1.2: Barcode Scanning
**Steps:**
1. Open scanner tab
2. Select site
3. Point camera at barcode (or use test page)
4. Verify scan detected
5. Verify item lookup works
6. Verify manage stock modal opens

**Expected:**
- ✅ Barcode scanned successfully
- ✅ Item found in database
- ✅ Modal opens with item pre-filled
- ✅ Action set to "use"
- ✅ Scanner stops while modal open

**Edge Cases:**
- [ ] Invalid barcode format (error shown)
- [ ] Item not found (create item prompt)
- [ ] Multiple quick scans (handles gracefully)

---

#### Test Case 7.1.3: Item Creation from Scan
**Steps:**
1. Scan unknown barcode
2. Verify "Create Item" modal appears
3. Fill in item details
4. Submit
5. Verify item created with barcode
6. Verify scanner resumes

**Expected:**
- ✅ Modal appears for unknown barcodes
- ✅ Barcode pre-filled
- ✅ Item created successfully
- ✅ Scanner resumes after creation
- ✅ Can then use item

---

#### Test Case 7.1.4: Manual Entry & File Upload
**Steps:**
1. Open scanner tab
2. Click "Manual Entry"
3. Enter barcode manually
4. Verify lookup works
5. Try "Upload" button
6. Select image with barcode
7. Verify scan from image

**Expected:**
- ✅ Manual entry works
- ✅ File upload works
- ✅ Scans from uploaded image
- ✅ Returns to camera after

---

### 7.2 Barcode Generation

#### Test Case 7.2.1: Generate Barcode for Item
**Steps:**
1. Go to Inventory
2. View item details
3. Generate barcode/QR code
4. Verify barcode saved to database
5. Verify QR code image uploaded to storage

**Expected:**
- ✅ Barcode generated
- ✅ QR code created
- ✅ Images uploaded to Supabase Storage
- ✅ Can scan generated codes

**Note:** Requires `inventory-assets` storage bucket

---

## 📷 Section 8: Photo Upload Testing

### 8.1 Photo Capture

#### Test Case 8.1.1: Take Photo in Stock Modal
**Steps:**
1. Open Manage Stock modal
2. Find "Photo Upload" section
3. Click "Take Photo"
4. Allow camera permission
5. Capture photo
6. Verify photo appears in gallery
7. Submit transaction
8. Verify photos saved

**Expected:**
- ✅ Camera modal opens
- ✅ Photo captured
- ✅ Photo compressed
- ✅ Thumbnail in gallery
- ✅ Photos uploaded to storage
- ✅ Photo URLs saved to transaction

**Edge Cases:**
- [ ] Camera permission denied (file upload fallback)
- [ ] Multiple photos (up to 5 limit)
- [ ] Large photos (compression works)

---

#### Test Case 8.1.2: Upload Photo from File
**Steps:**
1. Open Manage Stock modal
2. Click "Upload Photo"
3. Select image file
4. Verify photo added to gallery
5. Submit transaction

**Expected:**
- ✅ File picker opens
- ✅ Image selected
- ✅ Photo added to gallery
- ✅ Uploads on submit

---

#### Test Case 8.1.3: Photo Gallery Management
**Steps:**
1. Add multiple photos to gallery
2. Remove a photo (X button)
3. Verify photo removed
4. Verify can add more
5. Test max 5 photos limit

**Expected:**
- ✅ Can add multiple photos
- ✅ Can remove photos
- ✅ Max 5 photos enforced
- ✅ Gallery clears after submit

---

#### Test Case 8.1.4: View Photos in History
**Steps:**
1. Create transaction with photos
2. Go to History tab
3. Find transaction
4. Verify photo thumbnails visible
5. Click thumbnail
6. Verify full-size photo modal opens

**Expected:**
- ✅ Thumbnails show in history
- ✅ Click opens full-size view
- ✅ Multiple photos displayed
- ✅ Photos load from storage

---

## 🔄 Section 9: Integration Testing

### 9.1 Job + Scanner Integration

#### Test Case 9.1.1: Scan with Job Context
**Steps:**
1. Set job context (from jobs page)
2. Go to Inventory → Scanner
3. Select site matching job
4. Scan item
5. Verify job auto-selected in modal
6. Submit transaction
7. Verify job linked

**Expected:**
- ✅ Job context persists to scanner
- ✅ Job auto-selected after scan
- ✅ Transaction linked to job

---

#### Test Case 9.1.2: Scanner + Photo Upload
**Steps:**
1. Scan item
2. Add photos in stock modal
3. Submit transaction
4. Verify photos saved with job link
5. Verify photos visible in job materials

**Expected:**
- ✅ Photos work with scanned items
- ✅ Photos visible in job materials
- ✅ All data linked correctly

---

### 9.2 Multi-Feature Workflow

#### Test Case 9.2.1: Complete Job Materials Workflow
**Steps:**
1. Create job
2. Click "Use Materials" from job
3. Go to Inventory
4. Use scanner to scan item
5. Add photos
6. Link to job
7. Submit transaction
8. Return to job
9. Verify materials shown
10. Export to CSV
11. Verify all data correct

**Expected:**
- ✅ End-to-end workflow works
- ✅ All features integrate smoothly
- ✅ Data flows correctly
- ✅ Reports accurate

---

## 🐛 Section 10: Error Handling & Edge Cases

### 10.1 Database Errors

#### Test Case 10.1.1: RLS Policy Errors
**Steps:**
1. Test as different user roles (admin, staff, client)
2. Verify permissions work correctly
3. Verify unauthorized actions blocked

**Expected:**
- ✅ Staff can use materials but not manage suppliers
- ✅ Admin can approve POs
- ✅ RLS policies enforce correctly

---

#### Test Case 10.1.2: View Missing Errors
**Steps:**
1. Test without running SQL views
2. Verify fallback queries work
3. Run SQL views
4. Verify views used instead

**Expected:**
- ✅ Graceful fallback when views missing
- ✅ Views work when created
- ✅ No breaking errors

---

### 10.2 Network Errors

#### Test Case 10.2.1: Offline Handling
**Steps:**
1. Disconnect network
2. Try to use materials
3. Verify error message
4. Reconnect
5. Verify sync works

**Expected:**
- ✅ Offline errors handled gracefully
- ✅ User informed of issue
- ✅ Data syncs when online

---

## ✅ Section 11: Performance Testing

### 11.1 Large Dataset Performance

#### Test Case 11.1.1: History with Many Transactions
**Steps:**
1. Create 1000+ transactions
2. Load History tab
3. Verify loading time acceptable
4. Test filtering performance
5. Test CSV export performance

**Expected:**
- ✅ Page loads in <3 seconds
- ✅ Filtering responsive
- ✅ Export works with large datasets

---

#### Test Case 11.1.2: Job with Many Materials
**Steps:**
1. Create job with 100+ material transactions
2. Open job detail modal
3. Verify materials load
4. Verify chart renders
5. Test CSV export

**Expected:**
- ✅ Materials load quickly
- ✅ Chart renders smoothly
- ✅ Export completes successfully

---

## 📝 Section 12: UI/UX Testing

### 12.1 Mobile Responsiveness

#### Test Case 12.1.1: Mobile Scanner
**Steps:**
1. Open on mobile device
2. Test scanner tab
3. Verify camera works
4. Test photo capture
5. Verify modals display correctly

**Expected:**
- ✅ Mobile UI works well
- ✅ Touch interactions smooth
- ✅ Camera works on mobile
- ✅ Photos capture correctly

---

#### Test Case 12.1.2: Mobile Job Materials
**Steps:**
1. Open job on mobile
2. View materials section
3. Verify table scrolls
4. Test chart display
5. Test export button

**Expected:**
- ✅ Mobile-friendly layout
- ✅ Tables scrollable
- ✅ Charts readable
- ✅ Buttons accessible

---

### 12.2 Dark Mode

#### Test Case 12.2.1: Dark Mode Support
**Steps:**
1. Enable dark mode
2. Test all inventory pages
3. Verify all modals
4. Verify charts and tables
5. Verify badges and buttons

**Expected:**
- ✅ All pages support dark mode
- ✅ Contrast sufficient
- ✅ Colors readable
- ✅ Consistent styling

---

## 🎯 Testing Priority Matrix

### **Critical (Must Test Before Production)**
- ✅ Job linking works correctly
- ✅ Cost calculations accurate
- ✅ Transfer stock movements correct
- ✅ Low stock alerts trigger
- ✅ PO approval workflow
- ✅ Scanner basic functionality
- ✅ Photo uploads work

### **High Priority**
- ✅ Job context management
- ✅ CSV exports complete
- ✅ Charts render correctly
- ✅ History filtering works
- ✅ RLS permissions correct

### **Medium Priority**
- ✅ Advanced features (batch/lot)
- ✅ Mobile responsiveness
- ✅ Error handling
- ✅ Performance with large datasets

### **Low Priority**
- ✅ Dark mode styling
- ✅ Edge cases
- ✅ UI polish

---

## 📊 Test Results Template

```markdown
## Test Session: [Date]

### Environment
- Browser: 
- Device: 
- User Role: 
- Database: SQL views run [Y/N]

### Results Summary
- Total Tests: 
- Passed: 
- Failed: 
- Skipped: 

### Failed Tests
1. Test Case: [Name]
   - Issue: 
   - Steps to Reproduce: 
   - Expected: 
   - Actual: 

### Notes
- 
```

---

## 🚀 Quick Smoke Test (5 Minutes)

**Minimum viable testing before deployment:**

1. ✅ Create job, click "Use Materials", verify navigation
2. ✅ Scan item (or manual entry), verify modal opens
3. ✅ Add item to stock, link to job, submit
4. ✅ View job materials, verify data shown
5. ✅ Export CSV, verify file downloads
6. ✅ Check low stock alert appears (if applicable)
7. ✅ Create transfer, verify stock moves
8. ✅ Approve PO, verify status changes

**All passing? → Ready for production!**

---

## 📞 Issues to Watch For

### Common Issues
- [ ] SQL views not created (materials won't load)
- [ ] Storage bucket missing (QR codes won't upload)
- [ ] RLS policies too restrictive (data won't load)
- [ ] Camera permissions denied (scanner won't work)
- [ ] Job context not clearing (bad UX)
- [ ] Cost calculations incorrect (financial impact)

### Known Limitations
- Scanner requires HTTPS (or localhost)
- Some features require SQL views
- Photo uploads require storage bucket setup
- Email alerts require Edge Functions

---

**Last Updated:** Phase 5 Completion
**Next Review:** After production deployment

