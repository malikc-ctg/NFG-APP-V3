// ============================================
// Inventory Scanner Integration
// ============================================
// Integrates mobile scanner into inventory.html
// ============================================

import { MobileBarcodeScanner } from './barcode-scanner.js';
import { BarcodeGenerator } from './barcode-generator.js';

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
    const hasPermission = await inventoryScanner.init();
    if (!hasPermission) {
      toast.error('Camera permission denied. Please enable camera access.', 'Permission Required');
      return;
    }
    
    await inventoryScanner.startScanning(
      async (decodedText) => {
        console.log('[Inventory Scanner] Scanned:', decodedText);
        await handleInventoryBarcodeScan(decodedText);
      },
      (error) => {
        console.error('[Inventory Scanner] Scanner error:', error);
      }
    );
    
    console.log('[Inventory Scanner] Scanner started');
  } catch (error) {
    console.error('[Inventory Scanner] Failed to start scanner:', error);
    toast.error('Failed to start camera. Please try again.', 'Error');
  }
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
      toast.error('Item not found. Please check the barcode.', 'Not Found');
      setTimeout(() => startInventoryScanner(), 2000);
      return;
    }
    
    // Log scan
    await logInventoryScan(barcode, item.id, 'found', 'database');
    
    // Show item found - open manage stock modal with "use" action
    const siteInventory = item.site_inventory?.find(si => si.site_id === scannerSiteId);
    if (siteInventory) {
      // Open manage stock modal with use action
      openManageStockModal(item.inventory_items?.id || item.id, scannerSiteId, 'use');
      toast.success(`Found: ${item.inventory_items?.name || item.name}`, 'Item Found');
    } else {
      toast.warning('Item not available at this site', 'Site Mismatch');
    }
    
    // Restart scanner after delay
    setTimeout(() => startInventoryScanner(), 3000);
    
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

// Export for use in inventory.js
window.initInventoryScanner = initInventoryScanner;
export default initInventoryScanner;

