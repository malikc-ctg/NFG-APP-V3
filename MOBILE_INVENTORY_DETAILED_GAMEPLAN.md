# 📱 Mobile On-Site Inventory Updates - Detailed Gameplan
## Complete Technical & UX Specification

**Last Updated:** Current Date

---

## 🎯 **Overview**

Enable field workers to manage inventory directly from their mobile devices while on-site, including:
- Scanning barcodes/QR codes to identify items instantly
- Marking inventory usage tied to specific jobs
- Uploading photos for documentation
- Working offline when cellular service is poor
- Real-time sync when back online

---

## 📋 **User Stories & Use Cases**

### **Primary User: Field Worker (Staff Role)**

1. **As a cleaner at a site, I want to:**
   - Scan a barcode on a cleaning supply to mark it as used
   - See how many units I have available before using
   - Take a photo to document usage for compliance
   - Mark usage for the specific job I'm working on
   - Work even when there's no internet connection

2. **As a maintenance worker, I want to:**
   - Quickly find replacement parts by scanning
   - See if parts are available at this site
   - Document which parts I used for warranty purposes
   - Know if I need to request more parts

3. **As a manager, I want to:**
   - See real-time inventory usage across all sites
   - Approve/reject unusual usage amounts
   - Track inventory costs per job
   - Get alerts when items are running low

---

## 🏗️ **Technical Architecture**

### **1. Client-Side Stack**

```
Mobile Web App (PWA)
├── Frontend Framework: Vanilla JS (already in use)
├── UI Library: Tailwind CSS (already in use)
├── Icons: Lucide Icons (already in use)
├── Barcode Scanner: html5-qrcode library
├── Camera Access: MediaDevices API (native browser)
├── Offline Storage: IndexedDB (via Dexie.js or native)
├── Service Worker: For offline caching
└── Push Notifications: Web Push API
```

### **2. Backend Stack**

```
Supabase
├── PostgreSQL: Inventory data
├── Storage: Photo uploads
├── Realtime: Live updates
├── Edge Functions: Image processing
└── Row Level Security: Access control
```

### **3. Data Flow**

```
[Mobile Device] 
  ↓ (Scan Barcode)
[Decode Barcode] → Item ID
  ↓ (Lookup Item)
[Fetch Item Data] ← Supabase (or cached)
  ↓ (User Actions)
[Mark Usage] → [Queue Action]
  ↓ (If Online)
[Submit to Supabase] → [Create Transaction]
  ↓ (If Offline)
[Store in IndexedDB] → [Sync Later]
```

---

## 🔍 **Phase 2.1: Barcode/QR Code System (Detailed)**

### **2.1.1: Barcode Standards & Formats**

#### **Supported Formats:**
- **EAN-13:** Standard product barcodes (12 digits + check digit)
- **UPC-A:** Common in North America
- **CODE128:** Alphanumeric (for custom codes)
- **QR Code:** Custom format with JSON data payload

#### **QR Code Structure:**
```json
{
  "type": "inventory_item",
  "item_id": 123,
  "site_id": 456,
  "name": "Bleach 5L",
  "code": "INV-2025-001",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### **2.1.2: Database Schema**

```sql
-- Add barcode fields to inventory_items
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS barcode VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS barcode_type VARCHAR(20) DEFAULT 'EAN13',
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT, -- Link to generated QR image
  ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;

-- Create index for fast barcode lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode 
  ON inventory_items(barcode) 
  WHERE barcode IS NOT NULL;

