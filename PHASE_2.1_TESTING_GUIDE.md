# Phase 2.1 Testing Guide: Barcode/QR Code System
## Complete Testing Instructions

---

## 📋 **Pre-Testing Checklist**

### **1. Database Setup** ✅
- [ ] Run `ADD_BARCODE_SUPPORT.sql` in Supabase SQL Editor
- [ ] Verify all tables/views were created successfully
- [ ] Check that columns were added to `inventory_items` table
- [ ] Create storage bucket `inventory-assets` in Supabase Dashboard (if not exists)

### **2. Storage Bucket Setup**
- [ ] Go to Supabase Dashboard > Storage
- [ ] Create new bucket named: `inventory-assets`
- [ ] Set bucket to **Public**: Yes
- [ ] Set file size limit: **5 MB**
- [ ] Allowed MIME types: `image/png`, `image/jpeg`, `image/svg+xml`

### **3. Files Created**
- [ ] `ADD_BARCODE_SUPPORT.sql` exists
- [ ] `js/barcode-generator.js` exists
- [ ] `js/barcode-scanner.js` exists
- [ ] `js/inventory.js` updated with import

---

## 🧪 **Testing Procedure**

### **TEST 1: Database Schema** ✅

**Steps:**
1. Open Supabase Dashboard > SQL Editor
2. Run `ADD_BARCODE_SUPPORT.sql`
3. Check for any errors in the output

**Expected Results:**
- ✅ Success message appears: "✅ Barcode Support Added"
- ✅ No SQL errors
- ✅ Tables created: `barcode_scan_logs`
- ✅ Columns added to `inventory_items`: `barcode`, `barcode_type`, `qr_code_url`, `last_scanned_at`

**Verification Queries:**
```sql
-- Check columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory_items' 
AND column_name IN ('barcode', 'barcode_type', 'qr_code_url', 'last_scanned_at');

-- Check table exists
SELECT * FROM barcode_scan_logs LIMIT 1;

-- Check view exists
SELECT * FROM recent_barcode_scans LIMIT 1;

-- Check function exists
SELECT generate_item_barcode(1);
```

**✅ PASS:** All queries return data without errors

---

### **TEST 2: Barcode Generation on New Items** ✅

**Steps:**
1. Open the app in browser
2. Navigate to **Inventory** page
3. Click **"Add Item"** button
4. Fill in the form:
   - Name: `Test Barcode Item`
   - Category: Any category
   - Unit: `pieces`
   - Low Stock Threshold: `5`
5. Click **"Add Item"**

**Expected Results:**
- ✅ Item is created successfully
- ✅ Success toast message appears
- ✅ Item appears in inventory list

**Browser Console Check:**
```javascript
// Open browser DevTools (F12) > Console
// Look for:
✅ Barcode generated: INV-1234567890-123
```

**Database Verification:**
```sql
-- Check the newly created item
SELECT id, name, barcode, barcode_type, qr_code_url 
FROM inventory_items 
WHERE name = 'Test Barcode Item';

-- Expected:
-- barcode: "INV-{timestamp}-{item_id}" (e.g., "INV-1734567890123-45")
-- barcode_type: "CODE128"
-- qr_code_url: "https://..." (URL to QR code image)
```

**✅ PASS:** Barcode and QR code URL are generated and saved

---

### **TEST 3: QR Code Image Generation** ✅

**Steps:**
1. After creating an item (from TEST 2)
2. Check the database for `qr_code_url`
3. Open the URL in a new browser tab

**Expected Results:**
- ✅ QR code image loads successfully
- ✅ QR code is a square PNG image
- ✅ QR code is scannable with any QR reader app

**Manual QR Code Scan Test:**
1. Use a phone with a QR scanner app
2. Scan the QR code from the browser
3. QR code should decode to JSON like:
```json
{
  "type": "inventory_item",
  "item_id": 123,
  "name": "Test Barcode Item",
  "site_id": null,
  "code": "INV-1234567890-123",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0"
}
```

**✅ PASS:** QR code image is generated, accessible, and scannable

---

### **TEST 4: Barcode Generator JavaScript Functions** ✅

**Steps:**
1. Open browser DevTools (F12) > Console
2. Test the BarcodeGenerator class:

```javascript
// Import (should already be loaded)
import { BarcodeGenerator } from './js/barcode-generator.js';

// Test barcode generation
const barcode = await BarcodeGenerator.generateBarcode(999, 'Test Item');
console.log('Generated barcode:', barcode);
// Expected: "INV-{timestamp}-999"

// Test QR code generation
const qrCode = await BarcodeGenerator.generateQRCode(999, 'Test Item');
console.log('QR Code data:', qrCode.data);
console.log('QR Code image (data URL):', qrCode.image.substring(0, 50) + '...');
// Expected: Object with 'data' and 'image' properties

// Test QR code parsing
const testQRData = JSON.stringify({
  type: 'inventory_item',
  item_id: 123,
  name: 'Test',
  code: 'INV-123'
});
const parsed = BarcodeGenerator.parseQRCodeData(testQRData);
console.log('Parsed QR data:', parsed);
// Expected: Object with item_id, name, etc.
```

