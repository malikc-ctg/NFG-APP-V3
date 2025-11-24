// =====================================================
// CSV Import System
// Phase 1: Sites Import
// =====================================================

import { supabase } from './supabase.js';
import { toast, showConfirm } from './notifications.js';

// State management
let currentImportType = null;
let csvFile = null;
let csvData = null;
let csvHeaders = [];
let columnMapping = {};
let validationResults = null;
let currentStep = 1;
let existingSites = [];
let existingWorkers = []; // For jobs import - worker lookup by email
let existingJobs = []; // For jobs import - optional duplicate checking

// Step indicator elements (will be queried after DOM ready)
let stepIndicators = null;

// NFG field definitions for each import type
const FIELD_DEFINITIONS = {
  sites: {
    name: { label: 'Site Name', required: true, type: 'text' },
    address: { label: 'Address', required: true, type: 'text' },
    city: { label: 'City', required: false, type: 'text' },
    province: { label: 'State/Province', required: false, type: 'text' },
    postal_code: { label: 'Postal Code', required: false, type: 'text' },
    contact_name: { label: 'Contact Name', required: false, type: 'text' },
    contact_phone: { label: 'Contact Phone', required: false, type: 'text' },
    contact_email: { label: 'Contact Email', required: false, type: 'email' },
    notes: { label: 'Notes', required: false, type: 'text' },
    status: { label: 'Status', required: false, type: 'text', default: 'Active' },
    square_footage: { label: 'Square Footage', required: false, type: 'number' },
    deal_value: { label: 'Deal Value', required: false, type: 'number' }
  },
  jobs: {
    title: { label: 'Job Title', required: true, type: 'text' },
    site_name: { label: 'Site Name', required: true, type: 'text', lookup: 'site' },
    scheduled_date: { label: 'Scheduled Date', required: false, type: 'date' },
    status: { label: 'Status', required: false, type: 'text', default: 'pending' },
    worker_email: { label: 'Worker Email', required: false, type: 'email', lookup: 'worker' },
    priority: { label: 'Priority', required: false, type: 'text', default: 'medium' },
    job_type: { label: 'Job Type', required: false, type: 'text', default: 'cleaning' },
    description: { label: 'Description', required: false, type: 'text' },
    notes: { label: 'Notes', required: false, type: 'text' },
    estimated_hours: { label: 'Estimated Hours', required: false, type: 'number' }
  }
};

// Column name mappings for auto-detection
const COLUMN_MAPPINGS = {
  sites: {
    // Site name variations
    'site name': 'name',
    'name': 'name',
    'location': 'name',
    'location name': 'name',
    'site': 'name',
    'site_name': 'name',
    
    // Address variations
    'address': 'address',
    'street address': 'address',
    'street': 'address',
    'location address': 'address',
    'site address': 'address',
    
    // City variations
    'city': 'city',
    'town': 'city',
    
    // State/Province variations
    'state': 'province',
    'province': 'province',
    'state/province': 'province',
    'region': 'province',
    
    // Postal code variations
    'postal code': 'postal_code',
    'postal_code': 'postal_code',
    'zip code': 'postal_code',
    'zip': 'postal_code',
    'zipcode': 'postal_code',
    
    // Contact variations
    'contact name': 'contact_name',
    'contact_name': 'contact_name',
    'contact': 'contact_name',
    'contact person': 'contact_name',
    
    'contact phone': 'contact_phone',
    'contact_phone': 'contact_phone',
    'phone': 'contact_phone',
    'telephone': 'contact_phone',
    
    'contact email': 'contact_email',
    'contact_email': 'contact_email',
    'email': 'contact_email',
    'email address': 'contact_email',
    
    // Notes variations
    'notes': 'notes',
    'note': 'notes',
    'description': 'notes',
    'comments': 'notes',
    
    // Status variations
    'status': 'status',
    'site status': 'status',
    
    // Square footage variations
    'square footage': 'square_footage',
    'square_footage': 'square_footage',
    'sq ft': 'square_footage',
    'sqft': 'square_footage',
    'size': 'square_footage',
    
    // Deal value variations
    'deal value': 'deal_value',
    'deal_value': 'deal_value',
    'value': 'deal_value',
    'contract value': 'deal_value'
  },
  jobs: {
    // Title variations
    'title': 'title',
    'job title': 'title',
    'job_title': 'title',
    'job name': 'title',
    'name': 'title',
    'job': 'title',
    
    // Site name variations
    'site name': 'site_name',
    'site_name': 'site_name',
    'site': 'site_name',
    'location': 'site_name',
    'client name': 'site_name',
    'client': 'site_name',
    
    // Scheduled date variations
    'scheduled date': 'scheduled_date',
    'scheduled_date': 'scheduled_date',
    'date': 'scheduled_date',
    'schedule date': 'scheduled_date',
    'scheduled for': 'scheduled_date',
    'due date': 'scheduled_date',
    'due_date': 'scheduled_date',
    
    // Status variations
    'status': 'status',
    'job status': 'status',
    'state': 'status',
    
    // Worker email variations
    'worker email': 'worker_email',
    'worker_email': 'worker_email',
    'assigned to': 'worker_email',
    'assigned_to': 'worker_email',
    'worker': 'worker_email',
    'employee email': 'worker_email',
    'employee_email': 'worker_email',
    'assigned worker': 'worker_email',
    
    // Priority variations
    'priority': 'priority',
    'job priority': 'priority',
    'urgency': 'priority',
    
    // Job type variations
    'job type': 'job_type',
    'job_type': 'job_type',
    'type': 'job_type',
    'category': 'job_type',
    
    // Description/Notes variations
    'description': 'description',
    'desc': 'description',
    'notes': 'notes',
    'note': 'notes',
    'comments': 'notes',
    
    // Estimated hours variations
    'estimated hours': 'estimated_hours',
    'estimated_hours': 'estimated_hours',
    'hours': 'estimated_hours',
    'estimated time': 'estimated_hours',
    'duration': 'estimated_hours'
  }
};

