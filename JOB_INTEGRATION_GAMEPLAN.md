# 🔗 Job Integration Gameplan
## Link Inventory Transactions to Jobs

**Goal:** Allow workers to track which materials/parts are used for specific jobs, creating a complete audit trail and enabling job cost tracking.

---

## 📊 Current State

### ✅ What Already Exists:
- `inventory_transactions` table has `job_id` column (UUID)
- Index on `job_id` already created
- Jobs table uses UUID IDs
- Scanner mentions job linking but not implemented
- Transaction history exists but doesn't show job info

### ❌ What's Missing:
- Job selector in stock management modal
- Job auto-population based on context
- Job filtering in transaction history
- Job cost reports (materials used per job)
- Visual job indicators in inventory views

---

## 🎯 Phase 1: Basic Job Linking (2-3 hours)

### Step 1.1: Add Job Selector to Stock Modal

**File:** `inventory.html`

**Changes:**
- Add job selector dropdown after "Action" field
- Show only when action is "use" (hiding for restock/adjustment)
- Filter jobs by selected site
- Show active/in-progress jobs first
- Allow "No Job" option for non-job usage

**HTML Structure:**
```html
<!-- Job Selection (only for "use" action) -->
<div id="stock-job-section" class="hidden">
  <label class="block text-sm font-medium mb-1.5">
    Job <span class="text-gray-400 text-xs">(Optional)</span>
  </label>
  <select 
    id="stock-job-id" 
    name="job_id" 
    class="w-full border border-nfgray rounded-xl p-2.5 focus:ring-2 focus:ring-nfgblue outline-none"
  >
    <option value="">No Job / General Usage</option>
    <!-- Populated by JS -->
  </select>
  <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
    Link this inventory usage to a specific job
  </p>
</div>
```

### Step 1.2: Load Jobs for Selected Site

**File:** `js/inventory.js`

**New Functions:**
```javascript
// Load jobs for a specific site
async function loadJobsForSite(siteId) {
  if (!siteId) return [];
  
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status, scheduled_date, job_type')
      .eq('site_id', siteId)
      .in('status', ['pending', 'in-progress']) // Only active jobs
      .order('scheduled_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Inventory] Failed to load jobs:', error);
    return [];
  }
}

// Populate job selector
async function populateJobSelector(siteId) {
  const select = document.getElementById('stock-job-id');
  if (!select) return;
  
  const jobs = await loadJobsForSite(siteId);
  
  select.innerHTML = '<option value="">No Job / General Usage</option>' +
    jobs.map(job => `
      <option value="${job.id}">
        ${job.title} 
        ${job.status === 'in-progress' ? '🟢' : ''} 
        (${job.job_type || 'N/A'})
      </option>
    `).join('');
}
```

**Update `manageStock()` function:**
- Call `populateJobSelector(siteId)` when modal opens
- Show/hide job section based on action type

### Step 1.3: Show/Hide Job Selector Based on Action

**File:** `js/inventory.js`

**Update `updateBatchTrackingVisibility()` or create new function:**
```javascript
function updateJobSelectorVisibility() {
  const action = document.getElementById('stock-action')?.value;
  const jobSection = document.getElementById('stock-job-section');
  
  if (jobSection) {
    // Only show for "use" action
    if (action === 'use') {
      jobSection.classList.remove('hidden');
    } else {
      jobSection.classList.add('hidden');
      // Clear selection when hidden
      const jobSelect = document.getElementById('stock-job-id');
      if (jobSelect) jobSelect.value = '';
    }
  }
}

// Call when action changes
document.getElementById('stock-action')?.addEventListener('change', () => {
  updateBatchTrackingVisibility();
  updateJobSelectorVisibility(); // Add this
});
```

### Step 1.4: Save Job ID to Transaction

**File:** `js/inventory.js`

**Update transaction insert:**
```javascript
// In stock form submission handler
const jobId = formData.get('job_id') || null; // Get job ID

// When inserting transaction:
const { error: transactionError } = await supabase
  .from('inventory_transactions')
  .insert({
    item_id: itemId,
    site_id: siteId,
    job_id: jobId, // Add job_id here
    transaction_type: action,
    quantity_change: quantityChange,
    quantity_before: currentQty,
    quantity_after: newQty,
    user_id: currentUser.id,
    notes: notes || null,
    photo_urls: photoUrls.length > 0 ? photoUrls : null
  });
```

---

## 🎯 Phase 2: Transaction History Enhancement (1-2 hours)

### Step 2.1: Fetch Job Info in Transaction History

**File:** `js/inventory.js`

**Update `fetchInventoryTransactions()`:**
```javascript
.select(`
  id,
  transaction_type,
  quantity_change,
  quantity_before,
  quantity_after,
  created_at,
  notes,
  site_id,
  item_id,
  job_id, // Add this
  user_id,
  inventory_items:inventory_items(name, unit),
  sites:sites(name),
  jobs:jobs(title, job_type) // Add job join
