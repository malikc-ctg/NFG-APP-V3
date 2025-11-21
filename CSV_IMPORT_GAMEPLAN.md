# 📥 CSV Import System - Client Migration Game Plan

## 🎯 Overview
Build a comprehensive CSV import system to allow clients to migrate data from their existing platforms (Excel, Google Sheets, other software) into NFG App. This is critical for client onboarding and reducing manual data entry.

---

## 🎯 Business Value
- **Reduces onboarding friction** - Clients can migrate 100s of records in minutes
- **Competitive advantage** - Easy migration = more likely to switch
- **Reduces errors** - Automated import vs manual entry
- **Saves time** - Days/weeks of data entry → minutes

---

## 📊 Import Targets (Priority Order)

### **Phase 1: Core Data (High Priority)**
1. **Sites** - Most important, foundation for everything
2. **Users/Workers** - Need to import team members
3. **Jobs** - Historical job data
4. **Bookings** - Future scheduled work

### **Phase 2: Supporting Data (Medium Priority)**
5. **Inventory Items** - Product catalog
6. **Inventory Stock** - Current stock levels per site
7. **User Assignments** - Site assignments for workers

### **Phase 3: Advanced (Low Priority)**
8. **Invoices** (if billing exists)
9. **Payments** (if billing exists)
10. **Expenses** (if billing exists)

---

## 🏗️ Architecture Design

### **Import Flow:**
```
1. User selects import type (Sites, Jobs, Users, etc.)
2. User uploads CSV file
3. System validates CSV structure (headers, format)
4. System parses and previews data (first 10 rows)
5. User maps CSV columns to NFG fields
6. System validates data (required fields, data types, references)
7. System shows preview with errors/warnings
8. User confirms import
9. System imports data in batches with progress
10. System shows import results (success, errors, skipped)
11. System allows download of error report
```

---

## 🎨 UI/UX Design

### **1. Import Button Location**
**Location:** Settings page → New "Data Import" section

**Button:**
```html
<button class="import-data-btn">
  <i data-lucide="upload"></i>
  Import Data from CSV
</button>
```

