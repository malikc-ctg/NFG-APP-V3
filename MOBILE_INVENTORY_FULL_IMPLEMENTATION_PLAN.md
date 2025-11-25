# 📱 Mobile Inventory Full Implementation Plan
## Complete Phase-by-Phase Breakdown

**Version:** Full Implementation (40-50 hours)
**Last Updated:** Current Date

---

## 🎯 **Implementation Overview**

This plan covers all 7 phases of the Mobile On-Site Inventory Updates feature, broken down into specific, actionable tasks with file-by-file implementation details.

---

## 📋 **Phase 2.1: Barcode/QR Code System**

### **Step 1.1: Database Schema (SQL)**

**File:** `ADD_BARCODE_SUPPORT.sql`

```sql
-- Add barcode fields to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(20) DEFAULT 'CODE128',
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode 
  ON inventory_items(barcode) WHERE barcode IS NOT NULL;

-- Barcode scan audit log
CREATE TABLE IF NOT EXISTS barcode_scan_logs (
  id BIGSERIAL PRIMARY KEY,
  barcode VARCHAR(100) NOT NULL,
  item_id BIGINT REFERENCES inventory_items(id),
  scanned_by UUID REFERENCES auth.users(id),
  site_id BIGINT REFERENCES sites(id),
  scan_result VARCHAR(50),
  device_info JSONB,
  location JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_barcode ON barcode_scan_logs(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON barcode_scan_logs(scanned_by);

-- RLS Policies
ALTER TABLE barcode_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can log scans"
ON barcode_scan_logs FOR INSERT
WITH CHECK (auth.uid() = scanned_by);

CREATE POLICY "Users can view own scans"
ON barcode_scan_logs FOR SELECT
USING (
  auth.uid() = scanned_by 
  OR EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);
```

**Tasks:**
- [ ] Create SQL file
- [ ] Run in Supabase
- [ ] Verify indexes created
- [ ] Test RLS policies

**Time Estimate:** 1 hour

---

### **Step 1.2: Barcode Generation (JavaScript)**

**File:** `js/barcode-generator.js` (New)

```javascript
import QRCode from 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/+esm';

export class BarcodeGenerator {
  static async generateBarcode(itemId, itemName) {
    const timestamp = Date.now();
    const barcode = `INV-${timestamp}-${itemId}`;
    return barcode;
  }
  
  static async generateQRCode(itemId, itemName, siteId = null) {
    const qrData = {
      type: 'inventory_item',
      item_id: itemId,
      name: itemName,
      site_id: siteId,
      code: await this.generateBarcode(itemId, itemName),
      timestamp: new Date().toISOString()
    };
    
    // Generate QR code image (data URL)
    const qrImage = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 300,
      margin: 2,
      color: {
        dark: '#0D47A1',
        light: '#FFFFFF'
      }
    });
    
    return {
      data: qrData,
      image: qrImage
    };
  }
  
  static async uploadQRCodeToStorage(itemId, qrImageBlob) {
    const fileName = `qr-codes/${itemId}.png`;
    const { data, error } = await supabase.storage
      .from('inventory-assets')
      .upload(fileName, qrImageBlob, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('inventory-assets')
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
  }
}
```

**File:** `js/inventory.js` (Modify)

**Add to `submitItemForm`:**
```javascript
// After item creation, generate barcode
if (itemData.id) {
  const barcode = await BarcodeGenerator.generateBarcode(itemData.id, itemData.name);
  const qrCode = await BarcodeGenerator.generateQRCode(itemData.id, itemData.name);
  
  // Convert QR image data URL to blob
  const qrBlob = await (await fetch(qrCode.image)).blob();
  const qrUrl = await BarcodeGenerator.uploadQRCodeToStorage(itemData.id, qrBlob);
  
  // Update item with barcode
  await supabase
    .from('inventory_items')
    .update({
      barcode: barcode,
      qr_code_url: qrUrl
    })
    .eq('id', itemData.id);
}
```

**Tasks:**
- [ ] Create `js/barcode-generator.js`
- [ ] Install QRCode library (via CDN)
- [ ] Update inventory.js to auto-generate barcodes
- [ ] Test barcode generation on new items
- [ ] Verify QR codes uploaded to storage

**Time Estimate:** 2-3 hours

---

### **Step 1.3: Barcode Scanner Component**

**File:** `js/barcode-scanner.js` (New)

```javascript
import { Html5Qrcode } from 'https://unpkg.com/html5-qrcode@latest/html5-qrcode.min.js';

export class MobileBarcodeScanner {
  constructor(containerId) {
    this.containerId = containerId;
    this.scanner = null;
    this.isScanning = false;
    this.onScanCallback = null;
    this.onErrorCallback = null;
  }
  
  async init() {
    try {
      // Check camera permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      return true;
    } catch (error) {
      console.error('Camera access denied:', error);
      return false;
    }
  }
  
  async startScanning(onSuccess, onError) {
    if (this.isScanning) return;
    
    try {
      this.scanner = new Html5Qrcode(this.containerId);
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment'
        }
      };
      
      await this.scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText, decodedResult) => {
          this.handleScanSuccess(decodedText, decodedResult, onSuccess);
        },
        (errorMessage) => {
          // Ignore scanning errors (they're frequent)
        }
      );
      
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('Failed to start scanner:', error);
      onError(error);
      return false;
    }
  }
  
  handleScanSuccess(decodedText, decodedResult, callback) {
    // Stop scanning after successful scan
    this.stopScanning();
    
    // Call callback with decoded barcode
    if (callback) callback(decodedText, decodedResult);
  }
  
  async stopScanning() {
    if (!this.isScanning || !this.scanner) return;
    
    try {
      await this.scanner.stop();
      await this.scanner.clear();
      this.isScanning = false;
      return true;
    } catch (error) {
      console.error('Failed to stop scanner:', error);
      return false;
    }
  }
  
  async scanFromFile(file) {
    if (!this.scanner) {
      this.scanner = new Html5Qrcode(this.containerId);
    }
    
    try {
      const result = await this.scanner.scanFile(file, false);
      return result;
    } catch (error) {
      console.error('File scan failed:', error);
      return null;
    }
  }
  
  toggleFlash() {
    // Flash toggle implementation
    // This requires additional camera controls
  }
}
```

