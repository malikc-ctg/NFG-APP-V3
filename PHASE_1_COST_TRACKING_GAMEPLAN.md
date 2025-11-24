# 💰 Phase 1: Cost Tracking & Valuation - Implementation Plan

## 🎯 Goal
Add cost tracking to inventory items and calculate total inventory valuation.

---

## ✅ Step 1: Database Setup (SQL)
**Status:** Ready to run  
**File:** `ADD_INVENTORY_COST_TRACKING.sql`

### What it adds:
- Cost columns to `inventory_items`:
  - `unit_cost` - Base unit cost
  - `last_purchase_cost` - Last purchase price
  - `average_cost` - Weighted average cost
  - `preferred_supplier_id` - Link to preferred supplier
- Cost column to `site_inventory`:
  - `unit_cost` - Site-specific pricing
- Auto-calculation trigger:
  - Updates `average_cost` when inventory is received with cost

**Action:** Run SQL file in Supabase SQL Editor

---

## ✅ Step 2: Update PO Receiving Function
**Status:** In progress  
**File:** `js/inventory.js` - `markPurchaseOrderReceived()`

### Changes needed:
1. Get `cost_per_unit` from `purchase_order_items` when receiving
2. Update `site_inventory.unit_cost` with received cost
3. Trigger will auto-update `average_cost` in `inventory_items`

---

## ✅ Step 3: Add Cost Display to Inventory Table
**Status:** Pending  
**File:** `js/inventory.js` - `renderInventory()`

### Changes needed:
1. Query cost fields when loading inventory
2. Add "Unit Cost" column to inventory table
3. Show cost per unit (use site cost, or item average cost, or item unit cost)
4. Format as currency

---

## ✅ Step 4: Add Inventory Valuation Display
**Status:** Pending  
**File:** `js/inventory.js` - `updateSummaryCards()`

### Changes needed:
1. Calculate total inventory value:
   - Sum of (quantity × unit_cost) for all items
   - Use site_inventory.unit_cost if available
   - Fall back to inventory_items.average_cost
   - Fall back to inventory_items.unit_cost
2. Add "Total Inventory Value" card to summary cards
3. Display formatted currency

---

## ✅ Step 5: Update PO Receiving to Track Costs
**Status:** Pending  
**File:** `js/inventory.js` - `markPurchaseOrderReceived()`

### Changes needed:
1. When receiving PO items, check if `cost_per_unit` exists
2. Update `site_inventory.unit_cost` with received cost
3. The database trigger will handle updating average_cost automatically

---

## 📋 Implementation Checklist

- [ ] Step 1: Run `ADD_INVENTORY_COST_TRACKING.sql` in Supabase
- [ ] Step 2: Update `markPurchaseOrderReceived()` to save costs
- [ ] Step 3: Update inventory query to include cost fields
- [ ] Step 4: Add cost column to inventory table
- [ ] Step 5: Calculate and display inventory valuation
- [ ] Step 6: Add "Total Inventory Value" summary card
- [ ] Step 7: Test cost tracking flow (create PO → receive → verify costs)

---

## 🎨 UI Changes

### Inventory Table
- Add "Unit Cost" column (between Quantity and Status)
- Format as currency ($X.XX)
- Show "N/A" if no cost data

### Summary Cards
- Add new card: "Total Inventory Value"
- Show formatted currency
- Calculate from all inventory items

---

## 🚀 Ready to implement!

