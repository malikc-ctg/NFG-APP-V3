// ============================================
// Mobile Inventory Scanner
// ============================================
// Phase 2.2: Mobile-optimized inventory scanning and usage tracking
// ============================================

import { supabase } from './supabase.js';
import { toast } from './notifications.js';
import { MobileBarcodeScanner } from './barcode-scanner.js';
import { BarcodeGenerator } from './barcode-generator.js';

// Global state
let currentUser = null;
let currentUserProfile = null;
let currentSiteId = null;
let currentSiteName = null;
let sitesList = [];
let scanner = null;
let jobsList = [];
let usagePhotos = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  await initMobileInventory();
});

async function initMobileInventory() {
  try {
    console.log('[Mobile Inventory] Initializing...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/index.html';
      return;
    }
    
    currentUser = user;
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    currentUserProfile = profile;
    
    // Load sites
    await loadSites();
    
    // Auto-select first site if available
    if (sitesList.length > 0 && !currentSiteId) {
      currentSiteId = sitesList[0].id;
      currentSiteName = sitesList[0].name;
      updateSiteSelector();
    }
    
    // Initialize scanner
    scanner = new MobileBarcodeScanner('barcode-scanner-container');
    
    // Attach event listeners
    attachEventListeners();
    
    // Check online/offline status
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    console.log('[Mobile Inventory] Initialized successfully');
  } catch (error) {
    console.error('[Mobile Inventory] Initialization failed:', error);
    toast.error('Failed to initialize. Please refresh the page.', 'Error');
  }
}

// Load sites for current user
async function loadSites() {
  try {
    let query = supabase.from('sites').select('*');
    
    // Filter by user role
    if (currentUserProfile?.role === 'staff') {
      // Staff can only see assigned sites
      const { data: assignments } = await supabase
        .from('worker_site_assignments')
        .select('site_id')
        .eq('worker_id', currentUser.id);
      
      if (assignments && assignments.length > 0) {
        const siteIds = assignments.map(a => a.site_id);
        query = query.in('id', siteIds);
      } else {
        sitesList = [];
        return;
      }
    } else {
      // Admin/Manager/Client see their own sites
      query = query.eq('created_by', currentUser.id);
    }
    
    const { data, error } = await query.order('name');
    
    if (error) throw error;
    
    sitesList = data || [];
    console.log('[Mobile Inventory] Loaded', sitesList.length, 'sites');
  } catch (error) {
    console.error('[Mobile Inventory] Failed to load sites:', error);
    toast.error('Failed to load sites', 'Error');
  }
}

// Update site selector display
function updateSiteSelector() {
  const siteNameEl = document.getElementById('current-site-name');
  if (siteNameEl) {
    siteNameEl.textContent = currentSiteName || 'Select Site';
  }
}

// Attach event listeners
function attachEventListeners() {
  // Site selector
  document.getElementById('site-selector-btn')?.addEventListener('click', openSiteSelector);
  
  // Scanner controls
  document.getElementById('upload-btn')?.addEventListener('click', openFileUpload);
  document.getElementById('manual-entry-btn')?.addEventListener('click', openManualEntry);
  document.getElementById('list-view-btn')?.addEventListener('click', showInventoryList);
  document.getElementById('flash-toggle')?.addEventListener('click', toggleFlash);
  
  // Manual entry
  document.getElementById('manual-entry-submit')?.addEventListener('click', handleManualEntry);
  document.getElementById('manual-entry-cancel')?.addEventListener('click', closeManualEntry);
  
  // File input (hidden)
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.addEventListener('change', handleFileUpload);
  document.body.appendChild(fileInput);
  window.mobileFileInput = fileInput;
  
  // Start scanner when page is ready
  if (currentSiteId) {
    startScanner();
  }
}

// Start barcode scanner
async function startScanner() {
  if (!scanner || !currentSiteId) {
    toast.warning('Please select a site first', 'Site Required');
    return;
  }
  
  try {
    const hasPermission = await scanner.init();
    if (!hasPermission) {
      toast.error('Camera permission denied. Please enable camera access.', 'Permission Required');
      return;
    }
    
    await scanner.startScanning(
      async (decodedText, decodedResult) => {
        console.log('[Mobile Inventory] Scanned:', decodedText);
        await handleBarcodeScan(decodedText);
      },
      (error) => {
        console.error('[Mobile Inventory] Scanner error:', error);
      }
    );
    
    console.log('[Mobile Inventory] Scanner started');
  } catch (error) {
    console.error('[Mobile Inventory] Failed to start scanner:', error);
    toast.error('Failed to start camera. Please try again.', 'Error');
  }
}