### **2. Import Modal Structure**
```
┌─────────────────────────────────────────┐
│ Import Data from CSV            [X]     │
├─────────────────────────────────────────┤
│                                         │
│ Step 1: Select Data Type                │
│ ○ Sites                                 │
│ ○ Jobs                                  │
│ ○ Users/Workers                         │
│ ○ Bookings                              │
│ ○ Inventory Items                       │
│ ○ Inventory Stock                       │
│                                         │
│ Step 2: Upload CSV File                 │
│ [Drag & Drop or Click to Upload]       │
│                                         │
│ Step 3: Column Mapping                  │
│ CSV Column → NFG Field                  │
│ Name → Site Name                        │
│ Address → Address                       │
│ [Auto-detect matches]                   │
│                                         │
│ Step 4: Preview & Validate              │
│ [Shows first 10 rows + validation]     │
│ ✅ 45 rows valid                        │
│ ⚠️ 3 rows have warnings                 │
│ ❌ 2 rows have errors                   │
│                                         │
│ Step 5: Import Progress                 │
│ [Progress bar]                          │
│ Importing... 23/50                      │
│                                         │
│ Step 6: Results                         │
│ ✅ 45 imported successfully             │
│ ⚠️ 3 skipped (warnings)                 │
│ ❌ 2 failed (errors)                    │
│ [Download Error Report]                 │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📋 Implementation Details

### **Phase 1.1: Sites Import** (Highest Priority)

#### **CSV Template:**
```csv
Site Name,Address,City,State,Postal Code,Contact Name,Contact Phone,Contact Email,Notes
"ABC Office","123 Main St","Toronto","ON","M5H 1A1","John Doe","(555) 123-4567","john@abc.com","Main office location"
"XYZ Warehouse","456 Industrial Blvd","Mississauga","ON","L5T 2B2","Jane Smith","(555) 987-6543","jane@xyz.com","Storage facility"
```

#### **Required Fields:**
- Site Name (or Name)
- Address (or Street Address)

#### **Optional Fields:**
- City, State/Province, Postal Code
- Contact Name, Contact Phone, Contact Email
- Notes, Description
- Status (active/inactive)

#### **Field Mapping:**
| CSV Column Name | NFG Field | Required | Notes |
|----------------|-----------|----------|-------|
| Site Name / Name | `name` | ✅ Yes | Primary identifier |
| Address / Street Address | `address` | ✅ Yes | |
| City | `city` | ❌ No | |
| State / Province | `province` | ❌ No | |
| Postal Code / Zip Code | `postal_code` | ❌ No | |
| Contact Name | `contact_name` | ❌ No | |
| Contact Phone | `contact_phone` | ❌ No | |
| Contact Email | `contact_email` | ❌ No | |
| Notes / Description | `notes` | ❌ No | |
| Status | `status` | ❌ No | Default: 'active' |

#### **Validation Rules:**
- ✅ Site name must be unique (check against existing)
- ✅ Address is required
- ✅ Phone format validation (optional but helpful)
- ✅ Email format validation (optional but helpful)
- ✅ Status must be 'active' or 'inactive' if provided

---

### **Phase 1.2: Users/Workers Import**

#### **CSV Template:**
```csv
Full Name,Email,Role,Phone,Status
"John Doe","john@example.com","staff","(555) 123-4567","active"
"Jane Smith","jane@example.com","admin","(555) 987-6543","active"
```

#### **Required Fields:**
- Full Name (or Name)
- Email

#### **Optional Fields:**
- Role (staff, admin, client)
- Phone
- Status (active/inactive)

#### **Field Mapping:**
| CSV Column Name | NFG Field | Required | Notes |
|----------------|-----------|----------|-------|
| Full Name / Name | `full_name` | ✅ Yes | |
| Email | `email` | ✅ Yes | Must be valid email format |
| Role | `role` | ❌ No | Default: 'staff' |
| Phone | (profile field) | ❌ No | |
| Status | (user status) | ❌ No | Default: 'active' |

#### **Special Handling:**
- **Email must be unique** - Check existing users
- **If user exists** - Option to skip or update
- **Role validation** - Must be valid role (staff, admin, client)
- **Auto-invite** - Send invitation email after import (optional)

---

### **Phase 1.3: Jobs Import**

#### **CSV Template:**
```csv
Title,Site Name,Scheduled Date,Status,Worker Email,Priority,Notes
"Monthly Cleaning","ABC Office","2025-01-15","pending","john@example.com","normal","Routine maintenance"
"Emergency Repair","XYZ Warehouse","2025-01-20","in-progress","jane@example.com","urgent","Broken HVAC"
```

#### **Required Fields:**
- Title (or Job Name)
- Site Name (or Site)

#### **Optional Fields:**
- Scheduled Date
- Status (pending, in-progress, completed, cancelled)
- Worker Email (or Assigned To)
- Priority (normal, urgent, low)
- Notes, Description

#### **Field Mapping:**
| CSV Column Name | NFG Field | Required | Notes |
|----------------|-----------|----------|-------|
| Title / Job Name | `title` | ✅ Yes | |
| Site Name / Site | `site_id` | ✅ Yes | Must match existing site |
| Scheduled Date | `scheduled_date` | ❌ No | Format: YYYY-MM-DD |
| Status | `status` | ❌ No | Default: 'pending' |
| Worker Email / Assigned To | `assigned_worker_id` | ❌ No | Lookup by email |
| Priority | `priority` | ❌ No | Default: 'normal' |
| Notes / Description | `notes` | ❌ No | |

#### **Special Handling:**
- **Site lookup** - Match by site name (fuzzy match suggestion)
- **Worker lookup** - Match by email (create if not exists option)
- **Date parsing** - Handle multiple date formats
- **Status validation** - Must be valid status

---

### **Phase 1.4: Bookings Import**

#### **CSV Template:**
```csv
Client Name,Service,Date,Time,Status,Notes
"ABC Office","Monthly Cleaning","2025-02-01","09:00","confirmed","Regular service"
"XYZ Warehouse","Inspection","2025-02-15","14:00","pending","First visit"
```

#### **Required Fields:**
- Client Name (or Site Name)
- Service (or Service Name)
- Date

#### **Field Mapping:**
| CSV Column Name | NFG Field | Required | Notes |
|----------------|-----------|----------|-------|
| Client Name / Site Name | `site_id` | ✅ Yes | Match existing site |
| Service / Service Name | `services[]` | ✅ Yes | Match service catalog |
| Date | `booking_date` | ✅ Yes | Format: YYYY-MM-DD |
| Time | `booking_time` | ❌ No | Format: HH:MM |
| Status | `status` | ❌ No | Default: 'pending' |
| Notes | `notes` | ❌ No | |

---

## 🔧 Technical Implementation

### **File Structure:**
```
js/
  ├── csv-import.js (main import logic)
  ├── csv-validator.js (validation functions)
  ├── csv-mapper.js (column mapping)
  └── csv-parser.js (CSV parsing)