// Initialize CSV import system
function initCSVImport() {
  console.log('📥 CSV Import System Initializing...');
  
  // Check if PapaParse is loaded
  if (typeof window.Papa === 'undefined') {
    console.error('❌ PapaParse library not loaded. Please check the script tag in settings.html');
    console.log('Available on window:', Object.keys(window).filter(k => k.toLowerCase().includes('papa')));
    return;
  }
  console.log('✅ PapaParse loaded');
  
  // Check if modal exists
  const modal = document.getElementById('csv-import-modal');
  if (!modal) {
    console.error('❌ CSV import modal not found in DOM');
    return;
  }
  console.log('✅ CSV import modal found');
  
  // Query step indicators now that DOM might be ready
  stepIndicators = document.querySelectorAll('.step-indicator[data-step]');
  console.log(`✅ Found ${stepIndicators.length} step indicators`);
  
  // Open import modal button
  const openBtn = document.getElementById('open-import-modal-btn');
  if (!openBtn) {
    console.error('❌ Import modal button not found');
    const allButtons = Array.from(document.querySelectorAll('button')).map(b => ({ id: b.id, text: b.textContent?.substring(0, 20) }));
    console.log('Available buttons:', allButtons);
    return;
  }
  console.log('✅ Import button found:', openBtn);
  
  // Remove any existing listeners by cloning (prevents duplicates)
  const newOpenBtn = openBtn.cloneNode(true);
  if (openBtn.parentNode) {
    openBtn.parentNode.replaceChild(newOpenBtn, openBtn);
  } else {
    console.warn('⚠️ Button has no parent, using original button');
  }
  
  // Add click listener
  const targetBtn = newOpenBtn.parentNode ? newOpenBtn : openBtn;
  targetBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔵 Import button clicked! Opening modal...');
    openImportModal();
  });
  
  // Also add a direct onclick handler as backup
  targetBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔵 Import button onclick handler fired!');
    openImportModal();
  };
  
  console.log('✅ Import button listener attached to:', targetBtn);
  
  // Close modal buttons
  const closeModalBtn = document.getElementById('close-import-modal');
  const cancelBtn = document.getElementById('import-cancel-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeImportModal);
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeImportModal);
  }
  
  // Navigation buttons
  const backBtn = document.getElementById('import-back-btn');
  const nextBtn = document.getElementById('import-next-btn');
  const confirmBtn = document.getElementById('import-confirm-btn');
  
  if (backBtn) {
    backBtn.addEventListener('click', goToPreviousStep);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', goToNextStep);
  }
  if (confirmBtn) {
    confirmBtn.addEventListener('click', startImport);
  }
  
  // Import type selection
  document.querySelectorAll('.import-type-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = e.currentTarget.dataset.type;
      if (!e.currentTarget.disabled) {
        selectImportType(type);
      }
    });
  });
  
  // File upload
  const csvFileInput = document.getElementById('csv-file-input');
  const browseCsvBtn = document.getElementById('browse-csv-btn');
  const csvUploadArea = document.getElementById('csv-upload-area');
  const removeCsvFile = document.getElementById('remove-csv-file');
  
  csvFileInput?.addEventListener('change', handleFileSelect);
  browseCsvBtn?.addEventListener('click', () => csvFileInput?.click());
  
  // Drag and drop
  csvUploadArea?.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-nfgblue', 'bg-nfglight');
  });
  
  csvUploadArea?.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-nfgblue', 'bg-nfglight');
  });
  
  csvUploadArea?.addEventListener('drop', (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-nfgblue', 'bg-nfglight');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
      csvFileInput.files = e.dataTransfer.files;
      handleFileSelect({ target: csvFileInput });
    } else {
      toast.error('Please upload a CSV file');
    }
  });
  
  removeCsvFile?.addEventListener('click', () => {
    csvFile = null;
    csvData = null;
    csvHeaders = [];
    csvFileInput.value = '';
    document.getElementById('csv-file-info').classList.add('hidden');
    document.getElementById('csv-upload-area').classList.remove('hidden');
  });
  
  // Template download
  const templateBtn = document.getElementById('download-template-btn');
  if (templateBtn) {
    templateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      downloadTemplate();
    });
  }
  
  console.log('✅ CSV Import System fully initialized - all event listeners attached');
}

// Open import modal
function openImportModal() {
  console.log('🔵 openImportModal() called');
  const modal = document.getElementById('csv-import-modal');
  if (!modal) {
    console.error('❌ Modal not found!');
    toast.error('Import modal not found. Please refresh the page.');
    return;
  }
  
  console.log('✅ Opening modal...');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  // Reinitialize Lucide icons for the modal
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Reset to step 1
  resetImport();
  currentStep = 1;
  updateStepIndicator();
  
  // Load existing sites for validation (always needed)
  loadExistingSites();
  
  console.log('✅ Modal opened successfully');
}

// Close import modal
function closeImportModal() {
  const modal = document.getElementById('csv-import-modal');
  if (!modal) return;
  
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  resetImport();
}