**Tasks:**
- [ ] Add html5-qrcode library to mobile-inventory.html
- [ ] Create `js/barcode-scanner.js`
- [ ] Test scanner on mobile device
- [ ] Test file upload scanning
- [ ] Handle camera permissions

**Time Estimate:** 3-4 hours

---

### **Step 1.4: Barcode Lookup & Caching**

**File:** `js/mobile-inventory.js` (New - Start)

```javascript
import { offlineDB } from './offline-db.js';
import { MobileBarcodeScanner } from './barcode-scanner.js';

// Barcode lookup with caching
async function lookupBarcode(barcode) {
  // 1. Check cache first
  const cached = await offlineDB.getCachedItemByBarcode(barcode);
  if (cached && offlineDB.isCacheValid(cached)) {
    await logScan(barcode, cached.id, 'found', 'cache');
    return cached;
  }
  
  // 2. Query Supabase
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        inventory_categories(name, icon),
        site_inventory!inner(
          site_id,
          quantity,
          sites(name)
        )
      `)
      .eq('barcode', barcode)
      .single();
    
    if (error) throw error;
    
    // 3. Cache the result
    await offlineDB.cacheItem(data);
    
    // 4. Log the scan
    await logScan(barcode, data.id, 'found', 'database');
    
    // 5. Update last_scanned_at
    await supabase
      .from('inventory_items')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', data.id);
    
    return data;
  } catch (error) {
    await logScan(barcode, null, 'not_found', 'database');
    
    // Try to parse QR code data if it's JSON
    try {
      const qrData = JSON.parse(barcode);
      if (qrData.type === 'inventory_item' && qrData.item_id) {
        return await lookupBarcodeById(qrData.item_id);
      }
    } catch (e) {
      // Not JSON, continue
    }
    
    return null;
  }
}

async function lookupBarcodeById(itemId) {
  const { data, error } = await supabase
    .from('inventory_items')
    .select(`
      *,
      inventory_categories(name, icon),
      site_inventory(site_id, quantity, sites(name))
    `)
    .eq('id', itemId)
    .single();
  
  if (error) throw error;
  return data;
}

async function logScan(barcode, itemId, result, source) {
  try {
    await supabase.from('barcode_scan_logs').insert({
      barcode,
      item_id: itemId,
      scanned_by: currentUser.id,
      site_id: currentSiteId,
      scan_result: result,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language
      }
    });
  } catch (error) {
    console.error('Failed to log scan:', error);
  }
}
```

**Tasks:**
- [ ] Implement lookupBarcode function
- [ ] Implement caching logic
- [ ] Add scan logging
- [ ] Test lookup with valid barcodes
- [ ] Test lookup with invalid barcodes
- [ ] Test QR code parsing

**Time Estimate:** 2 hours

---

## 📱 **Phase 2.2: Mobile-Optimized UI**

### **Step 2.1: Mobile Scanner Page HTML**

**File:** `mobile-inventory.html` (New)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Inventory Scanner - NFG</title>
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>
  
  <!-- QR Code Scanner -->
  <script src="https://unpkg.com/html5-qrcode@latest/html5-qrcode.min.js"></script>
  
  <!-- Styles -->
  <link rel="stylesheet" href="./css/mobile.css">
</head>
<body class="bg-black text-white">
  <!-- Offline Banner -->
  <div id="offline-banner" class="hidden fixed top-0 left-0 right-0 bg-orange-600 text-white text-center py-2 text-sm z-50">
    📴 Offline Mode - Changes will sync when online
  </div>
  
  <!-- Sync Indicator -->
  <div id="sync-indicator" class="hidden fixed top-12 right-4 bg-nfgblue text-white px-3 py-2 rounded-full text-sm z-50 flex items-center gap-2">
    <i data-lucide="loader" class="w-4 h-4 animate-spin"></i>
    Syncing...
  </div>
  
  <!-- Scanner Page -->
  <div id="scanner-page" class="fixed inset-0 flex flex-col">
    <!-- Top Bar -->
    <header class="bg-nfgblue text-white p-4 flex items-center justify-between z-10">
      <button id="menu-btn" class="p-2">
        <i data-lucide="menu" class="w-6 h-6"></i>
      </button>
      <h1 class="text-lg font-semibold">Scan Item</h1>
      <button id="site-selector-btn" class="p-2 text-sm flex items-center gap-1">
        <i data-lucide="map-pin" class="w-4 h-4"></i>
        <span id="current-site-name">Select Site</span>
      </button>
    </header>
    
    <!-- Camera Container -->
    <div id="barcode-scanner-container" class="flex-1 relative overflow-hidden bg-black">
      <!-- Scanner overlay with corner indicators -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div class="relative">
          <div class="border-4 border-white rounded-xl w-64 h-64 shadow-lg"></div>
          <!-- Corner indicators -->
          <div class="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
          <div class="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
          <div class="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
          <div class="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
        </div>
      </div>
      
      <!-- Instructions -->
      <div class="absolute bottom-20 left-0 right-0 text-center z-10">
        <p class="text-white text-sm bg-black/70 px-4 py-2 rounded-full inline-block">
          Point camera at barcode or QR code
        </p>
      </div>
    </div>
    
    <!-- Bottom Action Bar -->
    <div class="bg-white dark:bg-gray-800 border-t border-nfgray p-4 flex items-center justify-around">
      <button id="upload-btn" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="upload" class="w-6 h-6 text-nfgblue"></i>
        <span class="text-xs text-gray-600">Upload</span>
      </button>
      
      <button id="flash-toggle" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="flashlight" class="w-6 h-6 text-gray-600"></i>
        <span class="text-xs text-gray-600">Flash</span>
      </button>
      
      <button id="manual-entry-btn" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="keyboard" class="w-6 h-6 text-gray-600"></i>
        <span class="text-xs text-gray-600">Enter</span>
      </button>
      
      <button id="list-view-btn" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="list" class="w-6 h-6 text-gray-600"></i>
        <span class="text-xs text-gray-600">List</span>
      </button>
    </div>
  </div>
  
  <!-- Item Found Modal -->
  <div id="item-found-modal" class="hidden fixed inset-0 bg-black/50 z-50">
    <!-- Content loaded dynamically -->
  </div>
  
  <!-- Manual Entry Modal -->
  <div id="manual-entry-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
      <h3 class="text-lg font-semibold mb-4">Enter Barcode</h3>
      <input 
        type="text" 
        id="manual-barcode-input" 
        placeholder="Enter barcode or scan code"
        class="w-full border border-nfgray rounded-xl px-4 py-3 text-lg mb-4"
        autofocus
      />
      <div class="flex gap-2">
        <button id="manual-entry-cancel" class="flex-1 px-4 py-3 rounded-xl border border-nfgray">
          Cancel
        </button>
        <button id="manual-entry-submit" class="flex-1 px-4 py-3 rounded-xl bg-nfgblue text-white">
          Lookup
        </button>
      </div>
    </div>
  </div>
  
  <!-- Scripts -->
  <script type="module" src="./js/mobile-inventory.js"></script>
  <script type="module" src="./js/offline-db.js"></script>
  <script type="module" src="./js/offline-sync.js"></script>
</body>
</html>
```

