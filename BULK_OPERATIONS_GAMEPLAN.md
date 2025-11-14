# 🔄 Bulk Operations Game Plan

## 🎯 Overview

Implement bulk operations across Jobs, Sites, and Inventory pages to allow users to select multiple items and perform actions on all selected items at once.

---

## 📊 Current Status

### ✅ Already Implemented:
- **Time Entries:** Bulk approve selected time entries (in Reports page)
  - Checkbox selection
  - "Bulk Approve Selected" button
  - Select all functionality

### ❌ Missing:
- **Jobs:** No bulk selection or operations
- **Sites:** No bulk selection or operations
- **Inventory:** No bulk selection or operations

---

## 🚀 Implementation Plan

### **Phase 1: Bulk Job Operations** (Highest Priority)

#### **1.1 Add Selection UI to Jobs Page**

**File:** `jobs.html`

**Location:** Add checkboxes to job cards/list items

**Changes:**
```html
<!-- Add to job card/row -->
<div class="job-card">
  <!-- Selection checkbox -->
  <input 
    type="checkbox" 
    class="job-checkbox" 
    data-job-id="${job.id}"
    aria-label="Select job ${job.title}"
  />
  
  <!-- Existing job content -->
  ...
</div>

<!-- Add bulk actions toolbar (initially hidden) -->
<div id="bulk-actions-toolbar" class="hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-lg p-4 z-50">
  <div class="flex items-center gap-4">
    <span id="selected-count" class="text-sm font-medium text-nfgblue dark:text-blue-400">
      0 selected
    </span>
    <div class="flex gap-2">
      <button id="bulk-update-status-btn" class="px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark text-sm">
        Update Status
      </button>
      <button id="bulk-assign-worker-btn" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight text-sm">
        Assign Worker
      </button>
      <button id="bulk-archive-btn" class="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm">
        Archive
      </button>
      <button id="bulk-cancel-selection" class="px-3 py-2 rounded-xl border border-nfgray hover:bg-nfglight text-sm">
        Cancel
      </button>
    </div>
  </div>
</div>
```

**Features:**
- ✅ Checkbox on each job item
- ✅ "Select All" checkbox in header
- ✅ Bulk actions toolbar appears when items selected
- ✅ Shows count of selected items
- ✅ Sticky toolbar at bottom of page
- ✅ Cancel button to deselect all

#### **1.2 Implement Selection Logic**

**JavaScript Functions:**
```javascript
// Track selected jobs
let selectedJobs = new Set();

// Toggle job selection
function toggleJobSelection(jobId) {
  if (selectedJobs.has(jobId)) {
    selectedJobs.delete(jobId);
  } else {
    selectedJobs.add(jobId);
  }
  updateBulkActionsToolbar();
}

// Select all jobs
function selectAllJobs() {
  const jobs = getVisibleJobs(); // Get currently visible/filtered jobs
  jobs.forEach(job => selectedJobs.add(job.id));
  updateCheckboxes();
  updateBulkActionsToolbar();
}

// Deselect all
function deselectAllJobs() {
  selectedJobs.clear();
  updateCheckboxes();
  updateBulkActionsToolbar();
}

// Update toolbar visibility and count
function updateBulkActionsToolbar() {
  const toolbar = document.getElementById('bulk-actions-toolbar');
  const count = document.getElementById('selected-count');
  
  if (selectedJobs.size > 0) {
    toolbar.classList.remove('hidden');
    count.textContent = `${selectedJobs.size} selected`;
  } else {
    toolbar.classList.add('hidden');
  }
}

// Update checkbox states
function updateCheckboxes() {
  document.querySelectorAll('.job-checkbox').forEach(checkbox => {
    checkbox.checked = selectedJobs.has(checkbox.dataset.jobId);
  });
}
```

#### **1.3 Implement Bulk Actions**

**A. Bulk Update Status**