// Reset import state
function resetImport() {
  currentImportType = null;
  csvFile = null;
  csvData = null;
  csvHeaders = [];
  columnMapping = {};
  validationResults = null;
  currentStep = 1;
  
  // Reset UI
  document.querySelectorAll('.import-step').forEach(step => {
    step.classList.add('hidden');
    step.classList.remove('active');
  });
  
  document.getElementById('import-step-1')?.classList.remove('hidden');
  document.getElementById('import-step-1')?.classList.add('active');
  
  document.getElementById('csv-file-info')?.classList.add('hidden');
  document.getElementById('csv-upload-area')?.classList.remove('hidden');
  
  // Reset buttons
  document.getElementById('import-back-btn')?.classList.add('hidden');
  document.getElementById('import-next-btn')?.classList.add('hidden');
  document.getElementById('import-confirm-btn')?.classList.add('hidden');
}

// Select import type
function selectImportType(type) {
  currentImportType = type;
  document.querySelectorAll('.import-type-btn').forEach(btn => {
    if (btn.dataset.type === type) {
      btn.classList.add('border-nfgblue', 'bg-nfglight');
    } else {
      btn.classList.remove('border-nfgblue', 'bg-nfglight');
    }
  });
  
  // Enable Next button
  document.getElementById('import-next-btn')?.classList.remove('hidden');
  
  // Update template download link
  const templateBtn = document.getElementById('download-template-btn');
  if (templateBtn) {
    templateBtn.href = `#template-${type}`;
  }
  
  // Load additional data needed for validation
  if (type === 'jobs') {
    loadExistingWorkers();
  }
  
  toast.success(`Selected: ${type.charAt(0).toUpperCase() + type.slice(1)} import`);
}

// Handle file selection
function handleFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  // Validate file type
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    toast.error('Please upload a CSV file');
    return;
  }
  
  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    toast.error('File size must be less than 10MB');
    return;
  }
  
  csvFile = file;
  
  // Show file info
  document.getElementById('csv-file-name').textContent = file.name;
  document.getElementById('csv-file-size').textContent = formatFileSize(file.size);
  document.getElementById('csv-file-info').classList.remove('hidden');
  document.getElementById('csv-upload-area').classList.add('hidden');
  
  // Parse CSV
  parseCSV(file);
}

// Parse CSV file
function parseCSV(file) {
  if (!window.Papa) {
    toast.error('CSV parser not loaded. Please refresh the page.');
    return;
  }
  
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length > 0) {
        console.error('CSV parsing errors:', results.errors);
        toast.error('Error parsing CSV file. Please check the format.');
        return;
      }
      
      if (!results.data || results.data.length === 0) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }
      
      csvData = results.data;
      csvHeaders = Object.keys(results.data[0]);
      
      console.log(`✅ CSV parsed: ${csvData.length} rows, ${csvHeaders.length} columns`);
      console.log('CSV Headers:', csvHeaders);
      console.log('First row sample:', csvData[0]);
      
      toast.success(`CSV file loaded: ${csvData.length} rows`);
      
      // Auto-detect column mapping
      autoDetectColumnMapping();
      
      // Move to step 3 (column mapping)
      goToStep(3);
    },
    error: (error) => {
      console.error('CSV parsing error:', error);
      toast.error('Error parsing CSV file: ' + error.message);
    }
  });
}

// Auto-detect column mapping
function autoDetectColumnMapping() {
  if (!currentImportType || !csvHeaders.length) return;
  
  const mappings = COLUMN_MAPPINGS[currentImportType] || {};
  const detected = {};
  
  csvHeaders.forEach(header => {
    const normalized = header.toLowerCase().trim();
    
    // Check exact match
    if (mappings[normalized]) {
      detected[header] = mappings[normalized];
      return;
    }
    
    // Check partial match
    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        detected[header] = value;
        return;
      }
    }
    
    // No match found
    detected[header] = '';
  });
  
  columnMapping = detected;
  console.log('Auto-detected mapping:', columnMapping);
  
  renderColumnMapping();
}

