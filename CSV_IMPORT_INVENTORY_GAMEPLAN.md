# 📥 CSV Import - Inventory (Phase 2.1 & 2.2)

## 🎯 Overview
Import inventory items (master catalog) and stock levels (quantities per site) from CSV.

---

## 📋 Two Import Types

### **Type 1: Inventory Items** (Master Catalog)
Import the master list of inventory items (product catalog).

### **Type 2: Inventory Stock** (Stock Levels)
Import current stock quantities for items at specific sites.

---

## 🗄️ Database Structure

### **inventory_items Table:**
- `id` (BIGSERIAL)
- `name` (TEXT) - Required
- `category_id` (BIGINT) - References inventory_categories
- `unit` (VARCHAR) - Default: 'pieces'
- `low_stock_threshold` (INTEGER) - Default: 5
- `reorder_quantity` (INTEGER) - Default: 20
- `notes` (TEXT)
- `created_by` (UUID)

### **site_inventory Table:**
- `id` (BIGSERIAL)
- `site_id` (BIGINT) - Required, references sites
- `item_id` (BIGINT) - Required, references inventory_items
- `quantity` (INTEGER) - Default: 0
- `location_notes` (TEXT)
- `last_restocked_at` (TIMESTAMPTZ)

---

## 📥 Phase 2.1: Inventory Items Import

### **CSV Template:**
```csv
Item Name,Category,Unit,Low Stock Threshold,Reorder Quantity,Notes
"Floor Mop","Cleaning Supplies","pieces",2,5,"Standard floor mop"
"Bleach (5L)","Chemicals","bottles",3,10,"Household bleach"
"Paper Towels","Paper Products","rolls",20,50,"Commercial paper towel rolls"
```

### **Required Fields:**
- Item Name

### **Optional Fields:**
- Category (must match existing category or create new)
- Unit (default: 'pieces')
- Low Stock Threshold (default: 5)
- Reorder Quantity (default: 20)
- Notes

### **Field Mapping:**
| CSV Column | NFG Field | Required | Notes |
|------------|-----------|----------|-------|
| Item Name / Name | `name` | ✅ Yes | |
| Category | `category_id` | ❌ No | Lookup by name, create if not exists |
| Unit | `unit` | ❌ No | Default: 'pieces' |
| Low Stock Threshold | `low_stock_threshold` | ❌ No | Default: 5 |
| Reorder Quantity | `reorder_quantity` | ❌ No | Default: 20 |
| Notes | `notes` | ❌ No | |

### **Special Handling:**
- **Category lookup** - Match by category name (fuzzy match)
- **Create category if missing** - Option to auto-create categories
- **Item name uniqueness** - Check for duplicates
- **Unit validation** - Common units: pieces, bottles, boxes, rolls, liters, etc.

---

## 📥 Phase 2.2: Inventory Stock Import

### **CSV Template:**
```csv
Site Name,Item Name,Quantity,Location Notes
"ABC Office","Floor Mop",5,"Storage closet, 2nd floor"
"ABC Office","Bleach (5L)",10,"Janitor's room"
"XYZ Warehouse","Paper Towels",50,"Main storage"
```

### **Required Fields:**
- Site Name (must exist)
- Item Name (must exist in inventory_items)
- Quantity

### **Optional Fields:**
- Location Notes

### **Field Mapping:**
| CSV Column | NFG Field | Required | Notes |
|------------|-----------|----------|-------|
| Site Name / Site | `site_id` | ✅ Yes | Lookup by name |
| Item Name / Item | `item_id` | ✅ Yes | Lookup by name |
| Quantity | `quantity` | ✅ Yes | Must be >= 0 |
| Location Notes | `location_notes` | ❌ No | |

### **Special Handling:**
- **Site lookup** - Match by site name (fuzzy match)
- **Item lookup** - Match by item name (fuzzy match)
- **Duplicate handling** - If site+item exists, update quantity or skip
- **Transaction history** - Create transaction record for imported stock

---

## 🚀 Implementation Plan

### **Step 1: Add Inventory Items Import** (2 hours)
1. Add `inventory_items` to FIELD_DEFINITIONS
2. Add column mappings
3. Add category lookup/create logic
4. Add validation (name uniqueness)
5. Add import logic (create items)
6. Enable button in UI

### **Step 2: Add Inventory Stock Import** (2 hours)
1. Add `inventory_stock` to FIELD_DEFINITIONS
2. Add column mappings
3. Add site lookup logic
4. Add item lookup logic
5. Add validation (site/item must exist)
6. Add import logic (create/update site_inventory)
7. Create transaction records
8. Enable button in UI

---

## 🔄 Import Workflows

### **Inventory Items Import:**
```
1. Select "Inventory Items" import type
2. Upload CSV with items
3. Validate:
   - Item name required
   - Category exists or create option
   - Item name uniqueness
4. Preview with warnings/errors
5. Import items
6. Show results
```

### **Inventory Stock Import:**
```
1. Select "Inventory Stock" import type
2. Upload CSV with stock levels
3. Validate:
   - Site exists
   - Item exists
   - Quantity is valid number
4. Preview with warnings/errors
5. Import stock (create or update)
6. Create transaction records
7. Show results
```

---

## 🎨 UI Updates

### **Import Modal:**
- Add "Inventory Items" button
- Add "Inventory Stock" button
- Update templates for both

### **Validation Preview:**
- Show category creation warnings
- Show site/item lookup results
- Show duplicate handling options

---

## 📝 CSV Templates

### **Inventory Items Template:**
```csv
Item Name,Category,Unit,Low Stock Threshold,Reorder Quantity,Notes
"Floor Mop","Cleaning Supplies","pieces",2,5,"Standard floor mop"
"Bleach (5L)","Chemicals","bottles",3,10,"Household bleach"
"Paper Towels","Paper Products","rolls",20,50,"Commercial paper towel rolls"
```

### **Inventory Stock Template:**
```csv
Site Name,Item Name,Quantity,Location Notes
"ABC Office","Floor Mop",5,"Storage closet, 2nd floor"
"ABC Office","Bleach (5L)",10,"Janitor's room"
"XYZ Warehouse","Paper Towels",50,"Main storage"
```

---

## ✅ Success Criteria

### **Inventory Items Import:**
- [ ] Can import items from CSV
- [ ] Handles category lookup/create
- [ ] Validates item name uniqueness
- [ ] Creates items with correct fields
- [ ] Shows import results

### **Inventory Stock Import:**
- [ ] Can import stock levels from CSV
- [ ] Validates site and item exist
- [ ] Handles duplicates (update vs skip)
- [ ] Creates transaction records
- [ ] Updates inventory correctly

---

**Ready to start?** Let's begin with Inventory Items import first! 🚀