**Tasks:**
- [ ] Create mobile-inventory.html
- [ ] Add responsive meta tags
- [ ] Create scanner container
- [ ] Add action buttons
- [ ] Style overlay and indicators
- [ ] Test on mobile device

**Time Estimate:** 2-3 hours

---

### **Step 2.2: Usage Form Component**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
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
            <h3 class="text-xl font-semibold text-nfgblue">${sanitizeText(item.name)}</h3>
            <p class="text-sm text-gray-500">${item.inventory_categories?.name || 'Uncategorized'}</p>
          </div>
          <button id="close-item-modal" class="p-2">
            <i data-lucide="x" class="w-6 h-6"></i>
          </button>
        </div>
        
        <!-- Item Info -->
        <div class="p-4 border-b border-nfgray">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-xs text-gray-500">Available</p>
              <p class="text-2xl font-bold ${availableQty === 0 ? 'text-red-600' : availableQty < 5 ? 'text-orange-600' : 'text-green-600'}">
                ${availableQty} ${item.unit || 'units'}
              </p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Site</p>
              <p class="font-semibold">${siteInventory?.sites?.name || 'Unknown'}</p>
            </div>
          </div>
        </div>
        
        <!-- Usage Form -->
        <form id="usage-form" class="p-4 space-y-4">
          <input type="hidden" id="usage-item-id" value="${item.id}">
          <input type="hidden" id="usage-site-id" value="${siteId}">
          
          <!-- Job Selector -->
          <div>
            <label class="block text-sm font-medium mb-2">Job (Optional)</label>
            <select 
              id="usage-job-id" 
              class="w-full border border-nfgray rounded-xl px-4 py-3 text-lg"
            >
              <option value="">No job</option>
              <!-- Populated by JS -->
            </select>
          </div>
          
          <!-- Quantity Stepper -->
          <div>
            <label class="block text-sm font-medium mb-2">Quantity Used</label>
            <div class="flex items-center gap-4">
              <button 
                type="button" 
                id="qty-decrease" 
                class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold"
              >
                −
              </button>
              <input 
                type="number" 
                id="usage-quantity" 
                value="1" 
                min="1" 
                max="${availableQty}"
                class="flex-1 text-center text-3xl font-bold border-2 border-nfgblue rounded-xl py-2"
              />
              <button 
                type="button" 
                id="qty-increase" 
                class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl font-bold"
              >
                +
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-1 text-center">Available: ${availableQty} ${item.unit || ''}</p>
          </div>
          
          <!-- Photo Gallery -->
          <div>
            <label class="block text-sm font-medium mb-2">Photos</label>
            <div id="photo-gallery" class="grid grid-cols-3 gap-2">
              <!-- Photos will be added here -->
              <div 
                id="add-photo-btn" 
                class="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer bg-gray-50"
              >
                <i data-lucide="camera" class="w-8 h-8 text-gray-400"></i>
              </div>
            </div>
          </div>
          
          <!-- Notes -->
          <div>
            <label class="block text-sm font-medium mb-2">Notes</label>
            <textarea 
              id="usage-notes" 
              rows="3" 
              placeholder="Optional notes..."
              class="w-full border border-nfgray rounded-xl px-4 py-3"
            ></textarea>
          </div>
          
          <!-- Actions -->
          <div class="flex gap-2 pt-4 border-t border-nfgray">
            <button 
              type="button" 
              id="cancel-usage" 
              class="flex-1 px-4 py-4 rounded-xl border border-nfgray font-medium"
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
  
  // Attach event listeners
  attachUsageFormListeners(item, siteId, availableQty);
}
```

**Tasks:**
- [ ] Create renderItemFoundModal function
- [ ] Implement quantity stepper
- [ ] Add job selector dropdown
- [ ] Add photo gallery component
- [ ] Style form for mobile
- [ ] Test form submission

**Time Estimate:** 3-4 hours

---

### **Step 2.3: Mobile Inventory List View**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
function showInventoryList() {
  const scannerPage = document.getElementById('scanner-page');
  const listView = document.getElementById('inventory-list-view');
  
  if (!listView) {
    createInventoryListView();
  }
  
  scannerPage.classList.add('hidden');
  listView.classList.remove('hidden');
}

function createInventoryListView() {
  const body = document.body;
  
  body.insertAdjacentHTML('beforeend', `
    <div id="inventory-list-view" class="hidden fixed inset-0 flex flex-col bg-white dark:bg-gray-900">
      <!-- Header -->
      <header class="bg-nfgblue text-white p-4 flex items-center justify-between">
        <button id="back-to-scanner" class="p-2">
          <i data-lucide="arrow-left" class="w-6 h-6"></i>
        </button>
        <h1 class="text-lg font-semibold">Inventory</h1>
        <button id="refresh-list" class="p-2">
          <i data-lucide="refresh-cw" class="w-6 h-6"></i>
        </button>
      </header>
      
      <!-- Search & Filters -->
      <div class="p-4 border-b border-nfgray bg-white dark:bg-gray-800">
        <input 
          type="text" 
          id="mobile-search" 
          placeholder="Search items..."
          class="w-full border border-nfgray rounded-xl px-4 py-3 text-lg"
        />
        <div class="flex gap-2 mt-2 overflow-x-auto">
          <button class="filter-chip active" data-filter="all">All</button>
          <button class="filter-chip" data-filter="low">Low Stock</button>
          <button class="filter-chip" data-filter="this-site">This Site</button>
        </div>
      </div>
      
      <!-- Item List -->
      <div id="mobile-inventory-list" class="flex-1 overflow-y-auto p-4 space-y-3">
        <!-- Items loaded here -->
      </div>
    </div>
  `);
  
  attachListViewListeners();
}

function renderMobileInventoryList(items, siteId) {
  const container = document.getElementById('mobile-inventory-list');
  
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <i data-lucide="package-x" class="w-16 h-16 mx-auto text-gray-300 mb-4"></i>
        <p class="text-gray-500">No items found</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = items.map(item => {
    const siteInv = item.site_inventory?.find(si => si.site_id === siteId);
    const qty = siteInv?.quantity || 0;
    const isLowStock = qty < (item.low_stock_threshold || 5);
    
    return `
      <div 
        class="item-card bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4"
        data-item-id="${item.id}"
      >
        <div class="flex items-center gap-4">
          <!-- Icon -->
          <div class="w-16 h-16 bg-nfglight rounded-xl flex items-center justify-center flex-shrink-0">
            <i data-lucide="${item.inventory_categories?.icon || 'package'}" class="w-8 h-8 text-nfgblue"></i>
          </div>
          
          <!-- Info -->
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold text-lg truncate">${sanitizeText(item.name)}</h3>
            <p class="text-sm text-gray-500">${item.inventory_categories?.name || ''}</p>
            <div class="flex items-center gap-4 mt-1">
              <span class="text-sm ${qty === 0 ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-600'}">
                Qty: <strong>${qty}</strong> ${item.unit || ''}
              </span>
              ${isLowStock ? '<span class="chip-status low">Low Stock</span>' : ''}
            </div>
          </div>
          
          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <button 
              onclick="quickUseItem(${item.id}, ${siteId})" 
              class="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center"
            >
              <i data-lucide="minus" class="w-5 h-5"></i>
            </button>
            <button 
              onclick="viewItemDetails(${item.id})" 
              class="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"
            >
              <i data-lucide="eye" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
  
  // Attach swipe handlers
  attachSwipeHandlers();
}
```

**Tasks:**
- [ ] Create list view HTML structure
- [ ] Implement renderMobileInventoryList
- [ ] Add search functionality
- [ ] Add filter chips
- [ ] Implement swipe gestures
- [ ] Add pull-to-refresh
- [ ] Test on mobile device

**Time Estimate:** 4-5 hours

---

## 📸 **Phase 2.3: Photo Upload & Management**

### **Step 3.1: Photo Capture Component**

**File:** `js/photo-capture.js` (New)

```javascript
export class PhotoCapture {
  constructor() {
    this.cameraStream = null;
    this.maxPhotos = 5;
    this.photos = [];
  }
  
