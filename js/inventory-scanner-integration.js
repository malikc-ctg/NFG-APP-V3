// ============================================
// Inventory Scanner Integration
// ============================================
// Integrates mobile scanner into inventory.html
// ============================================

import { MobileBarcodeScanner } from './barcode-scanner.js';
import { BarcodeGenerator } from './barcode-generator.js';
import { supabase } from './supabase.js';
import { toast } from './notifications.js';

let inventoryScanner = null;
let scannerSiteId = null;

// Initialize scanner in inventory page
async function initInventoryScanner() {
  if (window.inventoryScannerInitialized) {
    return;
  }
  
  try {
    console.log('[Inventory Scanner] Initializing...');
    
    // Load site selector
    await loadScannerSiteSelector();
    
    // Initialize scanner
    inventoryScanner = new MobileBarcodeScanner('barcode-scanner-container');
    
    // Set default site from current filter
    const siteFilter = document.getElementById('site-filter');
    if (siteFilter && siteFilter.value !== 'all') {
      scannerSiteId = parseInt(siteFilter.value);
      document.getElementById('scanner-site-select').value = scannerSiteId;
    }
    
    // Attach event listeners
    attachScannerListeners();
    
    // Start scanner if site is selected
    if (scannerSiteId) {
      await startInventoryScanner();
    }
    
    window.inventoryScannerInitialized = true;
    console.log('[Inventory Scanner] Initialized');
  } catch (error) {
    console.error('[Inventory Scanner] Initialization failed:', error);
    toast.error('Failed to initialize scanner', 'Error');
  }
}

// Load sites for scanner selector
async function loadScannerSiteSelector() {
  try {
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name')
      .order('name');
    
    const select = document.getElementById('scanner-site-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Site</option>' +
      (sites || []).map(site => 
        `<option value="${site.id}">${site.name}</option>`
      ).join('');
    
    select.addEventListener('change', (e) => {
      scannerSiteId = e.target.value ? parseInt(e.target.value) : null;
      if (scannerSiteId) {
        startInventoryScanner();
      } else {
        stopInventoryScanner();
      }
    });
  } catch (error) {
    console.error('[Inventory Scanner] Failed to load sites:', error);
  }
}

// Attach scanner event listeners
function attachScannerListeners() {
  // Manual entry
  document.getElementById('scanner-manual-entry-btn')?.addEventListener('click', () => {
    openScannerManualEntry();
  });
  
  // File upload
  document.getElementById('scanner-upload-btn')?.addEventListener('click', () => {
    if (window.scannerFileInput) {
      window.scannerFileInput.click();
    } else {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', handleScannerFileUpload);
      document.body.appendChild(fileInput);
      window.scannerFileInput = fileInput;
      fileInput.click();
    }
  });
  
  // Flash toggle
  document.getElementById('scanner-flash-toggle')?.addEventListener('click', async () => {
    if (inventoryScanner) {
      const available = await inventoryScanner.isFlashAvailable();
      if (available) {
        await inventoryScanner.toggleFlash();
      } else {
        toast.info('Flash not available on this device', 'Info');
      }
    }
  });
}

// Start scanner
async function startInventoryScanner() {
  if (!inventoryScanner || !scannerSiteId) {
    toast.warning('Please select a site first', 'Site Required');
    return;
  }
  
  try {
    // Show loading state
    showScannerStatus('loading', 'Starting camera...', 'Please wait');
    
    // Check if Html5Qrcode library is loaded
    if (!window.Html5Qrcode) {
      console.log('[Inventory Scanner] Loading Html5Qrcode library...');
      // Wait a bit for script to load if it was just added
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!window.Html5Qrcode) {
        // Try loading it dynamically
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@latest/html5-qrcode.min.js';
        await new Promise((resolve, reject) => {
          script.onload = () => {
            if (window.Html5Qrcode) {
              resolve();
            } else {
              reject(new Error('Html5Qrcode library failed to load'));
            }
          };
          script.onerror = () => reject(new Error('Failed to load Html5Qrcode library'));
          document.head.appendChild(script);
        });
      }
    }
    
    const hasPermission = await inventoryScanner.init();
    if (!hasPermission) {
      showScannerStatus('error', 'Camera permission required', 'Please allow camera access in browser settings');
      toast.error('Camera permission denied. Please enable camera access.', 'Permission Required');
      return;
    }
    
    // Get container
    const container = document.getElementById('barcode-scanner-container');
    if (!container) {
      console.error('[Inventory Scanner] Container not found');
      toast.error('Scanner container not found', 'Error');
      return;
    }
    
    // Clear container but keep overlay structure
    const staticOverlay = container.querySelector('#scanner-overlay-static');
    const statusDiv = container.querySelector('#scanner-status');
    container.querySelectorAll('video, canvas, iframe').forEach(el => el.remove());
    
    // Hide status, show overlay
    if (statusDiv) statusDiv.classList.add('hidden');
    if (staticOverlay) staticOverlay.classList.remove('hidden');
    
    const started = await inventoryScanner.startScanning(
      async (decodedText) => {
        console.log('[Inventory Scanner] Scanned:', decodedText);
        await handleInventoryBarcodeScan(decodedText);
      },
      (error) => {
        // Only log non-common errors
        if (!error.includes('NotFoundException') && !error.includes('No QR code')) {
          console.error('[Inventory Scanner] Scanner error:', error);
        }
      }
    );
    
    if (!started) {
      showScannerStatus('error', 'Failed to start camera', 'Please check your camera settings');
      toast.error('Failed to start camera. Check console for details.', 'Error');
      return;
    }
    
    console.log('[Inventory Scanner] Scanner started successfully');
    
    // Hide status after successful start
    if (statusDiv) statusDiv.classList.add('hidden');
    
  } catch (error) {
    console.error('[Inventory Scanner] Failed to start scanner:', error);
    showScannerStatus('error', 'Camera Error', error.message || 'Unknown error');
    toast.error('Failed to start camera: ' + (error.message || 'Unknown error'), 'Error');
  }
}