**Expected Results:**
- ✅ All functions execute without errors
- ✅ Barcode format is correct: `INV-{timestamp}-{itemId}`
- ✅ QR code data URL is generated (starts with `data:image/png`)
- ✅ QR code parsing works correctly

**✅ PASS:** All generator functions work as expected

---

### **TEST 5: Barcode Scanner Component** ✅

**Steps:**
1. Create a test HTML page or use the mobile-inventory page (if created)
2. Add scanner container to HTML:
```html
<div id="scanner-container" style="width: 100%; height: 400px; border: 2px solid red;"></div>
<button onclick="startTestScan()">Start Scanner</button>
<button onclick="stopTestScan()">Stop Scanner</button>
```

3. Add test JavaScript:
```javascript
import { MobileBarcodeScanner } from './js/barcode-scanner.js';

let testScanner = null;

async function startTestScan() {
  testScanner = new MobileBarcodeScanner('scanner-container');
  
  const hasPermission = await testScanner.init();
  if (!hasPermission) {
    alert('Camera permission denied!');
    return;
  }
  
  await testScanner.startScanning(
    (decodedText, decodedResult) => {
      console.log('✅ Scanned:', decodedText);
      alert('Scanned: ' + decodedText);
    },
    (error) => {
      console.error('Scanner error:', error);
    }
  );
}

async function stopTestScan() {
  if (testScanner) {
    await testScanner.stopScanning();
    console.log('Scanner stopped');
  }
}

window.startTestScan = startTestScan;
window.stopTestScan = stopTestScan;
```

4. Test on mobile device (or desktop with camera):
   - Click "Start Scanner"
   - Grant camera permission when prompted
   - Point camera at a QR code or barcode
   - Scanner should detect and alert with the scanned text

**Expected Results:**
- ✅ Camera permission prompt appears
- ✅ Camera view appears in container
- ✅ Scanner detects QR codes/barcodes
- ✅ Success callback fires with scanned text
- ✅ Beep sound plays (if audio enabled)
- ✅ Scanner stops automatically after successful scan

**✅ PASS:** Scanner component works correctly

---

### **TEST 6: Scan Logging** ✅

**Steps:**
1. After scanning a barcode (from TEST 5)
2. Check the `barcode_scan_logs` table:

```sql
SELECT * FROM barcode_scan_logs 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected Results:**
- ✅ New row created in `barcode_scan_logs`
- ✅ Fields populated:
  - `barcode`: The scanned barcode/QR code text
  - `item_id`: Item ID if barcode matched an item
  - `scanned_by`: Current user's ID
  - `site_id`: Current site ID (if set)
  - `scan_result`: 'found' or 'not_found'
  - `scan_source`: 'database', 'cache', or 'qr_code'
  - `device_info`: JSON with browser/OS info
  - `created_at`: Timestamp

**✅ PASS:** Scan logs are created correctly

---

### **TEST 7: Barcode Lookup** ✅

**Steps:**
1. Create a test item with a known barcode
2. Test lookup function (to be implemented in mobile-inventory.js):

```javascript
// This will be in mobile-inventory.js
async function testLookup(barcode) {
  // Lookup item by barcode
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('barcode', barcode)
    .single();
  
  if (error) {
    console.error('Not found:', error);
    return null;
  }
  
  console.log('Found item:', data);
  return data;
}

// Test with known barcode
const item = await testLookup('INV-1234567890-999');
```

**Expected Results:**
- ✅ Item is found when barcode exists
- ✅ Returns null when barcode doesn't exist
- ✅ Returns correct item data

**✅ PASS:** Barcode lookup works correctly

---

### **TEST 8: Bulk Barcode Generation** ✅

**Steps:**
1. Create a few items WITHOUT barcodes (manually in DB or before barcode feature)
2. Test bulk generation:

```javascript
// In browser console
import { BarcodeGenerator } from './js/barcode-generator.js';

const results = await BarcodeGenerator.generateBarcodesForExistingItems();
console.log('Bulk generation results:', results);
```

**Expected Results:**
- ✅ All items without barcodes get barcodes generated
- ✅ Results array shows success/failure for each item
- ✅ Barcodes are saved to database
- ✅ QR codes are generated and uploaded

**Database Check:**
```sql
-- Check items now have barcodes
SELECT COUNT(*) FROM inventory_items WHERE barcode IS NULL;
-- Should be 0 (or only items created in the last few seconds)

