# 📱 How to Actually Use the Barcode Scanner (Step-by-Step Guide)

## 🎯 **The Simple Version**

Your worker has a phone. There's a barcode on an item. They scan it. Done. That's it.

But let me break it down step-by-step so you understand the full flow...

---

## 📋 **Setup (One-Time, 5 Minutes)**

### **Step 1: Add Items to Inventory**
1. Go to Inventory page
2. Click "Add Item"
3. Fill in name, category, etc.
4. **When you save, the system automatically generates a barcode/QR code**

### **Step 2: Print QR Codes** (Optional - if you want physical labels)
1. Each item has a QR code URL in the database
2. Print the QR code
3. Stick it on the item
4. Done

**OR** - If items already have barcodes (like store-bought items), you can use those existing barcodes!

---

## 🔄 **Daily Usage (The Actual Workflow)**

### **Scenario: Janitor uses cleaning supplies**

#### **Step 1: Worker opens app on phone**
- Opens NFG app
- Goes to Inventory page
- Clicks "Scanner" tab

#### **Step 2: Selects their site**
- Dropdown shows: "Site A", "Site B", "Site C"
- Clicks the site they're currently at
- Camera turns on automatically

#### **Step 3: Scans an item**
- Worker grabs a bottle of cleaning solution
- Points phone camera at the barcode/QR code on the bottle
- **BEEP** (scanner detects it)
- Item appears on screen: "Cleaning Solution - Available: 15 units"

#### **Step 4: Records usage**
- Screen shows: "How much did you use?"
- Worker taps "+" button to increase quantity (or "-" to decrease)
- Types "2" (they used 2 bottles)
- Optionally links to a job: "Maintenance Job #123"
- Optionally adds a photo or notes
- Clicks "Mark as Used"

#### **Step 5: Done**
- Inventory automatically updates: 15 → 13 bottles remaining
- Usage is recorded: "Used 2 bottles at Site A, linked to Job #123"
- Worker keeps working
- **Total time: 10 seconds**

---

## 🎬 **Visual Walkthrough**

### **On Desktop/Tablet (Manager View):**
```
1. Inventory Page
   └─> Click "Scanner" tab
       └─> See camera view
           └─> Select site from dropdown
               └─> Point camera at barcode
                   └─> Item found!
                       └─> Enter quantity
                           └─> Submit
```

### **On Mobile Phone (Worker View):**
```
1. Open NFG App
   └─> Inventory → Scanner Tab
       └─> Camera opens automatically
           └─> *Points at barcode*
               └─> Item pops up
                   └─> "Used 2 units?"
                       └─> Taps "Yes"
                           └─> Done!
```

---

## 📱 **Real-World Example**

### **Example: Maintenance Tech Fixing HVAC**

**Morning:**
1. Tech gets job ticket: "Fix AC unit at Site B"
2. Opens app, goes to Scanner tab
3. Selects "Site B" from dropdown
4. Camera turns on

**At the site:**
1. Tech opens HVAC unit, needs a new capacitor
2. Goes to inventory room
3. Grabs capacitor from shelf
4. **Scans the barcode on the capacitor box**
   - App shows: "HVAC Capacitor - Available: 5"
5. Tech enters: "Used: 1"
6. Links to job: "AC Repair - Site B"
7. Takes photo of old capacitor (for documentation)
8. Clicks "Mark as Used"
9. **Done in 15 seconds**

**Back at the office:**
- Manager opens Inventory page
- Sees: "HVAC Capacitor: 4 remaining (was 5)"
- Sees usage record: "Used 1 at Site B, linked to AC Repair job"
- Sees photo of old capacitor
- Sees job cost automatically calculated: "$45 material cost added to job"

---

## 🖥️ **How It Looks in the App**

### **Step 1: Inventory Page → Scanner Tab**
```
┌─────────────────────────────────┐
│  Inventory  History  Scanner ←  │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    [Camera View]        │   │
│  │                         │   │
│  │    ┌─────────┐          │   │
│  │    │  SCAN   │          │   │
│  │    │   HERE  │          │   │
│  │    └─────────┘          │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  Site: [Site A ▼]              │
│                                 │
│  [Upload] [Flash] [Enter Code] │
└─────────────────────────────────┘
```