  async initCamera(videoElement) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      videoElement.srcObject = stream;
      this.cameraStream = stream;
      return true;
    } catch (error) {
      console.error('Camera access failed:', error);
      return false;
    }
  }
  
  capturePhoto(videoElement) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0);
      
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85);
    });
  }
  
  async compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', quality);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }
  
  stopCamera() {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }
}
```

**File:** `js/mobile-inventory.js` (Continue)

```javascript
import { PhotoCapture } from './photo-capture.js';

const photoCapture = new PhotoCapture();

// Photo capture modal
function openPhotoCaptureModal() {
  const modal = document.createElement('div');
  modal.id = 'photo-capture-modal';
  modal.className = 'fixed inset-0 bg-black z-50 flex flex-col';
  
  modal.innerHTML = `
    <div class="flex-1 relative">
      <video id="camera-preview" autoplay playsinline class="w-full h-full object-cover"></video>
      
      <!-- Camera controls overlay -->
      <div class="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-center gap-6">
        <button id="cancel-capture" class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <i data-lucide="x" class="w-8 h-8 text-white"></i>
        </button>
        <button id="capture-btn" class="w-20 h-20 rounded-full bg-white border-4 border-gray-300"></button>
        <button id="flip-camera" class="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
          <i data-lucide="refresh-cw" class="w-8 h-8 text-white"></i>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  const video = document.getElementById('camera-preview');
  photoCapture.initCamera(video);
  
  // Capture button
  document.getElementById('capture-btn').addEventListener('click', async () => {
    const blob = await photoCapture.capturePhoto(video);
    addPhotoToGallery(blob);
    closePhotoCaptureModal();
  });
  
  // Cancel
  document.getElementById('cancel-capture').addEventListener('click', () => {
    closePhotoCaptureModal();
  });
}

function addPhotoToGallery(blob) {
  const gallery = document.getElementById('photo-gallery');
  if (!gallery) return;
  
  const photoId = Date.now();
  const photoUrl = URL.createObjectURL(blob);
  
  const photoElement = document.createElement('div');
  photoElement.className = 'photo-thumbnail relative aspect-square';
  photoElement.dataset.photoId = photoId;
  photoElement.innerHTML = `
    <img src="${photoUrl}" alt="Usage photo" class="w-full h-full object-cover rounded-lg">
    <button 
      onclick="removePhoto(${photoId})" 
      class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
    >
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;
  
  // Insert before "add photo" button
  const addBtn = document.getElementById('add-photo-btn');
  gallery.insertBefore(photoElement, addBtn);
  
  // Store blob reference
  window.usagePhotos = window.usagePhotos || [];
  window.usagePhotos.push({ id: photoId, blob, url: photoUrl });
  
  if (window.lucide) lucide.createIcons();
}