SELECT COUNT(*) FROM inventory_items WHERE barcode IS NOT NULL;
-- Should be > 0
```

**✅ PASS:** Bulk generation works for existing items

---

### **TEST 9: RLS Policies** ✅

**Steps:**
1. Test as regular user (staff):
   - Try to INSERT into `barcode_scan_logs` (should work for own records)
   - Try to SELECT from `barcode_scan_logs` (should see own scans)
   - Try to SELECT from other users' scans (should NOT see them)

2. Test as admin/manager:
   - Try to SELECT from `barcode_scan_logs` (should see ALL scans)

**SQL Tests:**
```sql
-- As regular user (replace with actual user ID)
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid-here';

-- Should be able to insert own scan
INSERT INTO barcode_scan_logs (barcode, scanned_by, scan_result)
VALUES ('TEST123', 'user-uuid-here', 'test');

-- Should be able to see own scans
SELECT * FROM barcode_scan_logs WHERE scanned_by = 'user-uuid-here';

-- Should NOT see other users' scans (unless admin)
SELECT * FROM barcode_scan_logs WHERE scanned_by != 'user-uuid-here';
```

**Expected Results:**
- ✅ Users can only see their own scans (unless admin/manager)
- ✅ Admins/managers can see all scans
- ✅ Users can only insert scans with their own user ID

**✅ PASS:** RLS policies work correctly

---

### **TEST 10: Recent Scans View** ✅

**Steps:**
1. Perform several barcode scans (or insert test data)
2. Query the view:

```sql
SELECT * FROM recent_barcode_scans 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected Results:**
- ✅ View returns data
- ✅ Includes item name, site name, user name
- ✅ Ordered by most recent first
- ✅ Limited to 100 rows (as per view definition)

**✅ PASS:** Recent scans view works correctly

---

## 🐛 **Common Issues & Solutions**

### **Issue 1: "QRCode is not defined"**
**Solution:** 
- The QRCode library loads asynchronously
- Make sure to `await BarcodeGenerator.loadQRCodeLibrary()` before using it
- Or use `generateAndUploadQRCode()` which handles this internally

### **Issue 2: "Storage bucket not found"**
**Solution:**
- Create the `inventory-assets` bucket in Supabase Dashboard
- Make sure it's set to Public
- Check bucket name spelling (exactly: `inventory-assets`)

### **Issue 3: "Camera permission denied"**
**Solution:**
- Grant camera permissions in browser settings
- Use HTTPS (camera requires secure context)
- Check browser compatibility (Chrome, Firefox, Safari mobile)

### **Issue 4: "Barcode not generated for new items"**
**Solution:**
- Check browser console for errors
- Verify `barcode-generator.js` is imported correctly
- Check that `.select().single()` is used in item insert to get the new item ID

### **Issue 5: "Html5Qrcode is not defined"**
**Solution:**
- The library loads from CDN asynchronously
- Use `await scanner.loadScannerLibrary()` before starting scan
- Or use `startScanning()` which handles this internally

---

## ✅ **Testing Checklist Summary**

- [ ] **TEST 1:** Database schema created successfully
- [ ] **TEST 2:** Barcode generated on new item creation
- [ ] **TEST 3:** QR code image generated and accessible
- [ ] **TEST 4:** BarcodeGenerator functions work
- [ ] **TEST 5:** Scanner component works (mobile test)
- [ ] **TEST 6:** Scan logs are created
- [ ] **TEST 7:** Barcode lookup works
- [ ] **TEST 8:** Bulk generation works
- [ ] **TEST 9:** RLS policies enforced
- [ ] **TEST 10:** Recent scans view works

---

## 📝 **Test Results Template**

```
Phase 2.1 Testing Results
Date: __________
Tester: __________

TEST 1: Database Schema
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 2: Barcode Generation
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 3: QR Code Image
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 4: Generator Functions
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 5: Scanner Component
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 6: Scan Logging
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 7: Barcode Lookup
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 8: Bulk Generation
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 9: RLS Policies
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

TEST 10: Recent Scans View
  ✅ PASS / ❌ FAIL
  Notes: _________________________________

Overall Status: ✅ PASS / ❌ FAIL
Blocking Issues: _________________________________
```

---

## 🎯 **Next Steps After Testing**

Once all tests pass:
1. ✅ Phase 2.1 is complete
2. Proceed to **Phase 2.2: Mobile-Optimized UI**
3. Or continue with barcode lookup implementation in `mobile-inventory.js` (Step 1.4)

---

**Good luck testing! 🚀**