-- Barcode scanning audit log
CREATE TABLE IF NOT EXISTS barcode_scan_logs (
  id BIGSERIAL PRIMARY KEY,
  barcode VARCHAR(100) NOT NULL,
  item_id BIGINT REFERENCES inventory_items(id),
  scanned_by UUID REFERENCES auth.users(id),
  site_id BIGINT REFERENCES sites(id),
  scan_result VARCHAR(50), -- 'found', 'not_found', 'wrong_site'
  device_info JSONB, -- Browser, OS, device type
  location JSONB, -- GPS coordinates if available
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_barcode ON barcode_scan_logs(barcode);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON barcode_scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_logs_created_at ON barcode_scan_logs(created_at);
```

### **2.1.3: Barcode Generation**

#### **Option A: Auto-Generate on Item Creation**
```javascript
// In inventory.js - when creating new item
async function generateBarcodeForItem(itemId, itemName) {
  // Generate CODE128 barcode: INV-{timestamp}-{itemId}
  const timestamp = Date.now();
  const barcode = `INV-${timestamp}-${itemId}`;
  
  // Generate QR code image
  const qrData = {
    type: 'inventory_item',
    item_id: itemId,
    name: itemName,
    code: barcode
  };
  
  // Use qrcode.js to generate QR image
  const qrImage = await generateQRCode(JSON.stringify(qrData));
  
  // Upload QR code image to Supabase Storage
  const fileName = `qr-codes/${itemId}.png`;
  await uploadQRCodeToStorage(fileName, qrImage);
  
  // Update item with barcode
  await supabase
    .from('inventory_items')
    .update({
      barcode: barcode,
      barcode_type: 'CODE128',
      qr_code_url: fileName
    })
    .eq('id', itemId);
  
  return barcode;
}
```

#### **Option B: Manual Entry**
- Allow users to enter existing barcodes
- Validate format
- Check for duplicates

### **2.1.4: Barcode Scanner Implementation**

#### **Library: html5-qrcode**
```html
<!-- Add to mobile-inventory.html -->
<script src="https://unpkg.com/html5-qrcode@latest/html5-qrcode.min.js"></script>
```

#### **Scanner UI Component:**
```javascript
// js/mobile-inventory.js

class MobileBarcodeScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.onScanCallback = null;
  }
  
  async init(cameraId = null) {
    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera
      });
      stream.getTracks().forEach(track => track.stop()); // Stop preview
      
      // Initialize scanner
      this.scanner = new Html5Qrcode("barcode-scanner-container");
      
      return true;
    } catch (error) {
      console.error('Camera access denied:', error);
      return false;
    }
  }
  
  async startScanning(onScanSuccess, onScanError) {
    if (this.isScanning) return;
    
    try {
      const config = {
        fps: 10, // Frames per second
        qrbox: { width: 250, height: 250 }, // Scanning area
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment' // Back camera
        }
      };
      
      await this.scanner.start(
        { facingMode: 'environment' },
        config,
        onScanSuccess,
        onScanError
      );
      
      this.isScanning = true;
      return true;
    } catch (error) {
      console.error('Failed to start scanner:', error);
      return false;
    }
  }
  
  async stopScanning() {
    if (!this.isScanning) return;
    
    try {
      await this.scanner.stop();
      this.isScanning = false;
      return true;
    } catch (error) {
      console.error('Failed to stop scanner:', error);
      return false;
    }
  }
  
  async scanFromFile(file) {
    try {
      const result = await this.scanner.scanFile(file, false);
      return result;
    } catch (error) {
      console.error('File scan failed:', error);
      return null;
    }
  }
}
```

### **2.1.5: Barcode Lookup Logic**

```javascript
async function lookupBarcode(barcode) {
  // 1. Check cache first (IndexedDB)
  const cached = await getCachedItem(barcode);
  if (cached && !isCacheExpired(cached)) {
    logScan(barcode, cached.item_id, 'found', 'cache');
    return cached;
  }
  
  // 2. Query Supabase
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select(`
        *,
        inventory_categories(name, icon),
        site_inventory!inner(site_id, quantity, sites(name))
      `)
      .eq('barcode', barcode)
      .single();
    
    if (error) throw error;
    
    // 3. Cache the result
    await cacheItem(barcode, data);
    
    // 4. Log the scan
    await logScan(barcode, data.id, 'found', 'database');
    
    return data;
  } catch (error) {
    // Item not found
    await logScan(barcode, null, 'not_found', 'database');
    
    // Show manual entry option
    showManualEntryModal(barcode);
    return null;
  }
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
    // Don't fail the scan if logging fails
  }
}
```

---

## 📱 **Phase 2.2: Mobile-Optimized UI (Detailed)**

### **2.2.1: Mobile Scanner Page Layout**

```
┌─────────────────────────────────┐
│  [☰ Menu]  Inventory Scanner    │ ← Top bar (sticky)
├─────────────────────────────────┤
│                                 │
│    ┌─────────────────────┐     │
│    │                     │     │
│    │   CAMERA VIEW       │     │ ← Live camera feed
│    │                     │     │
│    │   [Scanning Box]    │     │ ← Overlay box
│    │                     │     │
│    └─────────────────────┘     │
│                                 │
│    📸 Point camera at barcode   │ ← Instructions
│                                 │
├─────────────────────────────────┤
│ [📁 Upload] [💡 Flash] [📷 Pic]│ ← Action buttons
├─────────────────────────────────┤
│ Recent Scans:                   │
│ • Bleach 5L        [Use] [View] │ ← Quick actions
│ • Paper Towels     [Use] [View] │
└─────────────────────────────────┘
```

### **2.2.2: Scanner Page HTML Structure**

```html
<!-- mobile-inventory.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Inventory Scanner - NFG</title>
  <!-- Styles, scripts, etc. -->