function removePhoto(photoId) {
  const photoElement = document.querySelector(`[data-photo-id="${photoId}"]`);
  if (photoElement) {
    photoElement.remove();
  }
  
  // Remove from array
  if (window.usagePhotos) {
    window.usagePhotos = window.usagePhotos.filter(p => p.id !== photoId);
  }
}

window.removePhoto = removePhoto;
```

**Tasks:**
- [ ] Create photo-capture.js
- [ ] Implement camera access
- [ ] Add photo capture button
- [ ] Implement compression
- [ ] Create photo gallery component
- [ ] Add remove photo functionality
- [ ] Test on mobile device

**Time Estimate:** 3-4 hours

---

### **Step 3.2: Photo Upload to Storage**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
async function uploadUsagePhotos(photos, jobId, itemId) {
  if (!photos || photos.length === 0) return [];
  
  const uploadPromises = photos.map(async (photo, index) => {
    try {
      // Compress if needed
      const compressedBlob = await photoCapture.compressImage(
        new File([photo.blob], 'photo.jpg', { type: 'image/jpeg' })
      );
      
      // Generate filename
      const timestamp = Date.now();
      const fileName = `${jobId || 'no-job'}/${timestamp}_${itemId}_${index}.jpg`;
      const path = `inventory-usage-photos/${fileName}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('inventory-photos')
        .upload(path, compressedBlob, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('inventory-photos')
        .getPublicUrl(path);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error(`Failed to upload photo ${index}:`, error);
      return null;
    }
  });
  
  const urls = await Promise.all(uploadPromises);
  return urls.filter(url => url !== null);
}
```

**Tasks:**
- [ ] Create Supabase Storage bucket 'inventory-photos'
- [ ] Set up RLS policies for bucket
- [ ] Implement uploadUsagePhotos function
- [ ] Add progress indicator
- [ ] Handle upload errors
- [ ] Test photo upload

**Time Estimate:** 2 hours

---

## 📴 **Phase 2.4: Offline Capability**

### **Step 4.1: IndexedDB Setup**

**File:** `js/offline-db.js` (New)

```javascript
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

class OfflineInventoryDB {
  constructor() {
    this.db = new Dexie('NFGInventoryOffline');
    
    this.db.version(1).stores({
      pendingUsage: '++id, item_id, job_id, quantity, photos, notes, created_at, synced',
      cachedItems: 'id, barcode, name, site_id, quantity, last_updated',
      cachedJobs: 'id, title, site_id, status, last_updated',
      photoBlobs: '++id, usage_id, blob, url, uploaded',
      syncQueue: '++id, action, data, created_at, retries'
    });
  }
  
  async savePendingUsage(usageData) {
    const id = await this.db.pendingUsage.add({
      ...usageData,
      synced: false,
      created_at: new Date().toISOString()
    });
    
    // Save photos
    if (usageData.photos && usageData.photos.length > 0) {
      for (let i = 0; i < usageData.photos.length; i++) {
        await this.db.photoBlobs.add({
          usage_id: id,
          blob: usageData.photos[i].blob,
          uploaded: false
        });
      }
    }
    
    return id;
  }
  
  async getPendingUsage() {
    return await this.db.pendingUsage
      .where('synced').equals(false)
      .toArray();
  }
  
  async cacheItem(item) {
    await this.db.cachedItems.put({
      id: item.id,
      barcode: item.barcode,
      name: item.name,
      site_id: item.site_id,
      quantity: item.quantity,
      last_updated: new Date().toISOString(),
      ...item
    });
  }
  
  async getCachedItemByBarcode(barcode) {
    return await this.db.cachedItems
      .where('barcode').equals(barcode)
      .first();
  }
  
  isCacheValid(item, maxAgeMinutes = 60) {
    if (!item || !item.last_updated) return false;
    const age = (Date.now() - new Date(item.last_updated).getTime()) / 1000 / 60;
    return age < maxAgeMinutes;
  }
}

export const offlineDB = new OfflineInventoryDB();
```

**Tasks:**
- [ ] Install Dexie.js (via CDN)
- [ ] Create offline-db.js
- [ ] Define database schema
- [ ] Implement cache functions
- [ ] Test IndexedDB operations
- [ ] Handle database versioning

**Time Estimate:** 3-4 hours

---

### **Step 4.2: Service Worker**

**File:** `sw.js` (New or Modify existing)

```javascript
const CACHE_NAME = 'nfg-inventory-v1';
const OFFLINE_URLS = [
  '/mobile-inventory.html',
  '/js/mobile-inventory.js',
  '/js/barcode-scanner.js',
  '/js/photo-capture.js',
  '/js/offline-db.js',
  '/css/mobile.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(event.request).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/mobile-inventory.html');
        }
      });
    })
  );
});
```

**File:** `mobile-inventory.html` (Modify)

**Add to head:**
```javascript
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('Service Worker registered');
    });
  }