// Render column mapping interface
function renderColumnMapping() {
  if (!currentImportType) return;
  
  const tbody = document.getElementById('column-mapping-table');
  if (!tbody) return;
  
  const fields = FIELD_DEFINITIONS[currentImportType];
  const fieldOptions = Object.keys(fields).map(key => ({
    value: key,
    label: fields[key].label,
    required: fields[key].required
  }));
  
  tbody.innerHTML = '';
  
  csvHeaders.forEach(header => {
    const row = document.createElement('tr');
    row.className = 'border-b border-nfgray dark:border-gray-700';
    
    // Sample value (from first row)
    const sampleValue = csvData[0] && csvData[0][header] ? csvData[0][header] : '';
    
    row.innerHTML = `
      <td class="p-3 font-medium">${escapeHtml(header)}</td>
      <td class="p-3">
        <select class="column-mapping-select w-full border border-nfgray dark:border-gray-600 dark:bg-gray-700 rounded-xl p-2 focus:ring-2 focus:ring-nfgblue outline-none" data-header="${escapeHtml(header)}">
          <option value="">-- Skip this column --</option>
          ${fieldOptions.map(field => `
            <option value="${field.value}" ${columnMapping[header] === field.value ? 'selected' : ''}>
              ${field.label}${field.required ? ' (Required)' : ''}
            </option>
          `).join('')}
        </select>
      </td>
      <td class="p-3 text-sm text-gray-500 dark:text-gray-400">${escapeHtml(sampleValue).substring(0, 50)}${sampleValue.length > 50 ? '...' : ''}</td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Attach change listeners
  tbody.querySelectorAll('.column-mapping-select').forEach(select => {
    select.addEventListener('change', (e) => {
      const header = e.target.dataset.header;
      columnMapping[header] = e.target.value;
    });
  });
  
  lucide.createIcons();
}

// Validate import data
async function validateImportData() {
  if (!currentImportType || !csvData || !columnMapping) return;
  
  const fields = FIELD_DEFINITIONS[currentImportType];
  const errors = [];
  const warnings = [];
  const validRows = [];
  
  // Get required fields
  const requiredFields = Object.keys(fields).filter(key => fields[key].required);
  
  csvData.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index is 0-based and we skip header row
    const rowErrors = [];
    const rowWarnings = [];
    const mappedRow = {};
    
    // Map columns
    Object.keys(columnMapping).forEach(csvHeader => {
      const nfgField = columnMapping[csvHeader];
      if (nfgField) {
        mappedRow[nfgField] = row[csvHeader];
      }
    });
    
    // Validate required fields
    requiredFields.forEach(field => {
      if (!mappedRow[field] || String(mappedRow[field]).trim() === '') {
        rowErrors.push(`Missing required field: ${fields[field].label}`);
      }
    });
    
    // Import-type specific validation
    if (currentImportType === 'sites') {
      // Validate site name uniqueness (check against existing sites)
      if (mappedRow.name) {
        const siteName = String(mappedRow.name).trim();
        const isDuplicate = existingSites.some(site => site.name.toLowerCase() === siteName.toLowerCase());
        
        // Check for duplicates within the import
        const duplicateInImport = csvData.slice(0, index).some((otherRow, otherIndex) => {
          const otherMappedRow = {};
          Object.keys(columnMapping).forEach(header => {
            const field = columnMapping[header];
            if (field) otherMappedRow[field] = otherRow[header];
          });
          return otherMappedRow.name && String(otherMappedRow.name).trim().toLowerCase() === siteName.toLowerCase();
        });
        
        if (duplicateInImport) {
          rowErrors.push(`Duplicate site name in CSV: "${siteName}"`);
        } else if (isDuplicate) {
          rowWarnings.push(`Site name already exists: "${siteName}"`);
        }
      }
      
      // Validate email format if provided
      if (mappedRow.contact_email && mappedRow.contact_email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mappedRow.contact_email.trim())) {
          rowWarnings.push(`Invalid email format: "${mappedRow.contact_email}"`);
        }
      }
      
      // Validate status if provided
      if (mappedRow.status && mappedRow.status.trim()) {
        const validStatuses = ['Active', 'In Setup', 'Paused', 'Inactive'];
        if (!validStatuses.includes(mappedRow.status.trim())) {
          rowWarnings.push(`Invalid status: "${mappedRow.status}". Will default to "Active"`);
          mappedRow.status = 'Active';
        }
      }
      
      // Validate numeric fields
      if (mappedRow.square_footage && isNaN(Number(mappedRow.square_footage))) {
        rowWarnings.push(`Invalid square footage: "${mappedRow.square_footage}"`);
        delete mappedRow.square_footage;
      }
      
      if (mappedRow.deal_value && isNaN(Number(mappedRow.deal_value))) {
        rowWarnings.push(`Invalid deal value: "${mappedRow.deal_value}"`);
        delete mappedRow.deal_value;
      }
    } else if (currentImportType === 'jobs') {
      // Jobs-specific validation
      
      // Validate site lookup
      if (mappedRow.site_name) {
        const siteName = String(mappedRow.site_name).trim();
        const site = findSiteByName(siteName);
        
        if (!site) {
          rowErrors.push(`Site not found: "${siteName}". Please create the site first or check the site name.`);
        } else {
          // Replace site_name with site_id for import
          mappedRow.site_id = site.id;
          delete mappedRow.site_name;
        }
      }
      
      // Validate worker email lookup
      if (mappedRow.worker_email && mappedRow.worker_email.trim()) {
        const email = String(mappedRow.worker_email).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email)) {
          rowWarnings.push(`Invalid email format: "${mappedRow.worker_email}"`);
        } else {
          const worker = findWorkerByEmail(email);
          if (!worker) {
            rowWarnings.push(`Worker not found: "${email}". Job will be imported without assignment.`);
          } else {
            // Replace worker_email with assigned_worker_id
            mappedRow.assigned_worker_id = worker.id;
            delete mappedRow.worker_email;
          }
        }
      }
      
      // Parse and validate scheduled date
      if (mappedRow.scheduled_date && mappedRow.scheduled_date.trim()) {
        const parsedDate = parseDate(mappedRow.scheduled_date);
        if (!parsedDate) {
          rowWarnings.push(`Invalid date format: "${mappedRow.scheduled_date}". Supported formats: YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY`);
        } else {
          mappedRow.scheduled_date = parsedDate;
          
          // Warning if date is in the past (historical jobs are okay)
          const dateObj = new Date(parsedDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (dateObj < today) {
            rowWarnings.push(`Date is in the past: "${parsedDate}"`);
          }
        }
      }
      
      // Validate status
      if (mappedRow.status && mappedRow.status.trim()) {
        const validStatuses = ['pending', 'in-progress', 'completed', 'cancelled'];
        const normalizedStatus = mappedRow.status.trim().toLowerCase().replace(' ', '-');
        
        if (!validStatuses.includes(normalizedStatus)) {
          rowWarnings.push(`Invalid status: "${mappedRow.status}". Will default to "pending"`);
          mappedRow.status = 'pending';
        } else {
          mappedRow.status = normalizedStatus;
        }
      } else {
        mappedRow.status = 'pending'; // Default
      }
      
      // Validate priority
      if (mappedRow.priority && mappedRow.priority.trim()) {
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const normalizedPriority = mappedRow.priority.trim().toLowerCase();
        
        if (!validPriorities.includes(normalizedPriority)) {
          rowWarnings.push(`Invalid priority: "${mappedRow.priority}". Will default to "medium"`);
          mappedRow.priority = 'medium';
        } else {
          mappedRow.priority = normalizedPriority;
        }
      } else {
        mappedRow.priority = 'medium'; // Default
      }
      
      // Validate job_type
      if (mappedRow.job_type && mappedRow.job_type.trim()) {
        const validJobTypes = ['cleaning', 'maintenance', 'repair', 'inspection', 'emergency'];
        const normalizedJobType = mappedRow.job_type.trim().toLowerCase();
        
        if (!validJobTypes.includes(normalizedJobType)) {
          rowWarnings.push(`Invalid job type: "${mappedRow.job_type}". Will default to "cleaning"`);
          mappedRow.job_type = 'cleaning';
        } else {
          mappedRow.job_type = normalizedJobType;
        }
      } else {
        mappedRow.job_type = 'cleaning'; // Default
      }
      
      // Validate estimated_hours
      if (mappedRow.estimated_hours && mappedRow.estimated_hours.toString().trim()) {
        const hours = Number(mappedRow.estimated_hours);
        if (isNaN(hours) || hours < 0) {
          rowWarnings.push(`Invalid estimated hours: "${mappedRow.estimated_hours}"`);
          delete mappedRow.estimated_hours;
        } else {
          mappedRow.estimated_hours = hours;
        }
      }
      
      // Merge description and notes if both exist
      if (mappedRow.notes && mappedRow.description) {
        mappedRow.description = `${mappedRow.description}\n\n${mappedRow.notes}`;
        delete mappedRow.notes;
      } else if (mappedRow.notes && !mappedRow.description) {
        mappedRow.description = mappedRow.notes;
        delete mappedRow.notes;
      }
    }
    
    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        data: row,
        mapped: mappedRow,
        errors: rowErrors
      });
    } else {
      validRows.push({
        row: rowNumber,
        data: row,
        mapped: mappedRow,
        warnings: rowWarnings
      });
      
      if (rowWarnings.length > 0) {
        warnings.push({
          row: rowNumber,
          warnings: rowWarnings
        });
      }
    }
  });
  
  validationResults = {
    valid: validRows,
    errors,
    warnings
  };
  
  console.log('Validation results:', validationResults);
  
  // Update validation stats
  document.getElementById('valid-count').textContent = validRows.length;
  document.getElementById('warning-count').textContent = warnings.length;
  document.getElementById('error-count').textContent = errors.length;
  
  renderPreview();
}

// Render preview table
function renderPreview() {
  if (!validationResults || !csvData) return;
  
  const headersRow = document.getElementById('preview-table-headers');
  const tbody = document.getElementById('preview-table-body');
  const errorsDiv = document.getElementById('preview-errors');
  
  if (!headersRow || !tbody) return;
  
  // Clear previous content
  headersRow.innerHTML = '';
  tbody.innerHTML = '';
  errorsDiv.innerHTML = '';
  errorsDiv.classList.add('hidden');
  
  // Get mapped fields that are actually used
  const usedFields = new Set(Object.values(columnMapping).filter(f => f));
  const fieldDefs = FIELD_DEFINITIONS[currentImportType];
  
  // Render headers
  usedFields.forEach(field => {
    const th = document.createElement('th');
    th.className = 'text-left p-3 font-semibold text-sm';
    th.textContent = fieldDefs[field]?.label || field;
    headersRow.appendChild(th);
  });
  
  // Add status column
  const statusTh = document.createElement('th');
  statusTh.className = 'text-left p-3 font-semibold text-sm';
  statusTh.textContent = 'Status';
  headersRow.appendChild(statusTh);
  
  // Render first 10 valid rows
  const previewRows = validationResults.valid.slice(0, 10);
  
  previewRows.forEach((validRow, index) => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-nfgray dark:border-gray-700';
    
    // Render data columns
    usedFields.forEach(field => {
      const td = document.createElement('td');
      td.className = 'p-3 text-sm';
      td.textContent = validRow.mapped[field] || '';
      tr.appendChild(td);
    });
    
    // Status column
    const statusTd = document.createElement('td');
    statusTd.className = 'p-3 text-sm';
    
    let statusBadge = '<span class="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">✅ Valid</span>';
    
    if (validRow.warnings && validRow.warnings.length > 0) {
      statusBadge += `<span class="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 ml-2">⚠️ ${validRow.warnings.length} warning(s)</span>`;
    }
    
    statusTd.innerHTML = statusBadge;
    tr.appendChild(statusTd);
    
    tbody.appendChild(tr);
  });
  
  // Show error summary if there are errors
  if (validationResults.errors.length > 0) {
    errorsDiv.classList.remove('hidden');
    errorsDiv.innerHTML = `
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <h5 class="font-semibold text-red-900 dark:text-red-100 mb-2">⚠️ ${validationResults.errors.length} row(s) have errors:</h5>
        <ul class="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300 max-h-40 overflow-y-auto">
          ${validationResults.errors.slice(0, 10).map(err => `
            <li>Row ${err.row}: ${err.errors.join(', ')}</li>
          `).join('')}
          ${validationResults.errors.length > 10 ? `<li>... and ${validationResults.errors.length - 10} more</li>` : ''}
        </ul>
      </div>
    `;
  }
}

// Navigation functions
function goToNextStep() {
  if (currentStep === 1) {
    if (!currentImportType) {
      toast.error('Please select an import type');
      return;
    }
    goToStep(2);
  } else if (currentStep === 2) {
    if (!csvFile || !csvData) {
      toast.error('Please upload a CSV file first');
      return;
    }
    // Already at step 3 after parsing
  } else if (currentStep === 3) {
    // Validate and show preview
    validateImportData().then(() => {
      goToStep(4);
    });
  } else if (currentStep === 4) {
    // Can't proceed if there are errors
    if (validationResults.errors.length > 0) {
      toast.error('Please fix errors before importing');
      return;
    }
    
    // Show confirmation
    const itemType = currentImportType === 'sites' ? 'site(s)' : 'job(s)';
    const confirmMessage = `Import ${validationResults.valid.length} ${itemType}?\n\n${validationResults.warnings.length > 0 ? `⚠️ ${validationResults.warnings.length} row(s) have warnings.\n\n` : ''}`;
    showConfirm('Confirm Import', confirmMessage).then(confirmed => {
      if (confirmed) {
        startImport();
      }
    });
  }
}

function goToPreviousStep() {
  if (currentStep > 1) {
    goToStep(currentStep - 1);
  }
}

function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.import-step').forEach(s => {
    s.classList.add('hidden');
    s.classList.remove('active');
  });
  
  // Show current step
  const stepElement = document.getElementById(`import-step-${step}`);
  if (stepElement) {
    stepElement.classList.remove('hidden');
    stepElement.classList.add('active');
  }
  
  currentStep = step;
  updateStepIndicator();
  updateNavigationButtons();
}

function updateStepIndicator() {
  if (!stepIndicators) {
    stepIndicators = document.querySelectorAll('.step-indicator[data-step]');
  }
  if (!stepIndicators || stepIndicators.length === 0) return;
  
  stepIndicators.forEach(indicator => {
    const step = parseInt(indicator.dataset.step);
    if (step < currentStep) {
      indicator.classList.add('completed');
      indicator.classList.remove('active');
    } else if (step === currentStep) {
      indicator.classList.add('active');
      indicator.classList.remove('completed');
    } else {
      indicator.classList.remove('active', 'completed');
    }
  });
}

function updateNavigationButtons() {
  const backBtn = document.getElementById('import-back-btn');
  const nextBtn = document.getElementById('import-next-btn');
  const confirmBtn = document.getElementById('import-confirm-btn');
  
  // Back button
  if (currentStep > 1) {
    backBtn?.classList.remove('hidden');
  } else {
    backBtn?.classList.add('hidden');
  }
  
  // Next/Confirm buttons
  if (currentStep === 4) {
    nextBtn?.classList.add('hidden');
    if (validationResults && validationResults.errors.length === 0) {
      confirmBtn?.classList.remove('hidden');
    } else {
      confirmBtn?.classList.add('hidden');
    }
  } else if (currentStep < 5) {
    nextBtn?.classList.remove('hidden');
    confirmBtn?.classList.add('hidden');
  } else {
    nextBtn?.classList.add('hidden');
    confirmBtn?.classList.add('hidden');
  }
}

// Start import
async function startImport() {
  if (!validationResults || validationResults.valid.length === 0) {
    toast.error('No valid rows to import');
    return;
  }
  
  // Get current user ID - CRITICAL for multi-tenancy!
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    toast.error('Authentication error. Please log in again.');
    console.error('Error getting user:', userError);
    return;
  }
  
  const currentUserId = user.id;
  console.log(`📥 Importing ${currentImportType} for user:`, currentUserId);
  
  goToStep(5);
  
  const validRows = validationResults.valid;
  const BATCH_SIZE = 10;
  let imported = 0;
  let failed = 0;
  const failedRows = [];
  
  const progressBar = document.getElementById('import-progress-bar');
  const progressText = document.getElementById('import-progress-text');
  
  // Import in batches
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    
    // Prepare batch data based on import type
    const batchData = batch.map(row => {
      const item = { ...row.mapped };
      
      if (currentImportType === 'sites') {
        // Sites import
        // Set defaults
        if (!item.status) item.status = 'Active';
        
        // CRITICAL: Set created_by for multi-tenancy!
        item.created_by = currentUserId;
        
        // Clean up data
        Object.keys(item).forEach(key => {
          if (item[key] === '' || item[key] === null || item[key] === undefined) {
            delete item[key];
          } else if (typeof item[key] === 'string') {
            item[key] = item[key].trim();
          }
        });
        
        // Ensure created_by is always set (don't delete it)
        item.created_by = currentUserId;
      } else if (currentImportType === 'jobs') {
        // Jobs import
        // Set defaults
        if (!item.status) item.status = 'pending';
        if (!item.priority) item.priority = 'medium';
        if (!item.job_type) item.job_type = 'cleaning';
        
        // CRITICAL: Set created_by and user_id for multi-tenancy!
        item.created_by = currentUserId;
        item.user_id = currentUserId;
        
        // Clean up data
        Object.keys(item).forEach(key => {
          if (item[key] === '' || item[key] === null || item[key] === undefined) {
            // Don't delete assigned_worker_id if it's null (that's valid)
            if (key !== 'assigned_worker_id' && key !== 'created_by' && key !== 'user_id') {
              delete item[key];
            }
          } else if (typeof item[key] === 'string') {
            item[key] = item[key].trim();
          }
        });
        
        // Ensure created_by and user_id are always set
        item.created_by = currentUserId;
        item.user_id = currentUserId;
      }
      
      return item;
    });
    
    console.log(`📦 Batch data prepared:`, batchData.length, currentImportType);
    
    try {
      // Insert batch
      const tableName = currentImportType === 'sites' ? 'sites' : 'jobs';
      console.log(`💾 Inserting batch:`, batchData.length, tableName);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert(batchData)
        .select();
      
      if (error) {
        console.error('❌ Batch import error:', error);
        console.error('Batch data:', batchData);
        failed += batch.length;
        batch.forEach(row => {
          failedRows.push({
            row: row.row,
            data: row.mapped,
            error: error.message
          });
        });
      } else {
        const itemName = currentImportType === 'sites' ? 'sites' : 'jobs';
        const nameField = currentImportType === 'sites' ? 'name' : 'title';
        console.log(`✅ Successfully imported ${data.length} ${itemName}:`, data.map(item => item[nameField]));
        imported += data.length;
      }
      
      // Update progress
      const progress = ((i + batch.length) / validRows.length) * 100;
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${Math.min(i + batch.length, validRows.length)} / ${validRows.length}`;
      
    } catch (error) {
      console.error('Batch import exception:', error);
      failed += batch.length;
      batch.forEach(row => {
        failedRows.push({
          row: row.row,
          data: row.mapped,
          error: error.message
        });
      });
    }
  }
  
  // Show results
  goToStep(6);
  await renderImportResults(imported, failed, failedRows);
}