</head>
<body class="bg-black">
  <!-- Full-screen scanner -->
  <div id="scanner-page" class="fixed inset-0 flex flex-col">
    <!-- Top bar -->
    <header class="bg-nfgblue text-white p-4 flex items-center justify-between z-10">
      <button id="menu-btn" class="p-2">
        <i data-lucide="menu" class="w-6 h-6"></i>
      </button>
      <h1 class="text-lg font-semibold">Scan Item</h1>
      <button id="site-selector-btn" class="p-2 text-sm">
        <i data-lucide="map-pin" class="w-4 h-4 inline mr-1"></i>
        Site
      </button>
    </header>
    
    <!-- Camera container -->
    <div id="barcode-scanner-container" class="flex-1 relative overflow-hidden">
      <!-- Scanner will initialize here -->
      
      <!-- Scanning overlay -->
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="border-4 border-white rounded-xl w-64 h-64 shadow-lg">
          <!-- Corner indicators -->
          <div class="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
          <div class="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
          <div class="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
          <div class="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
        </div>
      </div>
      
      <!-- Instructions overlay -->
      <div class="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4 text-center">
        <p class="text-sm">Point camera at barcode or QR code</p>
        <p class="text-xs text-gray-300 mt-1">Make sure code is well-lit and in focus</p>
      </div>
    </div>
    
    <!-- Bottom action bar -->
    <div class="bg-white dark:bg-gray-800 border-t border-nfgray p-4 flex items-center justify-around">
      <button id="upload-btn" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="upload" class="w-6 h-6 text-nfgblue"></i>
        <span class="text-xs">Upload</span>
      </button>
      
      <button id="flash-toggle" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="flashlight" class="w-6 h-6 text-gray-600"></i>
        <span class="text-xs">Flash</span>
      </button>
      
      <button id="manual-entry-btn" class="flex flex-col items-center gap-1 p-3">
        <i data-lucide="keyboard" class="w-6 h-6 text-gray-600"></i>
        <span class="text-xs">Enter</span>
      </button>
    </div>
  </div>
  
  <!-- Item found modal -->
  <div id="item-found-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-end">
    <div class="bg-white dark:bg-gray-800 rounded-t-3xl w-full max-h-[80vh] overflow-y-auto animate-slide-up">
      <!-- Item details and usage form -->
    </div>
  </div>
  
  <!-- Manual entry modal -->
  <div id="manual-entry-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6">
      <!-- Manual barcode entry form -->
    </div>
  </div>