settings.html (add import section)
```

### **Libraries:**
- **CSV Parser:** Use `Papaparse` (lightweight, browser-based)
  ```html
  <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
  ```

### **Import Steps (Detailed):**

#### **Step 1: File Upload**
```javascript
function handleFileUpload(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      const data = results.data;
      const errors = results.errors;
      // Process data
    }
  });
}
```

#### **Step 2: Auto-Detect Column Mapping**
```javascript
function autoDetectMapping(csvHeaders, importType) {
  const fieldMappings = {
    'sites': {
      'site name': 'name',
      'name': 'name',
      'address': 'address',
      'street address': 'address',
      // ... more mappings
    }
  };
  
  // Fuzzy match CSV headers to NFG fields
  // Return mapping object
}
```

#### **Step 3: Data Validation**
```javascript
async function validateImportData(data, importType, mappings) {
  const errors = [];
  const warnings = [];
  
  // Required field checks
  // Data type validation
  // Reference validation (sites exist, users exist)
  // Duplicate checks
  
  return { errors, warnings, validRows: [] };
}
```

#### **Step 4: Batch Import**
```javascript
async function importData(validRows, importType, mappings) {
  const BATCH_SIZE = 10; // Import 10 at a time
  const results = { success: 0, failed: 0, errors: [] };
  
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    
    // Import batch
    // Update progress
    // Handle errors
  }
  
  return results;
}
```

---

## 🎨 UI Components

### **1. Import Type Selector**
```html
<div class="import-type-selector">
  <h3>What would you like to import?</h3>
  <div class="grid grid-cols-2 gap-4">
    <button class="import-type-btn" data-type="sites">
      <i data-lucide="building"></i>
      <span>Sites</span>
    </button>
    <button class="import-type-btn" data-type="jobs">
      <i data-lucide="clipboard-list"></i>
      <span>Jobs</span>
    </button>
    <!-- More options -->
  </div>
</div>
```

### **2. File Upload Area**
```html
<div class="csv-upload-area">
  <input type="file" accept=".csv" id="csv-file-input" />
  <div class="upload-dropzone">
    <i data-lucide="upload-cloud"></i>
    <p>Drag & drop CSV file here or click to browse</p>
    <p class="text-sm text-gray-500">Maximum file size: 10MB</p>
  </div>
  <a href="/templates/sites-import-template.csv" download>Download Template</a>
</div>
```

### **3. Column Mapping Interface**
```html
<div class="column-mapping">
  <h3>Map CSV Columns to NFG Fields</h3>
  <table>
    <thead>
      <tr>
        <th>CSV Column</th>
        <th>NFG Field</th>
        <th>Sample Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Site Name</td>
        <td>
          <select>
            <option value="name" selected>Site Name</option>
            <option value="address">Address</option>
            <!-- More options -->
          </select>
        </td>
        <td>ABC Office</td>
      </tr>
    </tbody>
  </table>