// Render import results
async function renderImportResults(imported, failed, failedRows) {
  const resultsDiv = document.getElementById('import-results');
  const errorReportDiv = document.getElementById('import-error-report');
  
  if (!resultsDiv) return;
  
  resultsDiv.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <div class="flex items-center gap-3">
          <i data-lucide="check-circle" class="w-8 h-8 text-green-600 dark:text-green-400"></i>
          <div>
            <p class="text-2xl font-bold text-green-900 dark:text-green-100">${imported}</p>
            <p class="text-sm text-green-700 dark:text-green-300">Successfully Imported</p>
          </div>
        </div>
      </div>
      ${failed > 0 ? `
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div class="flex items-center gap-3">
            <i data-lucide="x-circle" class="w-8 h-8 text-red-600 dark:text-red-400"></i>
            <div>
              <p class="text-2xl font-bold text-red-900 dark:text-red-100">${failed}</p>
              <p class="text-sm text-red-700 dark:text-red-300">Failed</p>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
    ${imported > 0 ? `
      <div class="flex justify-center mt-6">
        <button id="view-imported-items-btn" class="px-6 py-3 bg-nfgblue dark:bg-blue-900 text-white rounded-xl hover:bg-nfgdark transition inline-flex items-center gap-2 font-medium">
          <i data-lucide="${currentImportType === 'sites' ? 'building-2' : 'clipboard-list'}" class="w-5 h-5"></i>
          View Imported ${currentImportType === 'sites' ? 'Sites' : 'Jobs'}
        </button>
      </div>
    ` : ''}
  `;
  
  if (failedRows.length > 0 && errorReportDiv) {
    errorReportDiv.classList.remove('hidden');
    generateErrorReport(failedRows);
  }
  
  lucide.createIcons();
  
  // Show success message
  if (imported > 0) {
    const itemType = currentImportType === 'sites' ? 'site(s)' : 'job(s)';
    toast.success(`Import complete! ${imported} ${itemType} imported successfully.`);
  }
  
  // Refresh list if page is open
  if (currentImportType === 'sites') {
    await refreshSitesList();
  } else if (currentImportType === 'jobs') {
    // Refresh jobs list if jobs page is open
    if (window.location.pathname.includes('jobs.html') && typeof window.renderJobs === 'function') {
      await window.renderJobs();
    }
  }
  
  // Add click handler for "View Imported" button
  const viewBtn = document.getElementById('view-imported-items-btn');
  if (viewBtn) {
    viewBtn.addEventListener('click', async () => {
      if (currentImportType === 'sites') {
        // If already on sites page, just refresh and close modal
        if (window.location.pathname.includes('sites.html')) {
          if (typeof window.loadAndRenderSites === 'function') {
            await window.loadAndRenderSites();
            toast.success('Sites refreshed!');
          }
          closeImportModal();
        } else {
          // Navigate to sites page
          window.location.href = './sites.html';
        }
      } else if (currentImportType === 'jobs') {
        // If already on jobs page, just refresh and close modal
        if (window.location.pathname.includes('jobs.html')) {
          // Trigger jobs refresh if available
          if (typeof window.renderJobs === 'function') {
            await window.renderJobs();
            toast.success('Jobs refreshed!');
          }
          closeImportModal();
        } else {
          // Navigate to jobs page
          window.location.href = './jobs.html';
        }
      }
    });
  }
}

// Refresh sites list on the sites page
async function refreshSitesList() {
  console.log('🔄 Attempting to refresh sites list...');
  
  // Method 1: Use loadAndRenderSites if available (cleanest approach)
  if (typeof window.loadAndRenderSites === 'function') {
    console.log('✅ loadAndRenderSites found, calling it...');
    try {
      await window.loadAndRenderSites();
      console.log('✅ Sites list refreshed via loadAndRenderSites!');
      return;
    } catch (error) {
      console.error('❌ Error calling loadAndRenderSites:', error);
    }
  }
  
  // Method 2: Use fetchSites and renderSites separately
  if (typeof window.fetchSites === 'function' && typeof window.renderSites === 'function') {
    console.log('✅ Sites page functions found, refreshing...');
    try {
      // Get current user profile if available
      const currentUserProfile = window.currentUserProfile || null;
      
      // Fetch updated sites
      const sites = await window.fetchSites();
      console.log(`✅ Fetched ${sites.length} sites, rendering...`);
      
      // Render the updated sites list
      await window.renderSites(sites, { currentUserProfile });
      
      console.log('✅ Sites list refreshed successfully!');
      
      // Also update the allSites global variable if it exists
      if (typeof window !== 'undefined') {
        window.allSites = sites;
      }
      return;
    } catch (error) {
      console.error('❌ Error refreshing sites list:', error);
    }
  }
  
  // Method 3: Trigger refresh via storage event (for cross-tab communication)
  console.log('ℹ️ Sites page functions not available, triggering storage event...');
  try {
    localStorage.setItem('sites-refresh-trigger', Date.now().toString());
    // Remove it immediately so the event fires
    setTimeout(() => {
      localStorage.removeItem('sites-refresh-trigger');
    }, 100);
  } catch (e) {
    console.warn('Could not trigger cross-tab refresh:', e);
  }
}

// Generate error report CSV
function generateErrorReport(failedRows) {
  if (!failedRows || failedRows.length === 0) return;
  
  // Create CSV content
  const headers = ['Row Number', 'Site Name', 'Address', 'Error'];
  const rows = failedRows.map(failed => [
    failed.row,
    failed.data.name || '',
    failed.data.address || '',
    failed.error
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.getElementById('download-error-report');
  if (downloadLink) {
    downloadLink.href = url;
    downloadLink.download = `import-errors-${Date.now()}.csv`;
  }
}

// Load existing sites for validation
async function loadExistingSites() {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name');
    
    if (error) {
      console.error('Error loading existing sites:', error);
      return;
    }
    
    existingSites = data || [];
    console.log(`Loaded ${existingSites.length} existing sites for validation`);
  } catch (error) {
    console.error('Exception loading existing sites:', error);
  }
}

// Load existing workers (user_profiles) for jobs import
async function loadExistingWorkers() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name');
    
    if (error) {
      console.error('Error loading existing workers:', error);
      return;
    }
    
    existingWorkers = data || [];
    console.log(`Loaded ${existingWorkers.length} existing workers for validation`);
  } catch (error) {
    console.error('Exception loading existing workers:', error);
  }
}

