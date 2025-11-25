# 📋 Inventory-Job Integration & Mobile On-Site Updates
## Gameplan for Two Major Features

**Last Updated:** Current Date

---

## 🎯 **Feature 1: Inventory-Job Integration**

### **Overview**
Link inventory usage directly to jobs/tasks, allowing you to track which materials were used for which jobs, calculate job costs, and maintain accurate inventory records tied to work performed.

---

### **Phase 1.1: Database Schema Updates**

#### **New Tables/Fields:**

1. **`job_inventory_usage` Table**
   ```sql
   - id (BIGSERIAL PRIMARY KEY)
   - job_id (UUID REFERENCES jobs(id))
   - item_id (BIGINT REFERENCES inventory_items(id))
   - site_id (BIGINT REFERENCES sites(id))
   - quantity_used (INTEGER NOT NULL)
   - unit_cost (DECIMAL) -- Snapshot of cost at time of use
   - notes (TEXT)
   - used_by (UUID REFERENCES auth.users(id)) -- Worker who used it
   - used_at (TIMESTAMPTZ DEFAULT NOW())
   - photos (TEXT[]) -- Array of photo URLs
   - created_at (TIMESTAMPTZ DEFAULT NOW())
   ```

2. **Update `inventory_transactions` Table**
   - Add `job_id` field (UUID, nullable)
   - Add `usage_type` field ('job_usage', 'restock', 'adjustment', etc.)

3. **Update `jobs` Table** (if not exists)
   - Add `total_material_cost` (DECIMAL) -- Calculated field
   - Add `materials_used_count` (INTEGER) -- Count of items used

#### **Views:**
- `job_material_costs` - Summary of material costs per job
- `inventory_job_history` - Which jobs used which items
- `job_inventory_summary` - Quick view of materials used per job

---

### **Phase 1.2: Job Detail Integration**

#### **UI Changes:**
1. **Job Detail Modal/Page**
   - Add "Materials Used" section
   - Show list of items used with quantities and costs
   - Add "Add Material" button
   - Display total material cost for job
   - Show photos of materials used (if available)

2. **Inventory Usage Form**
   - Item selector (filtered by site)
   - Quantity input
   - Cost display (auto-filled from current cost)
   - Notes field
   - Photo upload (multiple)
   - "Mark as Used" button

3. **Job List/Table**
   - Add "Material Cost" column
   - Show material cost badge/indicator
   - Filter by jobs with/without materials

---

### **Phase 1.3: Inventory Side Integration**

#### **UI Changes:**
1. **Inventory Item Detail**
   - Add "Job History" tab/section
   - Show which jobs used this item
   - Display usage dates and quantities
   - Link to job details

2. **Inventory Transactions**
   - Filter by job
   - Show job link in transaction history
   - Group transactions by job

3. **Inventory Usage Report**
   - New report showing item usage by job
   - Cost analysis per job
   - Usage trends

---

### **Phase 1.4: Workflow Integration**

#### **Functionality:**
1. **When Material is Used:**
   - Create `job_inventory_usage` record
   - Create `inventory_transaction` with `job_id`
   - Update `site_inventory` quantity (deduct)
   - Update job's `total_material_cost`
   - Send notification to job creator/manager

2. **Job Completion:**
   - Show final material cost summary
   - Include in job reports
   - Calculate job profitability (if labor costs tracked)

3. **Job Cancellation:**
   - Option to return materials to inventory
   - Create return transaction

---

### **Phase 1.5: Reporting & Analytics**

#### **New Reports:**
1. **Job Material Costs Report**
   - Total material costs per job
   - Average material cost per job type
   - Material cost trends over time

2. **Item Usage by Job Type**
   - Which items used most for cleaning jobs
   - Which items used most for maintenance jobs
   - Usage patterns

3. **Job Profitability** (if labor tracked)
   - Revenue vs. (Labor + Materials)
   - Material cost percentage

---

### **Files to Create/Modify:**

**SQL:**
- `ADD_JOB_INVENTORY_INTEGRATION.sql` - Schema changes
- `ADD_JOB_INVENTORY_VIEWS.sql` - Views and reports

**JavaScript:**
- `js/inventory.js` - Add job usage functions
- `js/jobs.js` - Add material usage UI and functions
- `js/job-inventory.js` - New file for job-inventory integration

**HTML:**
- `jobs.html` - Add materials section to job detail
- `inventory.html` - Add job history to item detail