</div>
```

### **4. Validation Preview**
```html
<div class="validation-preview">
  <h3>Import Preview</h3>
  <div class="validation-stats">
    <span class="text-green-600">✅ 45 rows valid</span>
    <span class="text-yellow-600">⚠️ 3 rows have warnings</span>
    <span class="text-red-600">❌ 2 rows have errors</span>
  </div>
  
  <div class="preview-table">
    <!-- Show first 10 rows with validation indicators -->
  </div>
  
  <div class="errors-list">
    <!-- Show errors with row numbers -->
  </div>
</div>
```

### **5. Progress Indicator**
```html
<div class="import-progress">
  <div class="progress-bar">
    <div class="progress-fill" style="width: 46%"></div>
  </div>
  <p>Importing... 23/50 rows</p>
</div>
```

### **6. Results Summary**
```html
<div class="import-results">
  <h3>Import Complete!</h3>
  <div class="results-stats">
    <div class="stat success">
      <span class="count">45</span>
      <span class="label">Successfully Imported</span>
    </div>
    <div class="stat warning">
      <span class="count">3</span>
      <span class="label">Skipped (warnings)</span>
    </div>
    <div class="stat error">
      <span class="count">2</span>
      <span class="label">Failed (errors)</span>
    </div>
  </div>
  
  <button class="download-report-btn">Download Error Report (CSV)</button>