// Stop scanner
async function stopScanner() {
  if (scanner) {
    await scanner.stopScanning();
  }
}

// Handle barcode scan
async function handleBarcodeScan(barcode) {
  try {
    // Try to parse as QR code data first
    let item = null;
    const qrData = BarcodeGenerator.parseQRCodeData(barcode);
    
    if (qrData && qrData.item_id) {
      // QR code contains item ID
      item = await lookupItemById(qrData.item_id);
    } else {
      // Regular barcode lookup
      item = await lookupBarcode(barcode);
    }
    
    if (!item) {
      toast.error('Item not found. Please check the barcode.', 'Not Found');
      // Restart scanner
      setTimeout(() => startScanner(), 2000);
      return;
    }
    
    // Log scan
    await logScan(barcode, item.id, 'found', 'database');
    
    // Show item found modal
    renderItemFoundModal(item, currentSiteId);
    
  } catch (error) {
    console.error('[Mobile Inventory] Error handling scan:', error);
    toast.error('Failed to process scan. Please try again.', 'Error');
    // Restart scanner
    setTimeout(() => startScanner(), 2000);
  }
}

// Lookup item by barcode
async function lookupBarcode(barcode) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        inventory_categories(name, icon),
        site_inventory(
          site_id,
          quantity,
          sites(name)
        )
      `)
      .eq('barcode', barcode)
      .single();
    
    if (error) throw error;
    
    // Update last_scanned_at
    await supabase
      .from('inventory_items')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', data.id);
    
    return data;
  } catch (error) {
    console.error('[Mobile Inventory] Barcode lookup failed:', error);
    return null;
  }
}

// Lookup item by ID
async function lookupItemById(itemId) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        inventory_categories(name, icon),
        site_inventory(
          site_id,
          quantity,
          sites(name)
        )
      `)
      .eq('id', itemId)
      .single();
    
    if (error) throw error;
    
    // Update last_scanned_at
    await supabase
      .from('inventory_items')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', data.id);
    
    return data;
  } catch (error) {
    console.error('[Mobile Inventory] Item lookup failed:', error);
    return null;
  }
}

// Log scan to database
async function logScan(barcode, itemId, result, source) {
  try {
    await supabase.from('barcode_scan_logs').insert({
      barcode,
      item_id: itemId,
      scanned_by: currentUser.id,
      site_id: currentSiteId,
      scan_result: result,
      scan_source: source,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });
  } catch (error) {
    console.error('[Mobile Inventory] Failed to log scan:', error);
  }
}