### **Step 2: After Scanning**
```
┌─────────────────────────────────┐
│  Cleaning Solution              │
│  Category: Chemicals            │
│  ─────────────────────────────  │
│                                 │
│  Available: 15 units            │
│  Site: Site A                   │
│  ─────────────────────────────  │
│                                 │
│  Quantity Used:                 │
│  [−]  2  [+]                    │
│                                 │
│  Job: [Select Job... ▼]        │
│                                 │
│  Photos: [📷 Add Photo]         │
│                                 │
│  Notes: [Optional...]           │
│                                 │
│  [Cancel]  [Mark as Used]       │
└─────────────────────────────────┘
```

### **Step 3: Confirmation**
```
✅ Usage recorded!
   • 2 units of Cleaning Solution
   • Site A
   • Linked to: Maintenance Job #123
   
Inventory updated: 13 units remaining
```

---

## 🎯 **Different Use Cases**

### **Use Case 1: Quick Scan (No Job Link)**
1. Scan barcode
2. Enter quantity
3. Submit
4. Done (5 seconds)

### **Use Case 2: With Job Link**
1. Scan barcode
2. Enter quantity
3. Select job from dropdown
4. Submit
5. Done (10 seconds) - Now it tracks material cost for that job

### **Use Case 3: With Photo**
1. Scan barcode
2. Enter quantity
3. Take photo (shows old/broken item)
4. Submit
5. Done (15 seconds) - Photo attached for records

### **Use Case 4: Manual Entry (No Barcode)**
1. Click "Enter Code" button
2. Type barcode manually (or item name)
3. Item found
4. Continue as normal

---

## ❓ **Common Questions**

### **Q: What if the item doesn't have a barcode?**
**A:** Two options:
1. **Print a QR code** - System generates one when you add the item
2. **Manual entry** - Click "Enter Code" and type the item name/barcode

### **Q: What if they're offline?**
**A:** Scanner works offline! Scans are saved locally and sync when back online.

### **Q: What if they scan the wrong item?**
**A:** They can cancel before submitting, or the manager can adjust it later.

### **Q: What if they use 5 items at once?**
**A:** Two options:
1. Scan each one individually (fast with scanner)
2. Use the "List View" to select multiple items and adjust quantities

### **Q: Can they scan from a photo?**
**A:** Yes! Click "Upload" button and select a photo of the barcode.

---

## 🎓 **Training Your Team**

### **5-Minute Training Script:**

1. **Show them the Scanner tab** - "This is where you scan items"
2. **Pick a site** - "Select the site you're at"
3. **Point and scan** - "Just point at the barcode, like taking a photo"
4. **Enter quantity** - "How many did you use? Tap + or -"
5. **Submit** - "Click 'Mark as Used', done!"

**That's it. If they can use a phone camera, they can use this.**

---

## 🚨 **Troubleshooting**

### **"Camera won't turn on"**
- Check browser permissions (allow camera access)
- Make sure they're using HTTPS (required for camera)
- Try refreshing the page

### **"Barcode not found"**
- Make sure barcode is clear and well-lit
- Hold phone steady
- Try manual entry as backup

### **"Wrong item scanned"**
- Cancel before submitting
- Or submit and manager can adjust later

### **"Can't select site"**
- Make sure they have access to that site
- Contact admin if site doesn't appear

---

## 💡 **Pro Tips**

1. **Print QR codes** on labels and stick them on frequently-used items
2. **Keep phone charged** - Scanner uses camera (battery drain)
3. **Use job linking** - Makes job costing automatic
4. **Take photos** - Great for warranty claims or client documentation
5. **Scan as you go** - Don't wait until end of day (you'll forget)

---

## 🎯 **The Bottom Line**

**It's literally:**
1. Open app
2. Point camera
3. Enter how much you used
4. Submit

**That's it. 10 seconds. Done.**

The system handles all the complicated stuff (updating inventory, linking to jobs, calculating costs, etc.) automatically.

---

## 📞 **Still Confused?**

Think of it like this:
- **Old way:** Write it on paper → Type it in computer later → Hope you remember everything
- **New way:** Point phone → Scan → Done

It's like using Apple Pay instead of counting cash. Same end result, but 10x faster.

---

**TL;DR: Point phone at barcode. Type quantity. Click submit. Done. That's the whole feature.**

