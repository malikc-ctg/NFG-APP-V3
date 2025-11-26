# 🧪 Testing the Scanner with a Household Item

## 🎯 **Quick Test (5 Minutes)**

### **Step 1: Find a Product with a Barcode**
Grab any product from your house that has a barcode:
- ✅ Soda can/bottle
- ✅ Cereal box
- ✅ Shampoo bottle
- ✅ Any food product
- ✅ Cleaning supplies
- ✅ Literally anything with a barcode

**Example:** A can of Coke, bottle of water, box of crackers, etc.

---

## 📋 **Step-by-Step Test**

### **Step 1: Add the Item to Your Inventory**

1. Go to your app: `inventory.html`
2. Click **"+ Add Item"**
3. Fill in:
   - **Name:** "Coca-Cola" (or whatever product you're using)
   - **Category:** Pick any category
   - **Unit:** "cans" or "bottles"
   - **Low Stock Threshold:** 5
4. Click **"Add Item"**

**Important:** The system automatically generates a barcode, but we're going to use the **actual barcode on the product** instead!

---

### **Step 2: Update the Item with the Real Barcode**

**Option A: Via Database (Easiest)**
1. Go to Supabase Dashboard
2. Open SQL Editor
3. Run this (replace with your item name and barcode):

```sql
-- Find your item
SELECT id, name, barcode FROM inventory_items 
WHERE name LIKE '%Coca-Cola%' 
ORDER BY id DESC LIMIT 1;

-- Update it with the real barcode from your product
-- Replace 'ITEM_ID' with the id from above, and 'BARCODE' with the actual barcode number
UPDATE inventory_items 
SET barcode = 'BARCODE_HERE'
WHERE id = ITEM_ID;
```

**Option B: Via the App (If we add that feature)**
- We can add a "Set Barcode" button later, but for now use SQL

**How to get the barcode number:**
1. Look at the product
2. There's a number under the barcode (usually 12-13 digits)
3. That's the barcode number
4. Use that in the SQL update

**Example:**
- Coca-Cola can barcode: `049000028911`
- Update: `UPDATE inventory_items SET barcode = '049000028911' WHERE id = 123;`

---

### **Step 3: Test the Scanner**

1. Go to Inventory page
2. Click **"Scanner"** tab
3. **Select a site** from the dropdown (you need one selected)
4. Camera should turn on
5. **Point your phone camera at the barcode** on your product
6. **It should detect it!**

---

## 🎥 **What Should Happen**

### **If It Works:**
1. Camera scans the barcode
2. **BEEP** sound
3. Screen shows: "Found: Coca-Cola" (or whatever item)
4. Shows quantity available
5. You can enter usage quantity
6. Submit and it's recorded!

### **If It Doesn't Work:**
1. **Check:** Is the barcode number in the database?
   - Run: `SELECT * FROM inventory_items WHERE barcode = 'YOUR_BARCODE';`
2. **Check:** Is camera permission granted?
3. **Check:** Are you on HTTPS? (required for camera)
4. **Try:** Use manual entry instead

---

## 🔧 **Quick Test Without Real Barcode**

### **Method 1: Use QR Code Instead**

1. Add an item to inventory
2. Check the database for `qr_code_url`
3. Open that URL in another tab
4. You'll see a QR code image
5. **Print it or show it on another screen**
6. Scan that QR code with the scanner
7. It should work!

### **Method 2: Generate Test QR Code**

1. Go to: https://www.qr-code-generator.com/
2. Enter this JSON (replace item_id with your actual item ID):
```json
{
  "type": "inventory_item",
  "item_id": 123,
  "name": "Test Item",
  "code": "TEST-123"
}
```
3. Generate QR code
4. Print or show on screen
5. Scan it!

---

## 📱 **Testing on Different Devices**

### **Desktop/Laptop:**
- Uses webcam
- Might need to allow camera permission
- Works same way

### **Phone (Easiest):**
- Open app in mobile browser
- Goes to Inventory → Scanner
- Point at barcode
- Works perfectly!

### **Tablet:**
- Same as phone
- Bigger screen = easier to see

---

## 🎯 **Quick Test Checklist**

- [ ] Have a product with barcode (Coke, cereal, whatever)
- [ ] Added item to inventory in the app
- [ ] Updated item with real barcode number (via SQL)
- [ ] Went to Inventory → Scanner tab
- [ ] Selected a site
- [ ] Pointed camera at barcode
- [ ] It detected! ✅
- [ ] Entered quantity
- [ ] Submitted usage
- [ ] Checked inventory - it updated! ✅

---

## 🚨 **Common Issues**

### **"Camera won't turn on"**
- **Fix:** Check browser permissions (allow camera access)
- **Fix:** Make sure you're on HTTPS
- **Fix:** Try different browser (Chrome works best)

### **"Barcode not found"**
- **Check:** Did you update the barcode in database?
- **Check:** Is the barcode clear and well-lit?
- **Try:** Hold phone steady, 6-12 inches away

### **"Wrong item detected"**
- This means barcode exists in database but for different item
- Check: `SELECT * FROM inventory_items WHERE barcode = 'SCANNED_CODE';`

### **"No sites available"**
- You need at least one site in the system
- Go to Sites page, add a test site
- Then scanner will work

---

## 💡 **Pro Tips for Testing**

1. **Use a well-lit area** - Barcode scanners need good lighting
2. **Hold steady** - Don't shake the phone
3. **Try different angles** - Sometimes tilting helps
4. **Use a large barcode** - Easier to scan than tiny ones
5. **Test with multiple items** - Try different products

---

## 🎬 **Super Quick Test (2 Minutes)**

**Fastest way to see it work:**

1. Grab a product (Coke can, water bottle, etc.)
2. Note the barcode number (the digits under the barcode)
3. Add item to inventory via app
4. Update barcode via SQL: `UPDATE inventory_items SET barcode = 'YOUR_BARCODE' WHERE name = 'Item Name';`
5. Go to Scanner tab
6. Select a site
7. Point camera at barcode
8. **BOOM - It works!**

---

## 📞 **Still Having Issues?**

**Check these:**
1. ✅ Item exists in `inventory_items` table
2. ✅ Item has a `barcode` value (not NULL)
3. ✅ Barcode matches what you're scanning
4. ✅ Site is selected in dropdown
5. ✅ Camera permission granted
6. ✅ Using HTTPS (not HTTP)

**Debug SQL:**
```sql
-- Check if item has barcode
SELECT id, name, barcode FROM inventory_items WHERE barcode IS NOT NULL;

-- Check specific barcode
SELECT * FROM inventory_items WHERE barcode = 'YOUR_BARCODE_NUMBER';
```

---

**TL;DR:**
1. Get product with barcode (Coke, cereal, etc.)
2. Add to inventory
3. Update barcode in database to match product
4. Go to Scanner tab
5. Point camera at barcode
6. It works! 🎉