```javascript
// Bulk update status
async function bulkUpdateJobStatus() {
  if (selectedJobs.size === 0) {
    toast.error('Please select at least one job');
    return;
  }
  
  // Show status selection modal
  const status = await showStatusSelectionModal();
  if (!status) return; // User cancelled
  
  const confirmed = await showConfirm(
    `Update ${selectedJobs.size} job(s) to "${status}"?`,
    'Bulk Update Status'
  );
  if (!confirmed) return;
  
  // Update all selected jobs
  const jobIds = Array.from(selectedJobs);
  const { error } = await supabase
    .from('jobs')
    .update({ status: status })
    .in('id', jobIds);
  
  if (error) {
    toast.error('Failed to update jobs: ' + error.message);
    return;
  }
  
  toast.success(`${jobIds.length} job(s) updated successfully`);
  deselectAllJobs();
  await renderJobs(); // Refresh list
}

// Status selection modal
async function showStatusSelectionModal() {
  return new Promise((resolve) => {
    const modal = document.getElementById('bulk-status-modal');
    const statusButtons = modal.querySelectorAll('[data-status]');
    
    statusButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.dataset.status;
        modal.classList.add('hidden');
        resolve(status);
      });
    });
    
    modal.classList.remove('hidden');
    
    // Cancel handler
    modal.querySelector('[data-cancel]').addEventListener('click', () => {
      modal.classList.add('hidden');
      resolve(null);
    });
  });
}
```

**B. Bulk Assign Worker**

```javascript
// Bulk assign worker
async function bulkAssignWorker() {
  if (selectedJobs.size === 0) {
    toast.error('Please select at least one job');
    return;
  }
  
  // Show worker selection modal
  const workerId = await showWorkerSelectionModal();
  if (!workerId) return; // User cancelled
  
  const confirmed = await showConfirm(
    `Assign ${selectedJobs.size} job(s) to selected worker?`,
    'Bulk Assign Worker'
  );
  if (!confirmed) return;
  
  // Update all selected jobs
  const jobIds = Array.from(selectedJobs);
  const { error } = await supabase
    .from('jobs')
    .update({ assigned_worker_id: workerId })
    .in('id', jobIds);
  
  if (error) {
    toast.error('Failed to assign jobs: ' + error.message);
    return;
  }
  
  toast.success(`${jobIds.length} job(s) assigned successfully`);
  deselectAllJobs();
  await renderJobs(); // Refresh list
}

// Worker selection modal (reuse existing worker selection UI)
async function showWorkerSelectionModal() {
  // Fetch available workers
  const { data: workers } = await supabase
    .from('user_profiles')
    .select('id, full_name, email')
    .eq('role', 'staff')
    .eq('status', 'active');
  
  // Show modal with worker list
  // Return selected worker ID or null if cancelled
}
```

**C. Bulk Archive Jobs**

```javascript
// Bulk archive jobs
async function bulkArchiveJobs() {
  if (selectedJobs.size === 0) {
    toast.error('Please select at least one job');
    return;
  }
  
  const confirmed = await showConfirm(
    `Archive ${selectedJobs.size} job(s)? They will be hidden from the main list but preserved for records.`,
    'Bulk Archive Jobs',
    'warning'
  );
  if (!confirmed) return;
  
  const jobIds = Array.from(selectedJobs);
  const now = new Date().toISOString();
  
  const { error } = await supabase
    .from('jobs')
    .update({ 
      archived_at: now,
      status: 'completed' // Optionally set status
    })
    .in('id', jobIds);
  
  if (error) {
    toast.error('Failed to archive jobs: ' + error.message);
    return;
  }
  
  toast.success(`${jobIds.length} job(s) archived successfully`);
  deselectAllJobs();
  await renderJobs(); // Refresh list
}
```

**D. Bulk Delete Jobs (Optional - for cancelled jobs only)**

```javascript
// Bulk delete jobs (only for cancelled jobs)
async function bulkDeleteJobs() {
  if (selectedJobs.size === 0) {
    toast.error('Please select at least one job');
    return;
  }
  
  // Verify all selected jobs are cancelled
  const jobs = await getJobsByIds(Array.from(selectedJobs));
  const notCancelled = jobs.filter(j => j.status !== 'cancelled');
  
  if (notCancelled.length > 0) {
    toast.error('Only cancelled jobs can be permanently deleted');
    return;
  }
  
  const confirmed = await showConfirm(
    `Permanently delete ${selectedJobs.size} cancelled job(s)? This action cannot be undone.`,
    'Bulk Delete Jobs',
    'danger'
  );
  if (!confirmed) return;
  
  const jobIds = Array.from(selectedJobs);
  const { error } = await supabase
    .from('jobs')
    .delete()
    .in('id', jobIds);
  
  if (error) {
    toast.error('Failed to delete jobs: ' + error.message);
    return;
  }
  
  toast.success(`${jobIds.length} job(s) deleted permanently`);
  deselectAllJobs();
  await renderJobs(); // Refresh list
}
```