// Show scanner status message
function showScannerStatus(type, message, submessage = '') {
  const statusDiv = document.getElementById('scanner-status');
  const iconDiv = document.getElementById('scanner-status-icon');
  const textDiv = document.getElementById('scanner-status-text');
  const subtextDiv = document.getElementById('scanner-status-subtext');
  const overlay = document.getElementById('scanner-overlay-static');
  
  if (!statusDiv) return;
  
  if (type === 'loading') {
    iconDiv.innerHTML = '<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>';
  } else if (type === 'error') {
    iconDiv.innerHTML = '<i data-lucide="alert-circle" class="w-12 h-12 mx-auto"></i>';
    if (window.lucide) lucide.createIcons();
  } else {
    iconDiv.innerHTML = '';
  }
  
  textDiv.textContent = message;
  subtextDiv.textContent = submessage;
  
  statusDiv.classList.remove('hidden');
  if (overlay) overlay.classList.add('hidden');
}

// Stop scanner
async function stopInventoryScanner() {
  if (inventoryScanner) {
    await inventoryScanner.stopScanning();
  }
}

// Handle barcode scan
async function handleInventoryBarcodeScan(barcode) {
  try {
    // Try to parse as QR code data first
    let item = null;
    const qrData = BarcodeGenerator.parseQRCodeData(barcode);
    
    if (qrData && qrData.item_id) {
      item = await lookupInventoryItemById(qrData.item_id);
    } else {
      item = await lookupInventoryBarcode(barcode);
    }
    
    if (!item) {
      // Item not found - offer to create it with this barcode
      // Stop scanner while showing modal
      await stopInventoryScanner();
      await showCreateItemFromBarcode(barcode);
      // Scanner will restart after item creation (handled in createItemFromScannedBarcode)
      return;
    }
    
    // Log scan
    await logInventoryScan(barcode, item.id, 'found', 'database');
    
    // Stop scanner IMMEDIATELY to prevent camera conflicts
    try {
      if (inventoryScanner) {
        const status = inventoryScanner.getStatus();
        if (status && status.isScanning) {
          await inventoryScanner.stopScanning();
          // Wait for camera to fully release
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (stopError) {
      console.warn('[Inventory Scanner] Error stopping scanner:', stopError);
      // Continue anyway
    }
    
    // Show item found - open manage stock modal with "use" action
    const siteInventory = item.site_inventory?.find(si => si.site_id === scannerSiteId);
    if (siteInventory && item.inventory_items) {
      // Use the existing manageStock function from inventory.js
      if (window.manageStock) {
        toast.success(`Found: ${item.inventory_items.name}`, 'Item Found');
        // Open modal
        window.manageStock(
          scannerSiteId, 
          item.inventory_items.id, 
          item.inventory_items.name, 
          siteInventory.quantity || 0
        );
        
        // Set action to "use" after modal opens
        setTimeout(() => {
          const actionSelect = document.getElementById('stock-action');
          if (actionSelect) {
            actionSelect.value = 'use';
            // Trigger change event to update form (will show job selector and load jobs)
            actionSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, 200);
      } else {
        toast.success(`Found: ${item.inventory_items.name}`, 'Item Found');
        toast.info('Use the manage stock button to record usage', 'Info');
      }
    } else if (item.inventory_items) {
      toast.warning('Item not available at this site. Add it to site inventory first.', 'Site Mismatch');
    } else {
      toast.warning('Item found but site inventory not available', 'Warning');
    }
    
    // Show resume scanning button
    showResumeScanningButton();
    
  } catch (error) {
    console.error('[Inventory Scanner] Error handling scan:', error);
    toast.error('Failed to process scan. Please try again.', 'Error');
    setTimeout(() => startInventoryScanner(), 2000);
  }
}

// Lookup item by barcode
async function lookupInventoryBarcode(barcode) {
  try {
    const { data, error } = await supabase
      .from('site_inventory')
      .select(`
        *,
        inventory_items:inventory_items(
          *,
          inventory_categories(name, icon)
        ),
        sites:sites(name)
      `)
      .eq('site_id', scannerSiteId)
      .eq('inventory_items.barcode', barcode)
      .single();
    
    if (error) throw error;
    
    // Update last_scanned_at
    if (data?.inventory_items?.id) {
      await supabase
        .from('inventory_items')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', data.inventory_items.id);
    }
    
    return data;
  } catch (error) {
    console.error('[Inventory Scanner] Barcode lookup failed:', error);
    return null;
  }
}

// Lookup item by ID
async function lookupInventoryItemById(itemId) {
  try {
    const { data, error } = await supabase
      .from('site_inventory')
      .select(`
        *,
        inventory_items:inventory_items(
          *,
          inventory_categories(name, icon)
        ),
        sites:sites(name)
      `)
      .eq('site_id', scannerSiteId)
      .eq('item_id', itemId)
      .single();
    
    if (error) throw error;
    
    // Update last_scanned_at
    if (data?.inventory_items?.id) {
      await supabase
        .from('inventory_items')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', data.inventory_items.id);
    }
    
    return data;
  } catch (error) {
    console.error('[Inventory Scanner] Item lookup failed:', error);
    return null;
  }
}

// Log scan
async function logInventoryScan(barcode, itemId, result, source) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await supabase.from('barcode_scan_logs').insert({
      barcode,
      item_id: itemId,
      scanned_by: user.id,
      site_id: scannerSiteId,
      scan_result: result,
      scan_source: source,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });
  } catch (error) {
    console.error('[Inventory Scanner] Failed to log scan:', error);
  }
}

// Manual entry
function openScannerManualEntry() {
  const barcode = prompt('Enter barcode or scan code:');
  if (barcode && barcode.trim()) {
    handleInventoryBarcodeScan(barcode.trim());
  }
}

// File upload
async function handleScannerFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  try {
    await stopInventoryScanner();
    const result = await inventoryScanner.scanFromFile(file);
    
    if (result) {
      await handleInventoryBarcodeScan(result);
    } else {
      toast.error('No barcode found in image', 'Not Found');
      await startInventoryScanner();
    }
  } catch (error) {
    console.error('[Inventory Scanner] File scan failed:', error);
    toast.error('Failed to scan image', 'Error');
    await startInventoryScanner();
  }
  
  // Reset file input
  e.target.value = '';
}

// Show modal to create item from scanned barcode
async function showCreateItemFromBarcode(barcode) {
  return new Promise((resolve) => {
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'create-item-from-barcode-modal';
    modal.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6">
        <h3 class="text-lg font-semibold text-nfgblue dark:text-blue-400 mb-4">
          New Item Detected
        </h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Barcode <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded font-mono">${barcode}</code> not found.
          Create a new item with this barcode?
        </p>
        
        <form id="create-item-from-barcode-form" class="space-y-4">
          <input type="hidden" id="scanned-barcode-value" value="${barcode}">
          
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Item Name *</label>
            <input 
              type="text" 
              id="new-item-name" 
              required
              placeholder="e.g., Coca-Cola, Paper Towels"
              class="w-full border border-nfgray rounded-xl px-4 py-3 text-nftext dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-nfgblue outline-none"
              autofocus
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Category</label>
            <select 
              id="new-item-category" 
              class="w-full border border-nfgray rounded-xl px-4 py-3 text-nftext dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-nfgblue outline-none"
            >
              <option value="">Select category...</option>
            </select>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Unit</label>
              <input 
                type="text" 
                id="new-item-unit" 
                value="pieces"
                placeholder="pieces, boxes, etc."
                class="w-full border border-nfgray rounded-xl px-4 py-3 text-nftext dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-nfgblue outline-none"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2 text-nftext dark:text-white">Low Stock</label>
              <input 
                type="number" 
                id="new-item-threshold" 
                value="5"
                min="0"
                class="w-full border border-nfgray rounded-xl px-4 py-3 text-nftext dark:text-white dark:bg-gray-700 focus:ring-2 focus:ring-nfgblue outline-none"
              />
            </div>
          </div>
          
          <div class="flex gap-2 pt-4 border-t border-nfgray">
            <button 
              type="button" 
              id="cancel-create-item" 
              class="flex-1 px-4 py-3 rounded-xl border border-nfgray text-nftext dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="flex-1 px-4 py-3 rounded-xl bg-nfgblue text-white hover:bg-nfgdark"
            >
              Create Item
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Load categories
    loadCategoriesForModal();
    
    // Handle form submission
    document.getElementById('create-item-from-barcode-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await createItemFromScannedBarcode(modal);
      resolve();
    });
    
    // Handle cancel
    document.getElementById('cancel-create-item').addEventListener('click', () => {
      modal.remove();
      resolve();
    });
  });
}

// Load categories for the create modal
async function loadCategoriesForModal() {
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('id, name')
      .order('name');
    
    if (error) throw error;
    
    const select = document.getElementById('new-item-category');
    if (select) {
      (data || []).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('[Inventory Scanner] Failed to load categories:', error);
  }
}

// Create item from scanned barcode
async function createItemFromScannedBarcode(modal) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Not authenticated', 'Error');
      return;
    }
    
    const name = document.getElementById('new-item-name').value.trim();
    const barcode = document.getElementById('scanned-barcode-value').value;
    const categoryId = document.getElementById('new-item-category').value || null;
    const unit = document.getElementById('new-item-unit').value.trim() || 'pieces';
    const threshold = parseInt(document.getElementById('new-item-threshold').value) || 5;
    
    if (!name) {
      toast.error('Item name is required', 'Error');
      return;
    }
    
    // Create the item with the scanned barcode
    const { data: newItem, error } = await supabase
      .from('inventory_items')
      .insert({
        name: name,
        barcode: barcode,
        barcode_type: 'EAN_13', // Common format for product barcodes
        category_id: categoryId,
        unit: unit,
        low_stock_threshold: threshold,
        created_by: user.id
      })
      .select()
      .single();
    
    if (error) {
      // Check if barcode already exists (race condition)
      if (error.code === '23505') {
        toast.error('Item with this barcode already exists', 'Error');
        modal.remove();
        // Try scanning again - item should exist now
        setTimeout(() => handleInventoryBarcodeScan(barcode), 1000);
        return;
      }
      throw error;
    }
    
    // Generate QR code for the new item
    try {
      const { BarcodeGenerator } = await import('./barcode-generator.js');
      const qrCode = await BarcodeGenerator.generateAndUploadQRCode(
        newItem.id,
        newItem.name,
        null
      );
      
      if (qrCode.url) {
        await supabase
          .from('inventory_items')
          .update({ qr_code_url: qrCode.url })
          .eq('id', newItem.id);
      }
    } catch (qrError) {
      console.warn('[Inventory Scanner] QR code generation failed:', qrError);
      // Don't fail the whole operation if QR generation fails
    }
    
    // Add to current site's inventory if site is selected
    if (scannerSiteId) {
      const { error: siteInvError } = await supabase
        .from('site_inventory')
        .insert({
          site_id: scannerSiteId,
          item_id: newItem.id,
          quantity: 0 // Start with 0, they can add stock later
        });
      
      if (siteInvError && siteInvError.code !== '23505') {
        console.error('[Inventory Scanner] Failed to add to site inventory:', siteInvError);
      }
    }
    
    toast.success(`Created: ${name}`, 'Item Created');
    modal.remove();
    
    // Now that item exists, process the scan (which will open manage stock modal)
    // Don't restart scanner automatically - let user manually resume after closing modal
    setTimeout(async () => {
      try {
        await handleInventoryBarcodeScan(barcode);
      } catch (error) {
        console.error('[Inventory Scanner] Failed to process scan after item creation:', error);
        toast.error('Failed to process scan. Please scan again.', 'Error');
        // Show resume button
        showResumeScanningButton();
      }
    }, 300);
    
  } catch (error) {
    console.error('[Inventory Scanner] Failed to create item:', error);
    toast.error('Failed to create item: ' + error.message, 'Error');
  }
}

// Export for use in inventory.js
window.initInventoryScanner = initInventoryScanner;
export default initInventoryScanner;