// Render item found modal with usage form
function renderItemFoundModal(item, siteId) {
  const modal = document.getElementById('item-found-modal');
  const siteInventory = item.site_inventory?.find(si => si.site_id === siteId);
  const availableQty = siteInventory?.quantity || 0;
  
  modal.innerHTML = `
    <div class="flex items-end h-full">
      <div class="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-slide-up">
        <!-- Header -->
        <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-nfgray p-4 flex items-center justify-between z-10">
          <div>
            <h3 class="text-xl font-semibold text-nfgblue dark:text-blue-400">${sanitizeText(item.name)}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${item.inventory_categories?.name || 'Uncategorized'}</p>
          </div>
          <button id="close-item-modal" class="p-2">
            <i data-lucide="x" class="w-6 h-6 text-gray-600 dark:text-gray-400"></i>
          </button>
        </div>
        
        <!-- Item Info -->
        <div class="p-4 border-b border-nfgray">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Available</p>
              <p class="text-2xl font-bold ${availableQty === 0 ? 'text-red-600' : availableQty < 5 ? 'text-orange-600' : 'text-green-600'}">
                ${availableQty} ${item.unit || 'units'}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500 dark:text-gray-400">Site</p>
              <p class="font-semibold text-nftext dark:text-white">${siteInventory?.sites?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>
        
        <!-- Usage Form -->
        <form id="usage-form" class="p-4 space-y-4">
          <input type="hidden" id="usage-item-id" value="${item.id}">
          <input type="hidden" id="usage-site-id" value="${siteId}">
          
          <!-- Job Selector -->
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Job (Optional)</label>
            <select 
              id="usage-job-id" 
              class="w-full border border-nfgray rounded-xl px-4 py-3 text-lg text-nftext dark:text-white dark:bg-gray-700"
            >
              <option value="">No job</option>
              <!-- Populated by JS -->
            </select>
          </div>
          
          <!-- Quantity Stepper -->
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Quantity Used</label>
            <div class="flex items-center gap-4">
              <button 
                type="button" 
                id="qty-decrease" 
                class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-nftext dark:text-white"
              >
                −
              </button>
              <input 
                type="number" 
                id="usage-quantity" 
                value="1" 
                min="1" 
                max="${availableQty}"
                class="flex-1 text-center text-3xl font-bold border-2 border-nfgblue rounded-xl py-2 text-nftext dark:text-white dark:bg-gray-700"
              />
              <button 
                type="button" 
                id="qty-increase" 
                class="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-nftext dark:text-white"
              >
                +
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Available: ${availableQty} ${item.unit || ''}</p>
          </div>
          
          <!-- Photo Gallery -->
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Photos</label>
            <div id="photo-gallery" class="grid grid-cols-3 gap-2">
              <div 
                id="add-photo-btn" 
                class="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer bg-gray-50 dark:bg-gray-700"
              >
                <i data-lucide="camera" class="w-8 h-8 text-gray-400 dark:text-gray-500"></i>
              </div>
            </div>
          </div>
          
          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Notes</label>
            <textarea 
              id="usage-notes" 
              rows="3" 
              placeholder="Optional notes..."
              class="w-full border border-nfgray rounded-xl px-4 py-3 text-nftext dark:text-white dark:bg-gray-700"
            ></textarea>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-2 pt-4 border-t border-nfgray">
            <button 
              type="button" 
              id="cancel-usage" 
              class="flex-1 px-4 py-4 rounded-xl border border-nfgray font-medium text-nftext dark:text-white"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="flex-1 px-4 py-4 rounded-xl bg-nfgblue text-white font-medium"
            >
              Mark as Used
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
  
  modal.classList.remove('hidden');
  
  // Initialize icons
  if (window.lucide) lucide.createIcons();
  
  // Load jobs for selector
  loadJobsForSelector();
  
  // Attach form listeners
  attachUsageFormListeners(item, siteId, availableQty);
}

// Load jobs for selector
async function loadJobsForSelector() {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status')
      .eq('site_id', currentSiteId)
      .in('status', ['pending', 'in-progress'])
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    jobsList = data || [];
    
    const select = document.getElementById('usage-job-id');
    if (select) {
      jobsList.forEach(job => {
        const option = document.createElement('option');
        option.value = job.id;
        option.textContent = `${job.title} (${job.status})`;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('[Mobile Inventory] Failed to load jobs:', error);
  }
}

// Attach usage form listeners
function attachUsageFormListeners(item, siteId, availableQty) {
  // Close modal
  document.getElementById('close-item-modal')?.addEventListener('click', () => {
    document.getElementById('item-found-modal').classList.add('hidden');
    usagePhotos = [];
    startScanner(); // Restart scanner
  });
  
  document.getElementById('cancel-usage')?.addEventListener('click', () => {
    document.getElementById('item-found-modal').classList.add('hidden');
    usagePhotos = [];
    startScanner(); // Restart scanner
  });
  
  // Quantity stepper
  const qtyInput = document.getElementById('usage-quantity');
  const qtyDecrease = document.getElementById('qty-decrease');
  const qtyIncrease = document.getElementById('qty-increase');
  
  qtyDecrease?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current > 1) {
      qtyInput.value = current - 1;
    }
  });
  
  qtyIncrease?.addEventListener('click', () => {
    const current = parseInt(qtyInput.value) || 1;
    if (current < availableQty) {
      qtyInput.value = current + 1;
    }
  });
  
  // Photo upload
  document.getElementById('add-photo-btn')?.addEventListener('click', () => {
    if (window.mobileFileInput) {
      window.mobileFileInput.click();
    }
  });
  
  // Form submission
  document.getElementById('usage-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitInventoryUsage();
  });
}

// Submit inventory usage
async function submitInventoryUsage() {
  try {
    const itemId = parseInt(document.getElementById('usage-item-id').value);
    const siteId = parseInt(document.getElementById('usage-site-id').value);
    const jobId = document.getElementById('usage-job-id').value || null;
    const quantity = parseInt(document.getElementById('usage-quantity').value) || 1;
    const notes = document.getElementById('usage-notes').value || null;
    
    // Get current inventory quantity
    const { data: currentInventory } = await supabase
      .from('site_inventory')
      .select('quantity')
      .eq('site_id', siteId)
      .eq('item_id', itemId)
      .single();
    
    const quantityBefore = currentInventory?.quantity || 0;
    const quantityAfter = Math.max(0, quantityBefore - quantity);
    
    // Create transaction
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        item_id: itemId,
        site_id: siteId,
        job_id: jobId,
        transaction_type: 'use',
        quantity_change: -quantity,
        quantity_before: quantityBefore,
        quantity_after: quantityAfter,
        user_id: currentUser.id,
        notes: notes
      });
    
    if (transactionError) throw transactionError;
    
    // Update site inventory
    const { error: updateError } = await supabase
      .from('site_inventory')
      .update({ quantity: quantityAfter })
      .eq('site_id', siteId)
      .eq('item_id', itemId);
    
    if (updateError) throw updateError;
    
    // TODO: Upload photos and create job_inventory_usage if job_id exists
    // (Will be implemented in Phase 2.3)
    
    toast.success('Usage recorded successfully!', 'Success');
    
    // Close modal and restart scanner
    document.getElementById('item-found-modal').classList.add('hidden');
    usagePhotos = [];
    setTimeout(() => startScanner(), 1000);
    
  } catch (error) {
    console.error('[Mobile Inventory] Failed to submit usage:', error);
    toast.error('Failed to record usage. Please try again.', 'Error');
  }
}

// Site selector
function openSiteSelector() {
  const modal = document.getElementById('site-selector-modal');
  const siteList = document.getElementById('site-list');
  
  siteList.innerHTML = sitesList.map(site => `
    <button 
      class="w-full text-left p-4 rounded-xl border border-nfgray hover:bg-nfglight dark:hover:bg-gray-700 transition ${site.id === currentSiteId ? 'bg-nfglight dark:bg-gray-700 border-nfgblue' : ''}"
      onclick="selectSite(${site.id}, '${sanitizeText(site.name)}')"
    >
      <p class="font-semibold text-nftext dark:text-white">${sanitizeText(site.name)}</p>
      ${site.address ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${sanitizeText(site.address)}</p>` : ''}
    </button>
  `).join('');
  
  modal.classList.remove('hidden');
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.add('hidden');
    }
  });
}