</script>
```

**Tasks:**
- [ ] Create or update sw.js
- [ ] Register service worker
- [ ] Test offline caching
- [ ] Test offline page loading
- [ ] Update cache version when needed

**Time Estimate:** 2-3 hours

---

### **Step 4.3: Sync Manager**

**File:** `js/offline-sync.js` (New)

```javascript
import { offlineDB } from './offline-db.js';
import { uploadUsagePhotos } from './mobile-inventory.js';

export class OfflineSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startAutoSync();
      this.showOnlineBanner();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopAutoSync();
      this.showOfflineBanner();
    });
    
    if (this.isOnline) {
      this.startAutoSync();
    }
  }
  
  startAutoSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingItems();
      }
    }, 30000);
    
    this.syncPendingItems();
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async syncPendingItems() {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    this.showSyncIndicator(true);
    
    try {
      const pendingItems = await offlineDB.getPendingUsage();
      
      if (pendingItems.length === 0) {
        this.syncInProgress = false;
        this.showSyncIndicator(false);
        return;
      }
      
      let successCount = 0;
      let failCount = 0;
      
      for (const item of pendingItems) {
        try {
          await this.syncUsageItem(item);
          await offlineDB.db.pendingUsage.update(item.id, { synced: true });
          successCount++;
        } catch (error) {
          console.error('Sync failed:', error);
          failCount++;
          const retries = (item.retries || 0) + 1;
          await offlineDB.db.pendingUsage.update(item.id, { retries });
          
          if (retries >= 3) {
            await offlineDB.db.pendingUsage.update(item.id, { 
              sync_error: error.message,
              failed: true
            });
          }
        }
      }
      
      this.showSyncSummary(successCount, failCount);
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
      this.showSyncIndicator(false);
    }
  }
  
  async syncUsageItem(item) {
    // 1. Upload photos
    const photoBlobs = await offlineDB.db.photoBlobs
      .where('usage_id').equals(item.id)
      .toArray();
    
    const photoUrls = [];
    for (const photoBlob of photoBlobs) {
      const url = await uploadUsagePhotos(
        [{ blob: photoBlob.blob }],
        item.job_id,
        item.item_id
      );
      if (url && url[0]) {
        photoUrls.push(url[0]);
        await offlineDB.db.photoBlobs.update(photoBlob.id, { 
          uploaded: true,
          url: url[0]
        });
      }
    }
    
    // 2. Create transaction
    await supabase.from('inventory_transactions').insert({
      item_id: item.item_id,
      site_id: item.site_id,
      job_id: item.job_id,
      transaction_type: 'use',
      quantity_change: -item.quantity,
      quantity_before: item.quantity_before,
      quantity_after: item.quantity_after,
      user_id: currentUser.id,
      notes: item.notes
    });
    
    // 3. Create job usage record (if job_id exists)
    if (item.job_id) {
      await supabase.from('job_inventory_usage').insert({
        job_id: item.job_id,
        item_id: item.item_id,
        site_id: item.site_id,
        quantity_used: item.quantity,
        unit_cost: item.unit_cost,
        notes: item.notes,
        used_by: currentUser.id,
        photos: photoUrls
      });
    }
    
    // 4. Update site inventory
    await supabase
      .from('site_inventory')
      .update({ quantity: item.quantity_after })
      .eq('site_id', item.site_id)
      .eq('item_id', item.item_id);
  }
  
  showSyncIndicator(show) {
    const indicator = document.getElementById('sync-indicator');
    if (indicator) {
      indicator.classList.toggle('hidden', !show);
    }
  }
  
  showOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  }
  
  showOnlineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.classList.add('hidden');
      toast.success('Back online - Syncing changes...');
    }
  }
  
  showSyncSummary(success, failed) {
    if (success > 0) {
      toast.success(`${success} item(s) synced`, 'Synced');
    }
    if (failed > 0) {
      toast.error(`${failed} item(s) failed. Will retry.`, 'Sync Error');
    }
  }
}

export const syncManager = new OfflineSyncManager();
```

**Tasks:**
- [ ] Create offline-sync.js
- [ ] Implement sync queue logic
- [ ] Add online/offline detection
- [ ] Implement retry logic
- [ ] Add sync status indicators
- [ ] Test offline->online sync

**Time Estimate:** 5-6 hours

---

### **Step 4.4: Update Usage Submission**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
import { offlineDB } from './offline-db.js';
import { syncManager } from './offline-sync.js';

async function submitInventoryUsage(usageData) {
  // Get current inventory quantity
  const { data: currentInventory } = await supabase
    .from('site_inventory')
    .select('quantity')
    .eq('site_id', usageData.site_id)
    .eq('item_id', usageData.item_id)
    .single();
  
  const quantityBefore = currentInventory?.quantity || 0;
  const quantityAfter = Math.max(0, quantityBefore - usageData.quantity);
  
  const fullUsageData = {
    ...usageData,
    quantity_before: quantityBefore,
    quantity_after: quantityAfter
  };
  
  // Check if online
  if (!navigator.onLine) {
    // Save to offline queue
    const id = await offlineDB.savePendingUsage(fullUsageData);
    toast.info('Saved offline - will sync when online', 'Offline Mode');
    updateQueueBadge();
    return { success: true, offline: true, id };
  }
  
  // Online - submit immediately
  try {
    await syncManager.syncUsageItem(fullUsageData);
    toast.success('Usage recorded successfully', 'Success');
    return { success: true, offline: false };
  } catch (error) {
    console.error('Submission failed:', error);
    
    // If submission fails, save to queue
    await offlineDB.savePendingUsage(fullUsageData);
    toast.warning('Saved to queue - will retry', 'Saved');
    
    return { success: false, queued: true };
  }
}

function updateQueueBadge() {
  offlineDB.getPendingUsage().then(items => {
    const badge = document.getElementById('queue-badge');
    if (badge) {
      if (items.length > 0) {
        badge.textContent = items.length;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  });
}
```