#### **1.4 Modal Components**

**Status Selection Modal:**
```html
<!-- Bulk Status Selection Modal -->
<div id="bulk-status-modal" class="hidden fixed inset-0 bg-black/40 items-center justify-center p-4 z-[60]">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-nfg border border-nfgray w-full max-w-md">
    <div class="p-4 border-b border-nfgray">
      <h4 class="text-nfgblue dark:text-blue-400 font-semibold">Select New Status</h4>
    </div>
    <div class="p-4 space-y-2">
      <button data-status="pending" class="w-full px-4 py-3 rounded-xl border border-nfgray hover:bg-nfglight text-left">
        <span class="font-medium">Pending</span>
        <p class="text-sm text-gray-500">Job is scheduled but not started</p>
      </button>
      <button data-status="in-progress" class="w-full px-4 py-3 rounded-xl border border-nfgray hover:bg-nfglight text-left">
        <span class="font-medium">In Progress</span>
        <p class="text-sm text-gray-500">Work has started on this job</p>
      </button>
      <button data-status="completed" class="w-full px-4 py-3 rounded-xl border border-nfgray hover:bg-nfglight text-left">
        <span class="font-medium">Completed</span>
        <p class="text-sm text-gray-500">Job is finished</p>
      </button>
      <button data-status="cancelled" class="w-full px-4 py-3 rounded-xl border border-red-200 hover:bg-red-50 text-left">
        <span class="font-medium text-red-600">Cancelled</span>
        <p class="text-sm text-gray-500">Job was cancelled</p>
      </button>
    </div>
    <div class="p-4 border-t border-nfgray flex justify-end">
      <button data-cancel class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight">
        Cancel
      </button>
    </div>
  </div>
</div>
```

**Worker Selection Modal:**
```html
<!-- Bulk Worker Selection Modal -->
<div id="bulk-worker-modal" class="hidden fixed inset-0 bg-black/40 items-center justify-center p-4 z-[60]">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-nfg border border-nfgray w-full max-w-md">
    <div class="p-4 border-b border-nfgray">
      <h4 class="text-nfgblue dark:text-blue-400 font-semibold">Select Worker</h4>
    </div>
    <div class="p-4 max-h-96 overflow-y-auto space-y-2" id="bulk-worker-list">
      <!-- Workers will be populated here -->
    </div>
    <div class="p-4 border-t border-nfgray flex justify-end">
      <button data-cancel class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight">
        Cancel
      </button>
    </div>
  </div>
</div>
```

---

### **Phase 2: Bulk Site Operations**

#### **2.1 Add Selection UI to Sites Page**

**File:** `sites.html`

**Similar to jobs, but simpler operations:**

**Bulk Actions:**
1. **Bulk Assign Workers to Sites**
   - Select multiple sites
   - Assign one worker to all selected sites
   - Uses `worker_site_assignments` table

2. **Bulk Update Site Status**
   - Activate/deactivate multiple sites
   - Update site information (if needed)

3. **Bulk Archive Sites** (Optional)
   - Archive multiple sites at once

**Implementation:**
```javascript
// Bulk assign worker to sites
async function bulkAssignWorkerToSites() {
  const siteIds = Array.from(selectedSites);
  const workerId = await showWorkerSelectionModal();
  
  if (!workerId || siteIds.length === 0) return;
  
  // Create assignments for all selected sites
  const assignments = siteIds.map(siteId => ({
    worker_id: workerId,
    site_id: siteId,
    assigned_by: currentUser.id
  }));
  
  const { error } = await supabase
    .from('worker_site_assignments')
    .upsert(assignments, { onConflict: 'worker_id,site_id' });
  
  if (error) {
    toast.error('Failed to assign worker: ' + error.message);
    return;
  }
  
  toast.success(`Worker assigned to ${siteIds.length} site(s)`);
  deselectAllSites();
  await renderSites();
}
```