window.selectSite = function(siteId, siteName) {
  currentSiteId = siteId;
  currentSiteName = siteName;
  updateSiteSelector();
  document.getElementById('site-selector-modal').classList.add('hidden');
  
  // Restart scanner with new site
  stopScanner();
  setTimeout(() => startScanner(), 500);
};

// Manual entry
function openManualEntry() {
  stopScanner();
  document.getElementById('manual-entry-modal').classList.remove('hidden');
  document.getElementById('manual-barcode-input').focus();
}

function closeManualEntry() {
  document.getElementById('manual-entry-modal').classList.add('hidden');
  startScanner();
}

async function handleManualEntry() {
  const barcode = document.getElementById('manual-barcode-input').value.trim();
  if (!barcode) {
    toast.warning('Please enter a barcode', 'Input Required');
    return;
  }
  
  closeManualEntry();
  await handleBarcodeScan(barcode);
}

// File upload
function openFileUpload() {
  if (window.mobileFileInput) {
    window.mobileFileInput.click();
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    stopScanner();
    const result = await scanner.scanFromFile(file);
    
    if (result) {
      await handleBarcodeScan(result);
    } else {
      toast.error('No barcode found in image', 'Not Found');
      startScanner();
    }
  } catch (error) {
    console.error('[Mobile Inventory] File scan failed:', error);
    toast.error('Failed to scan image', 'Error');
    startScanner();
  }
  
  // Reset file input
  e.target.value = '';
}

// Toggle flash
async function toggleFlash() {
  if (scanner) {
    const available = await scanner.isFlashAvailable();
    if (available) {
      await scanner.toggleFlash();
    } else {
      toast.info('Flash not available on this device', 'Info');
    }
  }
}

// Show inventory list (placeholder - will be implemented fully in next step)
function showInventoryList() {
  toast.info('Inventory list view coming soon', 'Coming Soon');
  // TODO: Implement full list view
}

// Online/offline status
function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  if (banner) {
    if (navigator.onLine) {
      banner.classList.add('hidden');
    } else {
      banner.classList.remove('hidden');
    }
  }
}

// Utility: Sanitize text
function sanitizeText(value) {
  if (!value) return '';
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

// Export for testing
window.mobileInventory = {
  currentUser,
  currentSiteId,
  sitesList,
  scanner,
  startScanner,
  stopScanner
};