</body>
</html>
```

### **2.2.3: Usage Form (After Scan)**

```
┌─────────────────────────────────┐
│  Bleach 5L              [×]     │ ← Item header
├─────────────────────────────────┤
│  📦 Available: 15 units         │
│  📍 Site: Downtown Office       │
│  💰 Cost: $12.50/unit           │
├─────────────────────────────────┤
│  Job:                           │
│  [Select Job ▼]                 │
├─────────────────────────────────┤
│  Quantity Used:                 │
│  ┌───────┐                      │
│  │   -   │  1  │   +   │       │ ← Large stepper
│  └───────┘                      │
├─────────────────────────────────┤
│  Photos:                        │
│  ┌───┐ ┌───┐ ┌───┐            │
│  │📷 │ │📷 │ │ + │            │ ← Photo thumbnails
│  └───┘ └───┘ └───┘            │
├─────────────────────────────────┤
│  Notes:                         │
│  ┌──────────────────────────┐   │
│  │ Used for deep cleaning   │   │
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  [Cancel]  [Mark as Used]       │ ← Action buttons
└─────────────────────────────────┘
```

### **2.2.4: Mobile Inventory List View**

```html
<!-- Touch-optimized list -->
<div id="mobile-inventory-list" class="space-y-2 p-4">
  <!-- Search bar (sticky) -->
  <div class="sticky top-0 bg-white dark:bg-gray-800 z-10 pb-2">
    <input 
      type="text" 
      placeholder="Search items..."
      class="w-full border border-nfgray rounded-xl px-4 py-3 text-lg"
      id="mobile-search-input"
    />
  </div>
  
  <!-- Filter chips -->
  <div class="flex gap-2 overflow-x-auto pb-2">
    <button class="chip active">All</button>
    <button class="chip">Low Stock</button>
    <button class="chip">At This Site</button>
    <button class="chip">Recently Used</button>
  </div>
  
  <!-- Item cards -->
  <div class="item-card" data-item-id="123">
    <div class="flex items-center gap-4">
      <!-- Item icon/photo -->
      <div class="w-16 h-16 bg-nfglight rounded-xl flex items-center justify-center flex-shrink-0">
        <i data-lucide="droplet" class="w-8 h-8 text-nfgblue"></i>
      </div>
      
      <!-- Item info -->
      <div class="flex-1 min-w-0">
        <h3 class="font-semibold text-lg">Bleach 5L</h3>
        <p class="text-sm text-gray-500">Cleaning Supplies</p>
        <div class="flex items-center gap-4 mt-1">
          <span class="text-sm">Qty: <strong>15</strong></span>
          <span class="chip-status low">Low Stock</span>
        </div>
      </div>
      
      <!-- Quick actions -->
      <div class="flex flex-col gap-2">
        <button class="btn-icon" onclick="quickUse(123)">
          <i data-lucide="minus-circle" class="w-6 h-6 text-red-500"></i>
        </button>
        <button class="btn-icon" onclick="viewItem(123)">
          <i data-lucide="eye" class="w-6 h-6 text-nfgblue"></i>
        </button>
      </div>
    </div>
    
    <!-- Swipe actions (revealed on swipe left) -->
    <div class="swipe-actions">
      <button class="swipe-action use">Use</button>
      <button class="swipe-action restock">Restock</button>
      <button class="swipe-action details">Details</button>
    </div>
  </div>
</div>
```

### **2.2.5: Touch Gestures**

```javascript
// Swipe detection for mobile list
class SwipeHandler {
  constructor(element) {
    this.element = element;
    this.startX = 0;
    this.startY = 0;
    this.threshold = 50; // Minimum swipe distance
    
    element.addEventListener('touchstart', this.handleTouchStart.bind(this));
    element.addEventListener('touchmove', this.handleTouchMove.bind(this));
    element.addEventListener('touchend', this.handleTouchEnd.bind(this));
  }
  
  handleTouchStart(e) {
    this.startX = e.touches[0].clientX;
    this.startY = e.touches[0].clientY;
  }
  
  handleTouchMove(e) {
    // Prevent scrolling if swiping horizontally
    const deltaX = Math.abs(e.touches[0].clientX - this.startX);
    const deltaY = Math.abs(e.touches[0].clientY - this.startY);
    
    if (deltaX > deltaY) {
      e.preventDefault(); // Prevent vertical scroll
    }
  }
  
  handleTouchEnd(e) {
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    
    const deltaX = endX - this.startX;
    const deltaY = endY - this.startY;
    
    // Horizontal swipe
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > this.threshold) {
      if (deltaX > 0) {
        this.onSwipeRight();
      } else {
        this.onSwipeLeft();
      }
    }
    