---

### **Phase 3: Bulk Inventory Operations**

#### **3.1 Add Selection UI to Inventory Page**

**File:** `inventory.html`

**Bulk Actions:**
1. **Bulk Update Quantities**
   - Select multiple items
   - Enter new quantity or adjust by amount
   - Update all at once

2. **Bulk Update Category**
   - Change category for multiple items
   - Quick re-categorization

3. **Bulk Import/Export**
   - Export selected items to CSV
   - Import items from CSV

**Implementation:**
```javascript
// Bulk update quantities
async function bulkUpdateQuantities() {
  const itemIds = Array.from(selectedItems);
  
  // Show quantity update modal
  const updateType = await showQuantityUpdateModal(); // 'set' or 'adjust'
  const amount = await showQuantityInputModal();
  
  if (!updateType || !amount) return;
  
  // Fetch current quantities
  const { data: items } = await supabase
    .from('inventory_items')
    .select('id, quantity')
    .in('id', itemIds);
  
  // Calculate new quantities
  const updates = items.map(item => ({
    id: item.id,
    quantity: updateType === 'set' 
      ? parseInt(amount)
      : Math.max(0, (item.quantity || 0) + parseInt(amount))
  }));
  
  // Update all items
  for (const update of updates) {
    await supabase
      .from('inventory_items')
      .update({ quantity: update.quantity })
      .eq('id', update.id);
  }
  
  toast.success(`Updated quantities for ${itemIds.length} item(s)`);
  deselectAllItems();
  await renderInventory();
}

// Bulk update category
async function bulkUpdateCategory() {
  const itemIds = Array.from(selectedItems);
  const categoryId = await showCategorySelectionModal();
  
  if (!categoryId) return;
  
  const { error } = await supabase
    .from('inventory_items')
    .update({ category_id: categoryId })
    .in('id', itemIds);
  
  if (error) {
    toast.error('Failed to update category: ' + error.message);
    return;
  }
  
  toast.success(`Category updated for ${itemIds.length} item(s)`);
  deselectAllItems();
  await renderInventory();
}

// Bulk export to CSV
async function bulkExportInventory() {
  const itemIds = Array.from(selectedItems);
  
  const { data: items } = await supabase
    .from('inventory_items')
    .select('*, categories(name)')
    .in('id', itemIds);
  
  // Generate CSV
  const headers = ['Name', 'Category', 'Quantity', 'Unit', 'Low Stock Threshold', 'Location'];
  const rows = items.map(item => [
    item.name,
    item.categories?.name || '',
    item.quantity || 0,
    item.unit || '',
    item.low_stock_threshold || 0,
    item.location || ''
  ]);
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  toast.success(`Exported ${itemIds.length} item(s) to CSV`);
}
```

---

## 📋 Implementation Checklist

### **Phase 1: Bulk Job Operations**

#### **Week 1: UI & Selection**
- [ ] Add checkboxes to job cards/list items
- [ ] Add "Select All" checkbox in header
- [ ] Create bulk actions toolbar component
- [ ] Implement selection tracking logic
- [ ] Add CSS for selection states
- [ ] Test selection/deselection

#### **Week 1: Bulk Actions**
- [ ] Implement bulk status update
- [ ] Create status selection modal
- [ ] Implement bulk assign worker
- [ ] Create worker selection modal
- [ ] Implement bulk archive
- [ ] Add confirmation dialogs
- [ ] Test all bulk operations

#### **Week 1: Polish**
- [ ] Add loading states during bulk operations
- [ ] Add success/error messages
- [ ] Handle edge cases (no selection, errors)
- [ ] Test with different job filters
- [ ] Ensure works with staff/admin roles

### **Phase 2: Bulk Site Operations**

#### **Week 2: Sites**
- [ ] Add selection UI to sites page
- [ ] Implement bulk assign worker to sites
- [ ] Implement bulk update site status
- [ ] Test site bulk operations

### **Phase 3: Bulk Inventory Operations**