// Find site by name (fuzzy matching)
function findSiteByName(siteName) {
  if (!siteName || !existingSites.length) return null;
  
  const normalized = String(siteName).trim().toLowerCase();
  
  // Exact match first
  let site = existingSites.find(s => s.name.toLowerCase() === normalized);
  if (site) return site;
  
  // Partial match
  site = existingSites.find(s => s.name.toLowerCase().includes(normalized) || normalized.includes(s.name.toLowerCase()));
  if (site) return site;
  
  return null;
}

// Find worker by email
function findWorkerByEmail(email) {
  if (!email || !existingWorkers.length) return null;
  
  const normalized = String(email).trim().toLowerCase();
  
  return existingWorkers.find(w => w.email && w.email.toLowerCase() === normalized) || null;
}

// Parse date from multiple formats
function parseDate(dateString) {
  if (!dateString || String(dateString).trim() === '') return null;
  
  const str = String(dateString).trim();
  
  // Try different date formats
  const formats = [
    // YYYY-MM-DD (ISO)
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY/MM/DD
    /^(\d{4})\/(\d{2})\/(\d{2})$/
  ];
  
  // Try ISO format first (most common for exports)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const date = new Date(str.split(' ')[0]); // Handle datetime strings
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
    }
  }
  
  // Try MM/DD/YYYY format
  const mmddyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mmddyyyy) {
    const month = mmddyyyy[1].padStart(2, '0');
    const day = mmddyyyy[2].padStart(2, '0');
    const year = mmddyyyy[3];
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Try DD/MM/YYYY format (if month > 12, it's probably DD/MM)
  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    // If first part > 12, it's probably day
    if (parseInt(ddmmyyyy[1]) > 12) {
      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }
  
  // Try native Date parsing as fallback
  const date = new Date(str);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }
  
  return null; // Invalid date
}