`);
```

### Step 2.2: Display Job in History Table

**File:** `inventory.html`

**Add Job column to history table:**
```html
<th class="px-4 py-3 text-left font-medium text-nfgblue dark:text-blue-400">Job</th>
```

**Update `renderInventoryHistory()`:**
```javascript
// In table row rendering
<td class="px-4 py-3">
  ${transaction.job_id ? `
    <span class="inline-flex items-center gap-1 text-sm">
      <i data-lucide="briefcase" class="w-4 h-4"></i>
      <span class="font-medium">${transaction.jobs?.title || 'Unknown Job'}</span>
      ${transaction.jobs?.job_type ? `
        <span class="text-xs text-gray-500">(${transaction.jobs.job_type})</span>
      ` : ''}
    </span>
  ` : `
    <span class="text-gray-400 text-sm">—</span>
  `}
</td>
```

### Step 2.3: Add Job Filter to History

**File:** `inventory.html`

**Add job filter dropdown:**
```html
<div>
  <label class="block text-sm font-medium mb-1 text-nfgblue dark:text-blue-400">Job</label>
  <select id="history-job-filter" class="w-full border border-nfgray rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-nfgblue outline-none">
    <option value="all">All Jobs</option>
    <option value="none">No Job</option>
    <!-- Populated by JS -->
  </select>
</div>
```

**Load jobs for filter:**
```javascript
async function loadJobFilter() {
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, title')
    .order('title');
  
  const select = document.getElementById('history-job-filter');
  if (select && jobs) {
    const jobOptions = jobs.map(job => 
      `<option value="${job.id}">${job.title}</option>`
    ).join('');
    select.innerHTML = '<option value="all">All Jobs</option><option value="none">No Job</option>' + jobOptions;
  }
}
```

---

## 🎯 Phase 3: Job Context & Auto-Population (2-3 hours)

### Step 3.1: Auto-Select Job from Scanner Context

**File:** `js/inventory-scanner-integration.js`

**When opening manage stock modal from scanner:**
```javascript
// If job context exists (e.g., from URL params or session)
const currentJobId = sessionStorage.getItem('currentJobId');
if (currentJobId && action === 'use') {
  // Auto-select job in modal
  setTimeout(() => {
    const jobSelect = document.getElementById('stock-job-id');
    if (jobSelect) {
      jobSelect.value = currentJobId;
      // Trigger change to update UI if needed
      jobSelect.dispatchEvent(new Event('change'));
    }
  }, 100);
}
```

### Step 3.2: Job Context from Jobs Page

**File:** `jobs.html`

**Add "Use Materials" button in job detail modal:**
```html
<button 
  onclick="openInventoryForJob('${job.id}')" 
  class="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
>
  <i data-lucide="package" class="w-4 h-4"></i>
  Use Materials
</button>
```

**Function to open inventory with job context:**
```javascript
function openInventoryForJob(jobId) {
  // Store job context
  sessionStorage.setItem('currentJobId', jobId);
  sessionStorage.setItem('returnToJob', window.location.href);
  
  // Navigate to inventory page
  window.location.href = '/inventory.html';
}
```

**In inventory page:**
```javascript
// On page load, check for job context
const currentJobId = sessionStorage.getItem('currentJobId');
if (currentJobId) {
  // Highlight or auto-select job when opening stock modal
  // Clear context after use
}
```

### Step 3.3: Show Active Job Badge

**File:** `inventory.html`

**Add job context indicator:**
```html
<div id="active-job-badge" class="hidden fixed top-20 right-4 z-40 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
  <i data-lucide="briefcase" class="w-4 h-4"></i>
  <span id="active-job-name">Job: Maintenance Task</span>
  <button onclick="clearJobContext()" class="ml-2 hover:bg-blue-700 rounded p-1">
    <i data-lucide="x" class="w-3 h-3"></i>
  </button>
</div>
```

---

## 🎯 Phase 4: Job Cost Reports (2-3 hours)

### Step 4.1: Create Job Materials View

**File:** New SQL view or function

```sql
-- View: Job Materials Used
CREATE OR REPLACE VIEW job_materials_used AS
SELECT 
  j.id as job_id,
  j.title as job_title,
  j.site_id,
  s.name as site_name,
  COUNT(DISTINCT it.item_id) as unique_items_used,
  SUM(ABS(it.quantity_change)) as total_quantity_used,
  SUM(
    ABS(it.quantity_change) * 
    COALESCE(si.unit_cost, ii.unit_cost, 0)
  ) as estimated_cost
FROM jobs j
LEFT JOIN inventory_transactions it ON it.job_id = j.id AND it.transaction_type = 'use'
LEFT JOIN inventory_items ii ON ii.id = it.item_id
LEFT JOIN site_inventory si ON si.item_id = it.item_id AND si.site_id = it.site_id
LEFT JOIN sites s ON s.id = j.site_id
WHERE j.status = 'completed'
GROUP BY j.id, j.title, j.site_id, s.name;

-- Grant permissions
GRANT SELECT ON job_materials_used TO authenticated;
```