    // Vertical swipe (pull to refresh)
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > this.threshold && deltaY > 0) {
      this.onPullToRefresh();
    }
  }
  
  onSwipeLeft() {
    // Show action buttons
    this.element.classList.add('swiped-left');
  }
  
  onSwipeRight() {
    // Hide action buttons
    this.element.classList.remove('swiped-left');
  }
  
  onPullToRefresh() {
    // Refresh inventory list
    refreshInventoryList();
  }
}

// Apply to each item card
document.querySelectorAll('.item-card').forEach(card => {
  new SwipeHandler(card);
});
```

---

## 📸 **Phase 2.3: Photo Upload & Management (Detailed)**

### **2.3.1: Photo Capture Implementation**

```javascript
class PhotoCapture {
  constructor() {
    this.cameraStream = null;
    this.isCapturing = false;
    this.maxPhotos = 5; // Limit per usage
  }
  
  async initCamera(videoElement) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera
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
      
      // Convert to blob
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg', 0.85); // 85% quality
    });
  }
  
  compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large
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

### **2.3.2: Photo Upload to Supabase Storage**

```javascript
async function uploadUsagePhoto(blob, jobId, itemId, index) {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${jobId || 'no-job'}/${timestamp}_${itemId}_${index}.jpg`;
    const path = `inventory-usage-photos/${fileName}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('inventory-photos')
      .upload(path, blob, {
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
    console.error('Photo upload failed:', error);
    throw error;
  }
}

// Batch upload with progress
async function uploadPhotos(photos, jobId, itemId) {
  const uploadPromises = photos.map((photo, index) => {
    return uploadUsagePhoto(photo.blob, jobId, itemId, index);
  });
  
  // Show progress
  const progressBar = document.getElementById('upload-progress');
  let completed = 0;
  
  uploadPromises.forEach((promise, index) => {
    promise.then(() => {
      completed++;
      if (progressBar) {
        progressBar.style.width = `${(completed / photos.length) * 100}%`;
      }
    });
  });
  
  const urls = await Promise.all(uploadPromises);
  return urls;
}
```

### **2.3.3: Photo Display Component**

```html
<!-- Photo gallery component -->
<div id="photo-gallery" class="grid grid-cols-3 gap-2">
  <!-- Photo thumbnails -->
  <div class="photo-thumbnail relative">
    <img src="photo-url" alt="Usage photo" class="w-full h-24 object-cover rounded-lg">
    <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center" onclick="removePhoto(0)">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
    <button class="absolute bottom-1 left-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center" onclick="viewPhotoFullscreen(0)">
      <i data-lucide="expand" class="w-4 h-4"></i>
    </button>
  </div>
  
  <!-- Add photo button -->
  <div class="photo-thumbnail border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer" onclick="openCamera()">
    <i data-lucide="camera" class="w-8 h-8 text-gray-400"></i>
  </div>
</div>
```

---

## 📴 **Phase 2.4: Offline Capability (Detailed)**

### **2.4.1: Service Worker Setup**

```javascript
// sw.js - Service Worker
const CACHE_NAME = 'nfg-inventory-v1';
const OFFLINE_URLS = [
  '/mobile-inventory.html',
  '/js/mobile-inventory.js',
  '/css/mobile.css',
  '/manifest.json'
];

// Install - Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS);
    })
  );
  self.skipWaiting();
});

// Fetch - Serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response; // Serve from cache
      }
      
      // Try network
      return fetch(event.request).catch(() => {
        // If offline and HTML request, serve offline page
        if (event.request.destination === 'document') {
          return caches.match('/mobile-inventory.html');
        }
      });
    })
  );
});
```

### **2.4.2: IndexedDB Setup (Offline Storage)**