// Download template
function downloadTemplate() {
  if (!currentImportType) {
    toast.error('Please select an import type first');
    return;
  }
  
  const fields = FIELD_DEFINITIONS[currentImportType];
  const headers = Object.keys(fields).map(key => fields[key].label);
  
  // Create sample data (2 rows)
  const sampleData = [
    ['ABC Office', '123 Main St, Toronto, ON', 'Toronto', 'ON', 'M5H 1A1', 'John Doe', '(555) 123-4567', 'john@abc.com', 'Main office location', 'Active', '5000', '50000'],
    ['XYZ Warehouse', '456 Industrial Blvd, Mississauga, ON', 'Mississauga', 'ON', 'L5T 2B2', 'Jane Smith', '(555) 987-6543', 'jane@xyz.com', 'Storage facility', 'Active', '10000', '75000']
  ];
  
  const csvContent = [
    headers.join(','),
    ...sampleData.map(row => row.map(cell => `"${String(cell)}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentImportType}-import-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
  
  toast.success('Template downloaded!');
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize when DOM is ready
function waitForDOM() {
  const modal = document.getElementById('csv-import-modal');
  const openBtn = document.getElementById('open-import-modal-btn');
  
  if (modal && openBtn) {
    console.log('✅ DOM elements found, initializing CSV import...');
    try {
      initCSVImport();
    } catch (error) {
      console.error('❌ Error initializing CSV import:', error);
    }
  } else {
    console.log('⏳ Waiting for DOM elements... modal:', !!modal, 'button:', !!openBtn);
    // Only retry up to 50 times (5 seconds)
    if (typeof waitForDOM.retries === 'undefined') {
      waitForDOM.retries = 0;
    }
    waitForDOM.retries++;
    if (waitForDOM.retries < 50) {
      setTimeout(waitForDOM, 100);
    } else {
      console.error('❌ Failed to find DOM elements after 5 seconds. Modal:', !!modal, 'Button:', !!openBtn);
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - waiting for CSV import elements...');
    setTimeout(waitForDOM, 200);
  });
} else {
  // DOM already loaded
  console.log('📄 DOM already loaded - checking for CSV import elements...');
  setTimeout(waitForDOM, 200);
}

// Also export for manual initialization if needed
window.initCSVImport = initCSVImport;