---

## 📱 **Feature 2: Mobile On-Site Updates**

### **Overview**
Enable field workers to scan inventory items, mark usage, upload photos, and update inventory directly from their mobile devices while on-site.

---

### **Phase 2.1: Barcode/QR Code System**

#### **Database Updates:**
1. **Update `inventory_items` Table**
   - Add `barcode` field (VARCHAR, unique, nullable)
   - Add `qr_code_data` field (TEXT) -- JSON data for QR codes
   - Add `barcode_type` field ('EAN13', 'CODE128', 'QR', etc.)

2. **Barcode Generation**
   - Auto-generate barcodes for new items
   - Generate QR codes with item data (item_id, name, site_id)
   - Store barcode images in Supabase Storage

#### **Libraries Needed:**
- **Barcode Scanner:** `@zxing/library` or `html5-qrcode`
- **Barcode Generator:** `jsbarcode` or `qrcode.js`
- **Camera Access:** Browser MediaDevices API

---

### **Phase 2.2: Mobile-Optimized UI**

#### **New Mobile Pages/Views:**

1. **Mobile Inventory Scanner Page** (`mobile-inventory.html`)
   - Full-screen camera view
   - Scan button overlay
   - Item details popup after scan
   - Quick actions (Use, Restock, View Details)

2. **Mobile Usage Form** (Modal/Page)
   - Item auto-filled from scan
   - Large touch-friendly inputs
   - Quantity stepper (large +/- buttons)
   - Photo capture button (camera icon)
   - Job selector (if on a job)
   - Submit button

3. **Mobile Inventory List** (Touch-optimized)
   - Large cards instead of table
   - Swipe actions
   - Pull-to-refresh
   - Search bar at top
   - Filter by site (sticky)

---

### **Phase 2.3: Photo Upload & Management**

#### **Functionality:**
1. **Photo Capture**
   - Use device camera (mobile)
   - File picker (desktop)
   - Multiple photos per usage
   - Compress images before upload
   - Store in Supabase Storage: `inventory-usage-photos/{job_id}/{timestamp}_{filename}`

2. **Photo Display**
   - Thumbnail grid in usage records
   - Full-screen photo viewer
   - Photo metadata (date, user, job)

3. **Photo Storage Structure:**
   ```
   inventory-usage-photos/
     {job_id}/
       {timestamp}_{item_id}_{user_id}_{index}.jpg
   ```

---

### **Phase 2.4: Offline Capability**

#### **Implementation:**
1. **Service Worker**
   - Cache inventory data
   - Cache job data
   - Queue actions when offline

2. **Local Storage/IndexedDB**
   - Store pending usage records
   - Store scanned items
   - Store photos (blob URLs)

3. **Sync Queue**
   - When back online, sync all pending actions
   - Upload queued photos
   - Create transactions
   - Show sync status indicator

4. **Offline Indicators**
   - Banner showing "Offline Mode"
   - Queue count badge
   - Sync button when back online

---

### **Phase 2.5: Real-Time Updates**

#### **Functionality:**
1. **Supabase Realtime**
   - Subscribe to inventory changes
   - Update mobile view when inventory changes
   - Show notifications for low stock

2. **Push Notifications**
   - Notify when item scanned doesn't exist
   - Notify when item is low stock
   - Notify when usage is approved/rejected

---

### **Phase 2.6: Mobile-Specific Features**

#### **Additional Features:**
1. **Location Services**
   - Auto-detect site location (GPS)
   - Suggest site based on location
   - Verify worker is at correct site

2. **Voice Notes**
   - Record voice notes for usage
   - Transcribe to text (optional)
   - Attach to usage record

3. **Quick Actions**
   - Swipe to use item
   - Long-press for options menu
   - Shake to refresh (optional)

4. **Dark Mode**
   - Auto-detect system preference
   - Toggle in settings
   - Optimized for outdoor use

---

### **Phase 2.7: Security & Permissions**

#### **Access Control:**
1. **Role-Based Access**
   - Staff can only use items (not restock)
   - Managers can approve usage
   - Admins can do everything

2. **Site Restrictions**
   - Workers can only use items at assigned sites
   - Location verification (optional)

3. **Audit Trail**
   - Log all mobile actions
   - Track device info
   - Track location (if enabled)

---

### **Files to Create/Modify:**