```javascript
// js/offline-db.js
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.mjs';

class OfflineInventoryDB {
  constructor() {
    this.db = new Dexie('NFGInventoryOffline');
    
    this.db.version(1).stores({
      // Pending usage records
      pendingUsage: '++id, item_id, job_id, quantity, photos, notes, created_at, synced',
      
      // Cached inventory items
      cachedItems: 'id, barcode, name, site_id, quantity, last_updated',
      
      // Cached jobs
      cachedJobs: 'id, title, site_id, status, last_updated',
      
      // Photo blobs (for offline storage)
      photoBlobs: '++id, usage_id, blob, url, uploaded',
      
      // Sync queue
      syncQueue: '++id, action, data, created_at, retries'
    });
  }
  
  // Save pending usage
  async savePendingUsage(usageData) {
    const id = await this.db.pendingUsage.add({
      ...usageData,
      synced: false,
      created_at: new Date().toISOString()
    });
    
    // Save photos to blob storage
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
  
  // Get all pending usage
  async getPendingUsage() {
    return await this.db.pendingUsage
      .where('synced').equals(false)
      .toArray();
  }
  
  // Cache inventory item
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
  
  // Get cached item by barcode
  async getCachedItemByBarcode(barcode) {
    return await this.db.cachedItems
      .where('barcode').equals(barcode)
      .first();
  }
  
  // Check if cache is still valid (e.g., 1 hour)
  isCacheValid(item, maxAgeMinutes = 60) {
    if (!item || !item.last_updated) return false;
    
    const age = (Date.now() - new Date(item.last_updated).getTime()) / 1000 / 60;
    return age < maxAgeMinutes;
  }
}

// Export singleton instance
export const offlineDB = new OfflineInventoryDB();
```

### **2.4.3: Sync Queue & Sync Logic**

```javascript
// js/offline-sync.js
class OfflineSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.syncInterval = null;
    
    // Listen for online/offline events
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
    
    // Start auto-sync if online
    if (this.isOnline) {
      this.startAutoSync();
    }
  }
  
  // Auto-sync every 30 seconds when online
  startAutoSync() {
    if (this.syncInterval) return;
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncPendingItems();
      }
    }, 30000); // 30 seconds
    
    // Also sync immediately
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
          
          // Mark as synced
          await offlineDB.db.pendingUsage.update(item.id, { synced: true });
          successCount++;
        } catch (error) {
          console.error('Sync failed for item:', item.id, error);
          failCount++;
          
          // Increment retry count
          const retries = (item.retries || 0) + 1;
          await offlineDB.db.pendingUsage.update(item.id, { retries });
          
          // Don't retry if failed too many times
          if (retries >= 3) {
            await offlineDB.db.pendingUsage.update(item.id, { 
              synced: false,
              sync_error: error.message,
              failed: true
            });
          }
        }
      }
      
      // Show sync summary
      this.showSyncSummary(successCount, failCount);
      
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
      this.showSyncIndicator(false);
    }
  }
  
  async syncUsageItem(item) {
    // 1. Upload photos first
    const photoUrls = [];
    if (item.photos && item.photos.length > 0) {
      const photoBlobs = await offlineDB.db.photoBlobs
        .where('usage_id').equals(item.id)
        .toArray();
      
      for (const photoBlob of photoBlobs) {
        const url = await uploadUsagePhoto(
          photoBlob.blob,
          item.job_id,
          item.item_id,
          photoBlobs.indexOf(photoBlob)
        );
        photoUrls.push(url);
        
        // Mark photo as uploaded
        await offlineDB.db.photoBlobs.update(photoBlob.id, { 
          uploaded: true,
          url
        });
      }
    }
    
    // 2. Create inventory transaction
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
    
    // 3. Create job inventory usage record
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
      if (show) {
        indicator.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Syncing...';
      }
    }
  }
  
  showOfflineBanner() {
    const banner = document.getElementById('offline-banner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.textContent = '📴 Offline Mode - Changes will sync when online';
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
      toast.success(`${success} item(s) synced successfully`, 'Synced');
    }
    if (failed > 0) {
      toast.error(`${failed} item(s) failed to sync. Will retry.`, 'Sync Error');
    }
  }
}

// Initialize sync manager
export const syncManager = new OfflineSyncManager();
```

### **2.4.4: Usage Submission (Online vs Offline)**