**Tasks:**
- [ ] Update submitInventoryUsage for offline
- [ ] Add queue badge to UI
- [ ] Test offline submission
- [ ] Test online submission
- [ ] Test sync on reconnect

**Time Estimate:** 2 hours

---

## 🔄 **Phase 2.5: Real-Time Updates**

### **Step 5.1: Realtime Subscriptions**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
let inventoryChannel = null;
let lowStockChannel = null;

function setupRealtimeInventory(siteId) {
  // Clean up existing channels
  if (inventoryChannel) {
    supabase.removeChannel(inventoryChannel);
  }
  
  // Subscribe to inventory changes
  inventoryChannel = supabase
    .channel(`inventory-changes-${siteId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'site_inventory',
        filter: `site_id=eq.${siteId}`
      },
      (payload) => {
        handleInventoryChange(payload);
      }
    )
    .subscribe();
  
  // Subscribe to low stock alerts
  setupLowStockAlerts(siteId);
}

function handleInventoryChange(payload) {
  const { eventType, new: newData, old: oldData } = payload;
  
  // Update cache
  if (eventType === 'UPDATE' && newData) {
    offlineDB.cacheItem(newData);
  }
  
  // Refresh UI if on inventory list
  if (document.getElementById('inventory-list-view') && 
      !document.getElementById('inventory-list-view').classList.contains('hidden')) {
    refreshInventoryList();
  }
  
  // Show notification for significant changes
  if (eventType === 'UPDATE') {
    const diff = (oldData?.quantity || 0) - (newData?.quantity || 0);
    if (Math.abs(diff) > 5) {
      toast.info(`Inventory updated: ${newData?.quantity || 0} units`, 'Updated');
    }
  }
}

function setupLowStockAlerts(siteId) {
  if (lowStockChannel) {
    supabase.removeChannel(lowStockChannel);
  }
  
  lowStockChannel = supabase
    .channel(`low-stock-alerts-${siteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'site_inventory',
        filter: `site_id=eq.${siteId}`
      },
      (payload) => {
        const newQuantity = payload.new.quantity;
        const threshold = payload.new.low_stock_threshold || 5;
        
        if (newQuantity > 0 && newQuantity < threshold) {
          showLowStockNotification(payload.new);
        }
      }
    )
    .subscribe();
}

function showLowStockNotification(item) {
  toast.warning(
    `${item.item_name} is running low (${item.quantity} remaining)`,
    'Low Stock Alert'
  );
}
```

**Tasks:**
- [ ] Set up realtime subscriptions
- [ ] Handle inventory change events
- [ ] Implement low stock alerts
- [ ] Update UI on changes
- [ ] Test realtime updates
- [ ] Clean up channels on page unload

**Time Estimate:** 2-3 hours

---

## 🌍 **Phase 2.6: Location Services**

### **Step 6.1: Location Detection**

**File:** `js/location-service.js` (New)

```javascript
export class LocationService {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
  }
  
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          resolve(this.currentLocation);
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }
  
  async findNearestSite() {
    if (!this.currentLocation) {
      await this.getCurrentLocation();
    }
    
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (!sites || sites.length === 0) return null;
    
    const sitesWithDistance = sites.map(site => {
      const distance = this.calculateDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        site.latitude,
        site.longitude
      );
      return { ...site, distance };
    });
    
    sitesWithDistance.sort((a, b) => a.distance - b.distance);
    
    const nearest = sitesWithDistance[0];
    if (nearest.distance <= 100) {
      return nearest;
    }
    
    return null;
  }
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }
}

export const locationService = new LocationService();
```

**File:** `js/mobile-inventory.js` (Continue)

**Add auto-site detection:**
```javascript
async function autoDetectSite() {
  try {
    const nearestSite = await locationService.findNearestSite();
    if (nearestSite) {
      const confirmed = await showConfirm(
        `You appear to be at ${nearestSite.name}. Switch to this site?`,
        'Auto-Detect Site'
      );
      if (confirmed) {
        currentSiteId = nearestSite.id;
        updateSiteSelector();
        loadInventoryForSite(nearestSite.id);
      }
    }
  } catch (error) {
    console.error('Location detection failed:', error);
  }
}
```

**Tasks:**
- [ ] Create location-service.js
- [ ] Implement GPS location
- [ ] Add nearest site detection
- [ ] Add location permission request
- [ ] Test on mobile device
- [ ] Add location to scan logs

**Time Estimate:** 2-3 hours

---

## 🔒 **Phase 2.7: Security & Permissions**

### **Step 7.1: RLS Policies for Mobile**

**File:** `ADD_MOBILE_INVENTORY_RLS.sql` (New)

```sql
-- RLS for job_inventory_usage (if not exists)
ALTER TABLE job_inventory_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own job usage" ON job_inventory_usage;
CREATE POLICY "Staff can view own job usage"
ON job_inventory_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_inventory_usage.job_id
    AND (jobs.assigned_worker_id = auth.uid() OR jobs.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

DROP POLICY IF EXISTS "Staff can create usage" ON job_inventory_usage;
CREATE POLICY "Staff can create usage"
ON job_inventory_usage FOR INSERT
WITH CHECK (
  used_by = auth.uid()
);

-- Photo storage RLS
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-photos'
);