#### **Week 2: Inventory**
- [ ] Add selection UI to inventory page
- [ ] Implement bulk update quantities
- [ ] Implement bulk update category
- [ ] Implement bulk export to CSV
- [ ] Test inventory bulk operations

---

## 🎨 UI/UX Design

### **Selection Indicators:**

**Visual States:**
- **Unselected:** Normal appearance
- **Hover:** Light blue background highlight
- **Selected:** Checkbox checked, blue border or background tint
- **Select All:** Header checkbox, bold text

### **Bulk Actions Toolbar:**

**Design:**
- Sticky at bottom of page (fixed position)
- White background with shadow
- Shows count: "5 selected"
- Action buttons arranged horizontally
- "Cancel" button to deselect all
- Smooth slide-up animation when items selected
- Responsive design (stacks on mobile)

### **Mobile Considerations:**

- Checkboxes must be large enough to tap easily
- Toolbar stacks vertically on mobile
- Actions in dropdown menu on very small screens
- Touch-friendly spacing

---

## 🔒 Security & Permissions

### **Role-Based Restrictions:**

**Staff:**
- ❌ Cannot bulk update status (only their assigned jobs)
- ❌ Cannot bulk assign workers
- ❌ Cannot bulk archive jobs
- ✅ Can select jobs (but actions limited)

**Admin/Client:**
- ✅ Can perform all bulk operations
- ✅ Full access to bulk features

**Implementation:**
```javascript
// Check permissions before showing bulk actions
function updateBulkActionsToolbar() {
  const isStaff = currentUserProfile?.role === 'staff';
  const toolbar = document.getElementById('bulk-actions-toolbar');
  
  if (selectedJobs.size > 0) {
    toolbar.classList.remove('hidden');
    
    // Hide actions staff can't perform
    if (isStaff) {
      document.getElementById('bulk-update-status-btn').style.display = 'none';
      document.getElementById('bulk-assign-worker-btn').style.display = 'none';
      document.getElementById('bulk-archive-btn').style.display = 'none';
    }
  }
}
```

---

## 🧪 Testing Plan

### **Functional Testing:**
1. ✅ Select single job → toolbar appears
2. ✅ Select multiple jobs → count updates
3. ✅ Select all → all checkboxes checked
4. ✅ Cancel selection → toolbar hides
5. ✅ Bulk update status → all jobs update
6. ✅ Bulk assign worker → all jobs assigned
7. ✅ Bulk archive → jobs archived
8. ✅ Filter jobs → selection works with filtered list
9. ✅ Refresh page → selection cleared
10. ✅ Error handling → shows error if operation fails

### **Edge Cases:**
1. **No selection:** Disable bulk action buttons
2. **Single item:** Works same as multiple
3. **Large selection:** Handle 100+ items efficiently
4. **Permission errors:** Show appropriate message
5. **Network errors:** Retry or show error
6. **Concurrent updates:** Handle race conditions

### **Performance:**
1. **Large datasets:** Virtual scrolling for 1000+ items
2. **Bulk operations:** Batch database updates efficiently
3. **UI responsiveness:** Don't freeze UI during bulk ops
4. **Progress indication:** Show progress for large operations

---

## 💡 Advanced Features (Future)

### **1. Smart Selection:**
- "Select filtered" - Select all visible/filtered items
- "Select by status" - Select all jobs with specific status
- "Select by worker" - Select all jobs assigned to worker
- "Select by date range" - Select jobs in date range

### **2. Undo/Redo:**
- Undo last bulk operation
- Show history of bulk operations
- Revert changes if needed

### **3. Scheduled Bulk Operations:**
- Schedule bulk status updates
- Automated bulk assignments
- Recurring bulk operations

### **4. Bulk Templates:**
- Save common bulk operations
- Quick apply saved operations
- Share templates with team

---

## 📁 Files to Modify

### **Phase 1: Jobs**
1. `jobs.html`
   - Add checkboxes to job rendering
   - Add bulk actions toolbar HTML
   - Add bulk action modals
   - Add JavaScript for selection and bulk operations

### **Phase 2: Sites**
2. `sites.html`
   - Add checkboxes to site rendering
   - Add bulk actions toolbar
   - Add bulk operation functions

