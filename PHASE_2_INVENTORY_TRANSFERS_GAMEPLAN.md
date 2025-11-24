# 📦 Phase 2: Inventory Transfers - Implementation Plan

## 🎯 Goal
Enable transferring inventory items between sites with a complete workflow.

---

## ✅ Step 1: Database Setup (SQL)
**Status:** Ready to run  
**File:** `ADD_INVENTORY_TRANSFERS.sql`

### What it provides:
- `inventory_transfers` table - Transfer requests/records
- `inventory_transfer_items` table - Items in each transfer
- Auto-transfer number generation (TRF-YYYYMMDD-####)
- `process_inventory_transfer()` function - Completes transfers
- `inventory_transfers_with_details` view - Easy querying

**Action:** Run SQL file in Supabase SQL Editor

---

## ✅ Step 2: Add Transfers Tab to Inventory Page
**Status:** Pending  
**File:** `inventory.html`

### Changes needed:
1. Add "Transfers" button to view toggle tabs
2. Create transfers view section
3. Add "Create Transfer" button

---

## ✅ Step 3: Build Transfer Creation UI
**Status:** Pending  
**File:** `inventory.html` + `js/inventory.js`

### Components needed:
1. **Transfer Modal:**
   - Select source site (From Site)
   - Select destination site (To Site)
   - Add items with quantities
   - Notes field
   - Submit button

2. **Transfer Items Table:**
   - Item dropdown (filtered by source site)
   - Available quantity display
   - Requested quantity input
   - Remove item button
   - Add more items button

---

## ✅ Step 4: Build Transfer List View
**Status:** Pending  
**File:** `js/inventory.js`

### Features needed:
1. Display all transfers in a table:
   - Transfer number
   - From/To sites
   - Status (pending, approved, in-transit, completed, cancelled)
   - Total items/quantities
   - Requested date
   - Actions (view, approve, complete, cancel)

2. Filter by:
   - Status
   - Site
   - Date range

---

## ✅ Step 5: Implement Transfer Functions
**Status:** Pending  
**File:** `js/inventory.js`

### Functions needed:
1. `createTransfer()` - Create new transfer request
2. `loadTransfers()` - Fetch all transfers
3. `approveTransfer()` - Approve pending transfer
4. `completeTransfer()` - Complete approved transfer (calls SQL function)
5. `cancelTransfer()` - Cancel transfer
6. `renderTransfers()` - Display transfer list
7. `viewTransferDetails()` - Show transfer detail modal

---

## ✅ Step 6: Add Transfer Status Workflow
**Status:** Pending  

### Workflow:
```
pending → approved → in-transit → completed
                    ↓
                 cancelled
```

### User actions:
- **Admin/Manager:** Can approve pending transfers
- **Admin/Manager:** Can mark as "in-transit"
- **Admin/Manager:** Can complete transfers (deducts/adds inventory)
- **Anyone:** Can cancel pending transfers
- **System:** Auto-creates transaction records when completed

---

## 📋 Implementation Checklist

- [ ] Step 1: Run `ADD_INVENTORY_TRANSFERS.sql` in Supabase
- [ ] Step 2: Add "Transfers" tab to inventory page
- [ ] Step 3: Create transfer modal/form
- [ ] Step 4: Build transfer list view with filters
- [ ] Step 5: Implement createTransfer() function
- [ ] Step 6: Implement loadTransfers() and renderTransfers()
- [ ] Step 7: Implement approveTransfer() function
- [ ] Step 8: Implement completeTransfer() function (calls SQL)
- [ ] Step 9: Implement cancelTransfer() function
- [ ] Step 10: Add transfer detail modal
- [ ] Step 11: Test full transfer workflow

---

## 🎨 UI Design

### Transfer List Table:
```
Transfer # | From Site | To Site | Items | Status | Date | Actions
```

### Transfer Creation Form:
```
┌─────────────────────────────────────┐
│ Create Transfer                     │
├─────────────────────────────────────┤
│ From Site: [Dropdown]               │
│ To Site: [Dropdown]                 │
│                                     │
│ Items:                              │
│ ┌─────────────────────────────────┐ │
│ │ Item | Available | Qty Requested│ │
│ └─────────────────────────────────┘ │
│ [Add Item]                          │
│                                     │
│ Notes: [Textarea]                   │
│                                     │
│ [Cancel] [Create Transfer]          │
└─────────────────────────────────────┘
```

---

## 🚀 Ready to implement!