</div>
```

---

## 🗄️ Database Considerations

### **Batch Insert Strategy:**
```javascript
// Import sites in batches
async function importSites(sites) {
  const BATCH_SIZE = 50;
  const results = [];
  
  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE);
    
    const { data, error } = await supabase
      .from('sites')
      .insert(batch)
      .select();
    
    if (error) {
      // Handle batch errors
      // Track which rows failed
    } else {
      results.push(...data);
    }
  }
  
  return results;
}
```

### **Error Handling:**
- **Duplicate detection** - Check before insert
- **Reference validation** - Ensure related data exists
- **Transaction rollback** - For critical imports, use transactions
- **Partial success** - Import what works, report what doesn't

---

## 📝 CSV Template Files

### **Create Downloadable Templates:**
- `sites-import-template.csv`
- `jobs-import-template.csv`
- `users-import-template.csv`
- `bookings-import-template.csv`

**Location:** `/templates/` directory or served from Supabase Storage

---

## 🔍 Validation Rules by Import Type

### **Sites Import:**
- ✅ Site name required
- ✅ Address required
- ✅ Site name must be unique (within import + existing)
- ⚠️ Email format validation (if provided)
- ⚠️ Phone format validation (if provided)

### **Users Import:**
- ✅ Full name required
- ✅ Email required
- ✅ Email must be unique
- ✅ Email must be valid format
- ✅ Role must be valid (staff, admin, client)
- ⚠️ Phone format validation

### **Jobs Import:**
- ✅ Title required
- ✅ Site name required (must exist or be in import)
- ✅ Scheduled date must be valid format
- ✅ Status must be valid (pending, in-progress, completed, cancelled)
- ✅ Worker email must exist (or create option)
- ⚠️ Date in past (warning for historical jobs)

### **Bookings Import:**
- ✅ Client/Site name required (must exist)
- ✅ Service name required (must exist in catalog)
- ✅ Date required
- ✅ Date must be valid format
- ⚠️ Date in past (warning)
- ⚠️ Duplicate booking detection

---

## 🚀 Implementation Phases

### **Phase 1: Sites Import** (Week 1)
**Priority:** Highest - Sites are foundation for everything

**Tasks:**
1. Create CSV import modal UI
2. Add file upload handler
3. Implement CSV parser (Papaparse)
4. Build column auto-detection
5. Build column mapping interface
6. Implement validation for sites
7. Build batch import logic
8. Add progress indicator
9. Create results summary
10. Generate error report download

**Files to Create:**
- `settings.html` - Add import section
- `js/csv-import.js` - Main import logic
- `js/csv-validator.js` - Validation functions
- `js/csv-mapper.js` - Column mapping
- `js/csv-parser.js` - CSV parsing (or use Papaparse)
- `templates/sites-import-template.csv` - Template file

**Files to Modify:**
- `settings.html` - Add import button and modal
- `js/ui.js` or `js/sites.js` - Add import function

---

### **Phase 2: Users Import** (Week 2)
**Priority:** High - Need to import team members

**Tasks:**
1. Extend import modal for users
2. Add user validation logic
3. Handle duplicate email detection
4. Add auto-invite option
5. Create user template CSV

---

### **Phase 3: Jobs Import** (Week 2-3)
**Priority:** High - Historical data important

**Tasks:**
1. Extend import modal for jobs
2. Add site lookup/matching
3. Add worker lookup/matching
4. Handle date parsing (multiple formats)
5. Add task import (optional - nested CSV)
6. Create jobs template CSV

---

### **Phase 4: Bookings Import** (Week 3)
**Priority:** Medium - Future scheduled work

**Tasks:**
1. Extend import modal for bookings
2. Add service catalog matching
3. Handle service selection
4. Create bookings template CSV

---

### **Phase 5: Inventory Import** (Week 4)
**Priority:** Medium - Supporting data

**Tasks:**
1. Inventory items import
2. Inventory stock levels import (per site)
3. Handle category matching
4. Create inventory templates

---

## 🎯 Success Criteria

### **Must Have:**
- ✅ Upload CSV file
- ✅ Auto-detect column mapping
- ✅ Manual column mapping (if auto-detect fails)
- ✅ Data validation before import
- ✅ Preview data before import
- ✅ Batch import with progress
- ✅ Error reporting
- ✅ Download error report
- ✅ Import success/failure summary

### **Nice to Have:**
- ✅ Template downloads
- ✅ Import history (track past imports)
- ✅ Undo import (delete imported data)
- ✅ Update existing records option
- ✅ Fuzzy matching for sites/users
- ✅ Date format auto-detection
- ✅ Large file handling (>1000 rows)
- ✅ Resume failed import

---

## 📦 Required Dependencies

### **JavaScript Libraries:**
1. **PapaParse** - CSV parsing
   ```html
   <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
   ```

2. **Fuzzy Matching** (optional) - For column auto-detection
   ```html
   <script src="https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js"></script>
   ```

---

## 🐛 Error Handling

### **Common Errors:**
1. **Invalid CSV format** - Show error, allow retry
2. **Missing required columns** - Show which columns missing
3. **Invalid data types** - Highlight problematic cells
4. **Duplicate records** - Offer to skip or update
5. **Reference errors** - Site doesn't exist, user doesn't exist
6. **Large file** - Warn if >1000 rows, suggest splitting
7. **Network errors** - Retry failed batches

### **Error Report Format:**
```csv
Row Number,CSV Data,Error Type,Error Message,NFG Field
3,"ABC Office","Missing Required Field","Address is required","address"
5,"XYZ Site","Reference Error","Site 'XYZ Site' not found","site_id"
```

---

## 🔒 Security & Permissions

### **Access Control:**
- Only admins can import data
- Import logs stored (who imported what, when)
- Rate limiting (prevent abuse)

### **Data Validation:**
- Sanitize all input
- Validate file size (<10MB)
- Validate file type (CSV only)
- Validate data types before insert

---

## 📊 Import Statistics

### **Track Import History:**
```sql
CREATE TABLE import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  import_type TEXT NOT NULL, -- 'sites', 'jobs', 'users', etc.
  file_name TEXT,
  total_rows INT,
  successful_rows INT,
  failed_rows INT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  error_report_url TEXT -- Link to error report in storage
);
```

---

## 🎨 UI/UX Best Practices

### **Wizard-Style Flow:**
1. Step indicator (1 of 5, 2 of 5, etc.)
2. Back/Next buttons
3. Save progress (optional - allow cancel/resume)
4. Clear error messages
5. Helpful hints at each step

### **Validation Feedback:**
- ✅ Green checkmarks for valid rows
- ⚠️ Yellow warnings for fixable issues
- ❌ Red errors for blocking issues
- Hover over icons to see details

### **Progress Feedback:**
- Real-time progress bar
- "Importing row 23 of 50..."
- Estimated time remaining
- Can cancel during import

---

## 🧪 Testing Checklist

### **Test Cases:**
1. ✅ Upload valid CSV - should work
2. ✅ Upload invalid CSV format - should show error
3. ✅ Missing required columns - should show which missing
4. ✅ Duplicate records - should handle gracefully
5. ✅ Invalid data types - should show errors
6. ✅ Reference errors (site doesn't exist) - should show warnings
7. ✅ Large file (1000+ rows) - should handle batching
8. ✅ Network error during import - should retry/resume
9. ✅ Cancel during import - should stop cleanly
10. ✅ Download error report - should generate CSV

---

## 📝 Example Workflows

### **Scenario 1: Client Migrating 200 Sites**
1. Admin downloads sites template
2. Client fills template with their site data
3. Admin uploads CSV
4. System auto-detects columns (90% match)
5. Admin adjusts 2 column mappings manually
6. System validates: 195 valid, 5 have errors
7. Admin fixes errors in CSV
8. Re-upload, all 200 valid
9. Import completes in 30 seconds
10. Success! All sites imported

### **Scenario 2: Importing Historical Jobs**
1. Admin uploads jobs CSV
2. Some sites don't exist yet
3. System shows: "15 sites not found - create them?"
4. Admin says yes, system creates sites first
5. Then imports jobs
6. Some worker emails don't exist
7. System offers: "Create users or skip jobs?"
8. Admin chooses create users (with staff role)
9. All jobs imported successfully

---

## 🚀 Quick Start Implementation

### **Step 1: Create Import Modal (2-3 hours)**
- Add import button to Settings
- Create modal HTML structure
- Add file upload area
- Style with Tailwind

### **Step 2: CSV Parsing (2-3 hours)**
- Integrate PapaParse
- Parse uploaded file
- Extract headers and data
- Handle errors

### **Step 3: Column Mapping (4-6 hours)**
- Auto-detect column matches
- Manual mapping interface
- Save mapping for reuse

### **Step 4: Validation (4-6 hours)**
- Required field checks
- Data type validation
- Reference validation
- Duplicate detection

### **Step 5: Import Logic (4-6 hours)**
- Batch insert logic
- Progress tracking
- Error handling
- Results summary

### **Step 6: Error Reporting (2-3 hours)**
- Generate error report CSV
- Download functionality
- Link in results

**Total Estimated Time:** 2-3 weeks for complete system

---

## 💡 Future Enhancements

### **Phase 2 Improvements:**
- **Excel Support** - Import .xlsx files (use SheetJS)
- **Google Sheets Integration** - Direct import from Google Sheets
- **Scheduled Imports** - Recurring imports (weekly sync)
- **API Import** - REST API for programmatic imports
- **Export & Re-import** - Export data, modify, re-import
- **Import Templates Library** - Pre-built templates for common platforms
- **Data Transformation** - Map fields with formulas/transformations
- **Preview Before Mapping** - See sample data before mapping columns

---

## 📋 Implementation Checklist

### **Phase 1: Sites Import**
- [ ] Add import section to Settings page
- [ ] Create import modal UI
- [ ] Integrate PapaParse library
- [ ] Build file upload handler
- [ ] Create column auto-detection
- [ ] Build column mapping interface
- [ ] Implement site validation
- [ ] Build batch import logic
- [ ] Add progress indicator
- [ ] Create results summary
- [ ] Generate error report
- [ ] Create sites template CSV
- [ ] Add import history tracking
- [ ] Test with various CSV formats

---

**Ready to start?** Let's begin with Phase 1: Sites Import! 🚀

This will be the foundation - once sites import works, we can replicate the pattern for other data types.