CREATE POLICY "Users can view photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inventory-photos'
  AND (
    -- Can view own photos
    (storage.foldername(name))[1] = auth.uid()::text
    -- Or admin/manager can view all
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
);
```

**Tasks:**
- [ ] Create RLS SQL file
- [ ] Run in Supabase
- [ ] Test permissions
- [ ] Verify staff can only access their data
- [ ] Verify admins can access all data

**Time Estimate:** 1-2 hours

---

### **Step 7.2: Site Access Verification**

**File:** `js/mobile-inventory.js` (Continue)

```javascript
async function verifySiteAccess(siteId) {
  // Check worker site assignments
  const { data: assignments } = await supabase
    .from('worker_site_assignments')
    .select('*')
    .eq('worker_id', currentUser.id)
    .eq('site_id', siteId)
    .single();
  
  // Check if admin/manager
  const isAdmin = currentUserProfile && 
    ['admin', 'manager', 'super_admin'].includes(currentUserProfile.role);
  
  if (!assignments && !isAdmin) {
    throw new Error('You do not have access to this site');
  }
  
  return true;
}
```

**Tasks:**
- [ ] Implement verifySiteAccess
- [ ] Add to usage submission
- [ ] Test with different user roles
- [ ] Add error handling

**Time Estimate:** 1 hour

---

## 📋 **Complete Implementation Checklist**

### **Phase 2.1: Barcode System**
- [ ] Create `ADD_BARCODE_SUPPORT.sql` and run it
- [ ] Create `js/barcode-generator.js`
- [ ] Update `js/inventory.js` to auto-generate barcodes
- [ ] Create `js/barcode-scanner.js`
- [ ] Add scanner to mobile-inventory.html
- [ ] Implement barcode lookup with caching
- [ ] Add scan logging

### **Phase 2.2: Mobile UI**
- [ ] Create `mobile-inventory.html`
- [ ] Add scanner page layout
- [ ] Create usage form component
- [ ] Create inventory list view
- [ ] Add search and filters
- [ ] Implement swipe gestures
- [ ] Add pull-to-refresh

### **Phase 2.3: Photo Upload**
- [ ] Create `js/photo-capture.js`
- [ ] Add camera access
- [ ] Implement photo compression
- [ ] Create photo gallery component
- [ ] Set up Supabase Storage bucket
- [ ] Implement photo upload
- [ ] Add photo display

### **Phase 2.4: Offline Support**
- [ ] Create `js/offline-db.js` with Dexie
- [ ] Create/modify `sw.js` service worker
- [ ] Create `js/offline-sync.js`
- [ ] Update usage submission for offline
- [ ] Add offline/online indicators
- [ ] Test offline functionality
- [ ] Test sync on reconnect

### **Phase 2.5: Real-Time**
- [ ] Set up inventory realtime subscriptions
- [ ] Set up low stock alerts
- [ ] Update UI on changes
- [ ] Test realtime updates

### **Phase 2.6: Location**
- [ ] Create `js/location-service.js`
- [ ] Implement GPS location
- [ ] Add nearest site detection
- [ ] Test on mobile device

### **Phase 2.7: Security**
- [ ] Create `ADD_MOBILE_INVENTORY_RLS.sql`
- [ ] Run RLS policies
- [ ] Implement site access verification
- [ ] Test permissions

---

## ⏱️ **Time Estimates by Phase**

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| 2.1: Barcode System | 7 tasks | 8-10 hours |
| 2.2: Mobile UI | 7 tasks | 9-12 hours |
| 2.3: Photo Upload | 7 tasks | 5-6 hours |
| 2.4: Offline Support | 7 tasks | 10-12 hours |
| 2.5: Real-Time | 4 tasks | 2-3 hours |
| 2.6: Location | 4 tasks | 2-3 hours |
| 2.7: Security | 4 tasks | 2-3 hours |
| **Total** | **40 tasks** | **38-49 hours** |

---

## 🚀 **Recommended Implementation Order**

### **Week 1: Foundation (Phases 2.1-2.2)**
- Day 1-2: Barcode system (Phase 2.1)
- Day 3-4: Mobile UI basics (Phase 2.2)
- Day 5: Testing & polish

### **Week 2: Core Features (Phases 2.3-2.4)**
- Day 1-2: Photo upload (Phase 2.3)
- Day 3-5: Offline support (Phase 2.4)

### **Week 3: Advanced Features (Phases 2.5-2.7)**
- Day 1: Real-time updates (Phase 2.5)
- Day 2: Location services (Phase 2.6)
- Day 3: Security & permissions (Phase 2.7)
- Day 4-5: Testing & bug fixes

---

## 📝 **Key Files to Create**

### **New Files:**
1. `mobile-inventory.html` - Main mobile page
2. `js/barcode-scanner.js` - Scanner component
3. `js/barcode-generator.js` - Barcode generation
4. `js/photo-capture.js` - Photo handling
5. `js/offline-db.js` - IndexedDB wrapper
6. `js/offline-sync.js` - Sync manager
7. `js/location-service.js` - GPS services
8. `js/mobile-inventory.js` - Main mobile logic
9. `css/mobile.css` - Mobile styles
10. `sw.js` - Service worker
11. `ADD_BARCODE_SUPPORT.sql` - Database schema
12. `ADD_MOBILE_INVENTORY_RLS.sql` - Security policies

### **Files to Modify:**
1. `js/inventory.js` - Add barcode generation
2. `manifest.json` - Update for PWA

---

## ✅ **Ready to Start?**

This is your complete implementation roadmap. Each phase builds on the previous one, so follow the order listed.

**Start with Phase 2.1, Step 1.1** - Create the database schema first, then work through each step sequentially.

Good luck! 🚀