### **Phase 3: Inventory**
3. `inventory.html`
   - Add checkboxes to inventory rendering
   - Add bulk actions toolbar
   - Add bulk operation functions
   - Add CSV export functionality

---

## ✅ Success Criteria

### **For Jobs:**
1. ✅ Users can select multiple jobs via checkboxes
2. ✅ Bulk actions toolbar appears when items selected
3. ✅ Bulk status update works correctly
4. ✅ Bulk assign worker works correctly
5. ✅ Bulk archive works correctly
6. ✅ Selection persists during filtering
7. ✅ Works on mobile devices
8. ✅ Respects role-based permissions

### **For Sites:**
1. ✅ Users can select multiple sites
2. ✅ Bulk assign worker works
3. ✅ Bulk status update works

### **For Inventory:**
1. ✅ Users can select multiple items
2. ✅ Bulk quantity update works
3. ✅ Bulk category update works
4. ✅ Bulk export to CSV works

---

## 🚀 Quick Start MVP

**Minimum Viable Product (1-2 days):**

1. **Jobs Page Only:**
   - Add checkboxes to jobs
   - Add bulk actions toolbar
   - Implement bulk status update only
   - Implement bulk archive only

This gives you core functionality quickly, then you can add more features incrementally.

---

## 💻 Code Structure

### **Reusable Components:**

**Create shared utility functions:**
```javascript
// js/bulk-operations.js (new file)

export class BulkOperations {
  constructor(config) {
    this.selectedItems = new Set();
    this.itemType = config.itemType; // 'jobs', 'sites', 'inventory'
    this.onSelectionChange = config.onSelectionChange;
    this.getAllowedActions = config.getAllowedActions;
  }
  
  toggleSelection(itemId) {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
    this.onSelectionChange(this.selectedItems.size);
  }
  
  selectAll(itemIds) {
    itemIds.forEach(id => this.selectedItems.add(id));
    this.onSelectionChange(this.selectedItems.size);
  }
  
  clearSelection() {
    this.selectedItems.clear();
    this.onSelectionChange(0);
  }
  
  getSelectedIds() {
    return Array.from(this.selectedItems);
  }
}
```

**Usage in pages:**
```javascript
import { BulkOperations } from './js/bulk-operations.js';

const bulkOps = new BulkOperations({
  itemType: 'jobs',
  onSelectionChange: (count) => {
    updateBulkActionsToolbar(count);
  },
  getAllowedActions: () => {
    // Return allowed actions based on role
    return currentUserProfile?.role !== 'staff' 
      ? ['status', 'assign', 'archive']
      : [];
  }
});
```

---

## 📊 Estimated Timeline

### **Phase 1: Bulk Job Operations**
- **UI & Selection:** 4-6 hours
- **Bulk Actions:** 6-8 hours
- **Testing & Polish:** 2-3 hours
- **Total:** ~12-17 hours (1.5-2 days)

### **Phase 2: Bulk Site Operations**
- **Implementation:** 3-4 hours
- **Total:** ~3-4 hours (half day)

### **Phase 3: Bulk Inventory Operations**
- **Implementation:** 4-6 hours
- **Total:** ~4-6 hours (half day)

### **Grand Total:** ~20-27 hours (2.5-3.5 days)

---

## 🎯 Recommended Approach

**Start with Phase 1 (Jobs) MVP:**
1. Day 1: Add selection UI + bulk status update
2. Day 2: Add bulk assign worker + bulk archive
3. Day 3: Testing and polish

**Then move to Phase 2 & 3:**
- Sites: 1 day
- Inventory: 1 day

**Total: ~5 days for complete implementation**

---

## ❓ Questions to Consider

1. **Selection Persistence:** Should selection persist when filtering? (Recommended: Yes)
2. **Select All Behavior:** Select all visible or all in database? (Recommended: Visible only)
3. **Confirmation Dialogs:** Always confirm or only for destructive actions? (Recommended: Always for bulk ops)
4. **Progress Indication:** Show progress bar for large operations? (Recommended: Yes for 10+ items)
5. **Undo Functionality:** Add undo for bulk operations? (Recommended: Future enhancement)

---

**Ready to start? Phase 1 (Jobs) is the most impactful - start there!**