**New Files:**
- `mobile-inventory.html` - Mobile scanner page
- `js/mobile-inventory.js` - Mobile inventory logic
- `js/barcode-scanner.js` - Barcode scanning functionality
- `js/offline-sync.js` - Offline queue and sync (may already exist)
- `sw.js` - Service worker for offline support
- `manifest.json` - PWA manifest (may already exist)

**Modify:**
- `js/inventory.js` - Add mobile-friendly functions
- `js/jobs.js` - Add mobile job selection
- `inventory.html` - Add mobile view toggle
- `css/mobile.css` - Mobile-specific styles

**SQL:**
- `ADD_BARCODE_SUPPORT.sql` - Barcode fields and indexes
- `ADD_MOBILE_AUDIT_LOG.sql` - Audit logging table

---

## 🎯 **Implementation Priority**

### **High Priority (Do First):**
1. ✅ **Job-Inventory Integration** (Phase 1.1-1.3)
   - Most requested feature
   - Direct business value
   - Foundation for mobile features

2. ✅ **Mobile Scanner** (Phase 2.1-2.2)
   - Core mobile functionality
   - Biggest time-saver for workers

### **Medium Priority:**
3. **Photo Upload** (Phase 2.3)
   - Important for documentation
   - Relatively straightforward

4. **Offline Support** (Phase 2.4)
   - Critical for field workers
   - More complex but high value

### **Low Priority (Nice to Have):**
5. **Advanced Mobile Features** (Phase 2.6)
   - Location services
   - Voice notes
   - Advanced UI features

6. **Advanced Reporting** (Phase 1.5)
   - Analytics and insights
   - Can be added later

---

## 📊 **Estimated Timeline**

### **Feature 1: Job Integration**
- **Phase 1.1:** 2-3 hours (Database)
- **Phase 1.2:** 4-6 hours (Job UI)
- **Phase 1.3:** 3-4 hours (Inventory UI)
- **Phase 1.4:** 2-3 hours (Workflow)
- **Phase 1.5:** 3-4 hours (Reports)
- **Total:** ~14-20 hours

### **Feature 2: Mobile Updates**
- **Phase 2.1:** 4-6 hours (Barcode system)
- **Phase 2.2:** 6-8 hours (Mobile UI)
- **Phase 2.3:** 3-4 hours (Photo upload)
- **Phase 2.4:** 8-10 hours (Offline support)
- **Phase 2.5:** 2-3 hours (Real-time)
- **Phase 2.6:** 4-6 hours (Advanced features)
- **Phase 2.7:** 2-3 hours (Security)
- **Total:** ~29-40 hours

### **Combined Total:** ~43-60 hours

---

## 🚀 **Recommended Approach**

### **Option A: Sequential (Recommended)**
1. Complete Feature 1 first (Job Integration)
2. Then build Feature 2 (Mobile) on top of it
3. **Pros:** Solid foundation, less rework
4. **Cons:** Mobile features come later

### **Option B: Parallel**
1. Build both features simultaneously
2. **Pros:** Faster delivery of both
3. **Cons:** More coordination needed, potential conflicts

### **Option C: MVP First**
1. Build basic job integration (Phase 1.1-1.3)
2. Build basic mobile scanner (Phase 2.1-2.2)
3. Add advanced features later
4. **Pros:** Quick wins, iterative improvement
5. **Cons:** May need refactoring later

---

## 🔧 **Technical Considerations**

### **Barcode Scanning:**
- Use `html5-qrcode` library (works on mobile browsers)
- Fallback to manual entry if camera unavailable
- Support multiple barcode formats

### **Photo Storage:**
- Use Supabase Storage with RLS policies
- Compress images client-side before upload
- Limit file size (e.g., 5MB max)
- Generate thumbnails server-side

### **Offline Support:**
- Use IndexedDB for local storage
- Implement sync queue with retry logic
- Show clear offline/online indicators
- Handle conflicts gracefully

### **Performance:**
- Lazy load inventory data
- Cache frequently accessed items
- Optimize image loading
- Use virtual scrolling for long lists

---

## 📝 **Next Steps**

1. **Decide on approach** (Sequential, Parallel, or MVP)
2. **Start with Feature 1 Phase 1.1** (Database schema)
3. **Test job-inventory linking** before mobile features
4. **Iterate based on user feedback**

---

**Ready to start?** Let's begin with **Feature 1: Job Integration** - it's the foundation for everything else! 🚀