### Step 4.2: Add Job Materials Tab to Jobs Page

**File:** `jobs.html`

**Add tab button:**
```html
<button 
  onclick="showJobMaterials('${job.id}')" 
  class="tab-button"
>
  <i data-lucide="package" class="w-4 h-4"></i>
  Materials Used
</button>
```

**Materials section:**
```html
<div id="job-materials-section" class="hidden">
  <div class="space-y-4">
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4">
        <p class="text-sm text-gray-500">Items Used</p>
        <p id="job-materials-count" class="text-2xl font-semibold">—</p>
      </div>
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4">
        <p class="text-sm text-gray-500">Total Quantity</p>
        <p id="job-materials-quantity" class="text-2xl font-semibold">—</p>
      </div>
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4">
        <p class="text-sm text-gray-500">Est. Cost</p>
        <p id="job-materials-cost" class="text-2xl font-semibold text-green-600">—</p>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-nfglight/50">
          <tr>
            <th class="px-4 py-3 text-left">Item</th>
            <th class="px-4 py-3 text-right">Quantity</th>
            <th class="px-4 py-3 text-right">Unit Cost</th>
            <th class="px-4 py-3 text-right">Total</th>
            <th class="px-4 py-3 text-left">Date</th>
          </tr>
        </thead>
        <tbody id="job-materials-list">
          <tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
```

### Step 4.3: Fetch and Display Job Materials

**File:** `js/jobs.js` (or relevant file)

```javascript
async function loadJobMaterials(jobId) {
  try {
    // Get materials summary
    const { data: summary } = await supabase
      .from('job_materials_used')
      .select('*')
      .eq('job_id', jobId)
      .single();
    
    // Get detailed transactions
    const { data: transactions } = await supabase
      .from('inventory_transactions')
      .select(`
        id,
        quantity_change,
        created_at,
        inventory_items:inventory_items(name, unit, unit_cost),
        site_inventory:site_inventory(unit_cost)
      `)
      .eq('job_id', jobId)
      .eq('transaction_type', 'use')
      .order('created_at', { ascending: false });
    
    // Update UI
    document.getElementById('job-materials-count').textContent = summary?.unique_items_used || 0;
    document.getElementById('job-materials-quantity').textContent = summary?.total_quantity_used || 0;
    document.getElementById('job-materials-cost').textContent = 
      formatCurrency(summary?.estimated_cost || 0);
    
    // Render materials list
    renderJobMaterialsList(transactions || []);
  } catch (error) {
    console.error('Failed to load job materials:', error);
  }
}
```

---

## 🎯 Phase 5: Enhanced Features (Optional, 2-3 hours)

### Step 5.1: Job Materials Estimation

- Allow adding estimated materials when creating job
- Show estimated vs actual usage
- Alert when exceeding estimates

### Step 5.2: Material Requirements per Job Type

- Define common materials per job type
- Auto-suggest materials when creating jobs
- Checklist of required materials

### Step 5.3: Job Material Reports

- Export job cost reports
- Compare material costs across jobs
- Identify material waste patterns

---

## 📋 Implementation Checklist

### Phase 1: Basic Job Linking
- [ ] Add job selector to stock modal
- [ ] Show/hide based on action type
- [ ] Load jobs filtered by site
- [ ] Save job_id to transaction
- [ ] Test job linking works

### Phase 2: Transaction History
- [ ] Add job column to history table
- [ ] Fetch job info in queries
- [ ] Display job name/type
- [ ] Add job filter dropdown
- [ ] Test filtering works

### Phase 3: Context & Auto-Population
- [ ] Store job context in session
- [ ] Auto-select job from context
- [ ] Add "Use Materials" button in jobs page
- [ ] Show active job badge
- [ ] Clear context after use

### Phase 4: Cost Reports
- [ ] Create job_materials_used view
- [ ] Add materials tab to job detail
- [ ] Display materials used
- [ ] Show estimated costs
- [ ] Test calculations

### Phase 5: Enhanced Features
- [ ] Material estimation (optional)
- [ ] Material requirements (optional)
- [ ] Advanced reports (optional)

---

## ⏱️ Time Estimates

- **Phase 1:** 2-3 hours
- **Phase 2:** 1-2 hours
- **Phase 3:** 2-3 hours
- **Phase 4:** 2-3 hours
- **Phase 5:** 2-3 hours (optional)

**Total:** 7-11 hours (or 9-14 hours with Phase 5)

---

## 🎯 Success Criteria

1. ✅ Workers can select a job when using inventory
2. ✅ Transactions are linked to jobs
3. ✅ Transaction history shows job info
4. ✅ Jobs page shows materials used
5. ✅ Cost estimates are visible
6. ✅ Job context persists across pages

---

## 🚀 Next Steps

Start with **Phase 1** - it's the foundation for everything else. Once basic job linking works, the other phases build on top of it.