```javascript
async function submitInventoryUsage(usageData) {
  // Check online status
  if (!navigator.onLine) {
    // Save to offline queue
    const id = await offlineDB.savePendingUsage(usageData);
    
    toast.info('Saved offline - will sync when online', 'Offline Mode');
    
    // Show queue count
    updateQueueBadge();
    
    return { success: true, offline: true, id };
  }
  
  // Online - submit immediately
  try {
    await syncManager.syncUsageItem(usageData);
    toast.success('Usage recorded successfully', 'Success');
    return { success: true, offline: false };
  } catch (error) {
    console.error('Submission failed:', error);
    
    // If submission fails, save to queue
    await offlineDB.savePendingUsage(usageData);
    toast.warning('Saved to queue - will retry', 'Saved');
    
    return { success: false, queued: true };
  }
}
```

---

## 🔄 **Phase 2.5: Real-Time Updates (Detailed)**

### **2.5.1: Supabase Realtime Subscriptions**

```javascript
// Subscribe to inventory changes
function setupRealtimeInventory() {
  const channel = supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'site_inventory',
        filter: `site_id=eq.${currentSiteId}`
      },
      (payload) => {
        console.log('Inventory changed:', payload);
        
        // Update local cache
        if (payload.eventType === 'UPDATE') {
          updateCachedItem(payload.new);
        } else if (payload.eventType === 'INSERT') {
          addCachedItem(payload.new);
        } else if (payload.eventType === 'DELETE') {
          removeCachedItem(payload.old.id);
        }
        
        // Refresh UI if on inventory list
        if (currentView === 'inventory-list') {
          refreshInventoryList();
        }
      }
    )
    .subscribe();
  
  return channel;
}

// Subscribe to low stock alerts
function setupLowStockAlerts() {
  const channel = supabase
    .channel('low-stock-alerts')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'site_inventory',
        filter: `site_id=eq.${currentSiteId}`
      },
      (payload) => {
        const newQuantity = payload.new.quantity;
        const item = payload.new;
        
        // Check if it's now low stock
        if (newQuantity > 0 && newQuantity < item.low_stock_threshold) {
          showLowStockNotification(item);
        }
      }
    )
    .subscribe();
  
  return channel;
}
```

---

## 🎨 **Phase 2.6: Mobile-Specific Features (Detailed)**

### **2.6.1: Location Services**

```javascript
class LocationService {
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
        (error) => {
          reject(error);
        },
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
    
    // Get all sites with coordinates
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name, latitude, longitude')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
    
    if (!sites || sites.length === 0) return null;
    
    // Calculate distances
    const sitesWithDistance = sites.map(site => {
      const distance = this.calculateDistance(
        this.currentLocation.lat,
        this.currentLocation.lng,
        site.latitude,
        site.longitude
      );
      return { ...site, distance };
    });
    
    // Sort by distance
    sitesWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Return nearest site if within 100 meters
    const nearest = sitesWithDistance[0];
    if (nearest.distance <= 100) {
      return nearest;
    }
    
    return null;
  }
  
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }
}
```

### **2.6.2: Voice Notes**

```javascript
class VoiceNoteRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.isRecording = false;
  }
  
  async startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      return true;
    } catch (error) {
      console.error('Recording failed:', error);
      return false;
    }
  }
  
  async stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || !this.isRecording) {
        resolve(null);
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
      this.isRecording = false;
      
      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }
  
  async transcribeAudio(audioBlob) {
    // Option 1: Use Web Speech API (browser-based)
    // Option 2: Upload to Edge Function for transcription
    // Option 3: Store as audio file only
    
    // For now, just store the audio
    return audioBlob;
  }
}
```

---

## 🔒 **Phase 2.7: Security & Permissions (Detailed)**

### **2.7.1: Row Level Security Policies**

```sql
-- RLS for job_inventory_usage
ALTER TABLE job_inventory_usage ENABLE ROW LEVEL SECURITY;

-- Staff can view usage for their jobs
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

-- Staff can create usage records
CREATE POLICY "Staff can create usage"
ON job_inventory_usage FOR INSERT
WITH CHECK (
  used_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM jobs
    WHERE jobs.id = job_inventory_usage.job_id
    AND jobs.assigned_worker_id = auth.uid()
  )
);

-- Photo storage RLS
CREATE POLICY "Users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inventory-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inventory-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
);
```

### **2.7.2: Site Access Verification**

```javascript
async function verifySiteAccess(siteId) {
  // Check if user is assigned to this site
  const { data: assignments } = await supabase
    .from('worker_site_assignments')
    .select('*')
    .eq('worker_id', currentUser.id)
    .eq('site_id', siteId)
    .single();
  
  // Check if user is admin/manager
  const isAdmin = currentUserProfile && 
    ['admin', 'manager'].includes(currentUserProfile.role);
  
  if (!assignments && !isAdmin) {
    throw new Error('You do not have access to this site');
  }
  
  // Optional: Verify location
  if (locationService && locationService.currentLocation) {
    const nearestSite = await locationService.findNearestSite();
    if (nearestSite && nearestSite.id !== siteId) {
      const confirmed = await showConfirm(
        `You appear to be at ${nearestSite.name}. Continue with ${currentSite.name}?`,
        'Location Mismatch'
      );
      if (!confirmed) {
        throw new Error('Site access denied');
      }
    }
  }
  
  return true;
}
```

---

## 📊 **Complete User Flow**

### **Flow 1: Scan & Use Item (Online)**

```
1. Worker opens mobile app
2. Worker selects site (or auto-detected)
3. Worker taps "Scan" button
4. Camera opens, worker scans barcode
5. System looks up item:
   - If found: Show item details
   - If not found: Show manual entry
6. Worker enters:
   - Quantity
   - Selects job (optional)
   - Adds photos (optional)
   - Adds notes (optional)
7. Worker taps "Mark as Used"
8. System:
   - Creates transaction
   - Updates inventory
   - Links to job (if selected)
   - Uploads photos
9. Success confirmation
10. Return to scanner
```

### **Flow 2: Scan & Use Item (Offline)**

```
1. Worker opens mobile app
2. System detects offline
3. Shows "Offline Mode" banner
4. Worker scans barcode
5. System checks cache:
   - If cached: Show item (may be outdated)
   - If not cached: Show error, suggest manual entry
6. Worker enters usage details
7. Worker taps "Mark as Used"
8. System saves to IndexedDB queue
9. Shows "Saved offline" message
10. When online:
    - Auto-syncs queue
    - Uploads photos
    - Creates transactions
11. Shows sync success notification
```

---

## 📦 **File Structure**

```
mobile-inventory/
├── mobile-inventory.html          # Main mobile page
├── js/
│   ├── mobile-inventory.js        # Main mobile logic
│   ├── barcode-scanner.js         # Scanner component
│   ├── photo-capture.js           # Photo handling
│   ├── offline-db.js              # IndexedDB wrapper
│   ├── offline-sync.js            # Sync manager
│   └── location-service.js        # GPS services
├── css/
│   └── mobile.css                 # Mobile-specific styles
├── sw.js                          # Service worker
└── manifest.json                  # PWA manifest
```

---

## 🎯 **MVP vs Full Implementation**

### **MVP (Minimum Viable Product):**
- ✅ Basic barcode scanner
- ✅ Simple usage form
- ✅ Photo upload (1-2 photos)
- ✅ Online submission only
- ✅ Basic mobile UI

**Time Estimate:** 15-20 hours

### **Full Implementation:**
- ✅ All MVP features
- ✅ Offline support
- ✅ Real-time updates
- ✅ Location services
- ✅ Voice notes
- ✅ Advanced UI features
- ✅ Audit logging

**Time Estimate:** 40-50 hours

---

## 🚀 **Recommended Implementation Order**

1. **Week 1:** MVP Scanner & Basic UI (Phases 2.1-2.2)
2. **Week 2:** Photo Upload (Phase 2.3)
3. **Week 3:** Offline Support (Phase 2.4)
4. **Week 4:** Polish & Advanced Features (Phases 2.5-2.7)

---

This detailed gameplan should give you everything you need to implement Feature 2! 🚀

