# 🚀 Full Inventory Expansion - Gameplan

## 🎯 Overview
Transform the basic inventory system into a comprehensive procurement and inventory management module that rivals enterprise solutions.

---

## ✅ Current State

### What We Have:
- ✅ Inventory categories & items
- ✅ Site-specific inventory tracking
- ✅ Transaction history
- ✅ Basic low stock thresholds
- ✅ Some supplier/PO UI (partial implementation)

### What's Missing:
- ❌ Complete Purchase Order workflow
- ❌ Supplier management (database tables)
- ❌ Cost tracking & inventory valuation
- ❌ Automated low stock alerts
- ❌ PO approval workflow
- ❌ Inventory transfers between sites
- ❌ Batch/lot tracking
- ❌ Expiration date management
- ❌ Warehouse/location management
- ❌ Advanced reporting & analytics
- ❌ Inventory forecasting

---

## 📋 Expansion Phases

### **Phase 1: Foundation - Purchase Orders & Suppliers** (Priority: HIGH)
**Timeline:** 2-3 weeks  
**Value:** Enables procurement workflow

#### 1.1 Supplier Management
- [ ] Create `suppliers` table
- [ ] Supplier CRUD operations
- [ ] Supplier contact management
- [ ] Preferred supplier selection
- [ ] Supplier performance tracking
- [ ] Supplier pricing catalogs

#### 1.2 Purchase Orders (PO)
- [ ] Create `purchase_orders` table
- [ ] Create `purchase_order_items` table
- [ ] PO creation from low stock alerts
- [ ] PO status workflow (draft → pending → approved → received → paid)
- [ ] PO approval workflow
- [ ] PO receiving (partial/full)
- [ ] PO to inventory restocking
- [ ] PO document attachments
- [ ] PO payment tracking

#### 1.3 Integration
- [ ] Link suppliers to inventory items
- [ ] Auto-create PO from low stock
- [ ] PO receiving updates inventory
- [ ] Cost tracking per item

---

### **Phase 2: Advanced Inventory Features** (Priority: HIGH)
**Timeline:** 2-3 weeks  
**Value:** Professional inventory management

#### 2.1 Cost & Valuation
- [ ] Add cost fields to inventory_items
- [ ] Average cost calculation (FIFO/LIFO)
- [ ] Inventory valuation reports
- [ ] Cost per unit tracking
- [ ] Total inventory value

#### 2.2 Inventory Transfers
- [ ] Create `inventory_transfers` table
- [ ] Transfer between sites
- [ ] Transfer approval workflow
- [ ] Transfer history
- [ ] Transfer notifications

#### 2.3 Enhanced Tracking
- [ ] Batch/lot numbers
- [ ] Expiration date tracking
- [ ] Serial number tracking (optional)
- [ ] Warehouse/location within site
- [ ] Bin location tracking

---

### **Phase 3: Automation & Intelligence** (Priority: MEDIUM)
**Timeline:** 1-2 weeks  
**Value:** Reduces manual work

#### 3.1 Automated Alerts
- [ ] Low stock notifications (email/push)
- [ ] Expiration date warnings
- [ ] Reorder point automation
- [ ] Alert preferences per user
- [ ] Alert history

#### 3.2 Smart Reordering
- [ ] Usage-based reorder suggestions
- [ ] Seasonal demand forecasting
- [ ] Auto-generate PO suggestions
- [ ] Economic order quantity (EOQ) calculation

---

### **Phase 4: Reporting & Analytics** (Priority: MEDIUM)
**Timeline:** 1-2 weeks  
**Value:** Business intelligence

#### 4.1 Inventory Reports
- [ ] Inventory valuation report
- [ ] Stock movement report
- [ ] Low stock report
- [ ] Expiring items report
- [ ] Usage trends report
- [ ] ABC analysis (high/medium/low value items)

#### 4.2 Procurement Reports
- [ ] PO status report
- [ ] Supplier performance report
- [ ] Purchase history report
- [ ] Cost analysis report
- [ ] Reorder frequency report

#### 4.3 Dashboards
- [ ] Inventory overview dashboard
- [ ] Procurement dashboard
- [ ] Cost trends visualization
- [ ] Stock level charts

---

### **Phase 5: Advanced Features** (Priority: LOW)
**Timeline:** 2-3 weeks  
**Value:** Enterprise-level features

#### 5.1 Multi-Warehouse
- [ ] Warehouse management
- [ ] Inter-warehouse transfers
- [ ] Warehouse-level reporting
- [ ] Warehouse capacity tracking

#### 5.2 Advanced Costing
- [ ] Multiple costing methods (FIFO, LIFO, Average)
- [ ] Landed cost calculation
- [ ] Overhead allocation
- [ ] Cost variance analysis

#### 5.3 Integration
- [ ] Accounting software integration (QuickBooks)
- [ ] EDI support for large suppliers
- [ ] Barcode scanning support
- [ ] API for third-party integrations

---

## 🗄️ Database Schema

### **Suppliers Table**
```sql
CREATE TABLE suppliers (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  preferred_contact_method VARCHAR(50), -- email, phone, etc.
  payment_terms VARCHAR(100), -- Net 30, Net 60, etc.
  tax_id VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Purchase Orders Table**
```sql
CREATE TABLE purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL, -- Auto-generated: PO-YYYYMMDD-001
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, pending, approved, ordered, received, cancelled, paid
  order_date DATE,
  expected_delivery_date DATE,
  received_date DATE,
  total_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Purchase Order Items Table**
```sql
CREATE TABLE purchase_order_items (
  id BIGSERIAL PRIMARY KEY,
  po_id BIGINT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  line_total DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Inventory Items - Cost Fields**
```sql
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS 
  unit_cost DECIMAL(10,2),
  last_purchase_cost DECIMAL(10,2),
  average_cost DECIMAL(10,2),
  preferred_supplier_id BIGINT REFERENCES suppliers(id);
```

### **Inventory Transfers Table**
```sql
CREATE TABLE inventory_transfers (
  id BIGSERIAL PRIMARY KEY,
  transfer_number VARCHAR(50) UNIQUE NOT NULL,
  from_site_id BIGINT REFERENCES sites(id),
  to_site_id BIGINT REFERENCES sites(id),
  status VARCHAR(50) DEFAULT 'pending', -- pending, in-transit, completed, cancelled
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  completed_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inventory_transfer_items (
  id BIGSERIAL PRIMARY KEY,
  transfer_id BIGINT REFERENCES inventory_transfers(id) ON DELETE CASCADE,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity_requested INTEGER NOT NULL,
  quantity_transferred INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Enhanced Inventory Items**
```sql
ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS
  batch_tracking BOOLEAN DEFAULT false,
  expiration_tracking BOOLEAN DEFAULT false,
  serial_tracking BOOLEAN DEFAULT false;
```

### **Inventory Batches/Lots**
```sql
CREATE TABLE inventory_batches (
  id BIGSERIAL PRIMARY KEY,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  batch_number VARCHAR(100),
  lot_number VARCHAR(100),
  quantity INTEGER NOT NULL,
  expiration_date DATE,
  manufacture_date DATE,
  received_date DATE,
  unit_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Warehouse Locations**
```sql
CREATE TABLE warehouse_locations (
  id BIGSERIAL PRIMARY KEY,
  site_id BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- "Main Warehouse", "Storage Room A", etc.
  address TEXT,
  capacity_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add location to site_inventory
ALTER TABLE site_inventory ADD COLUMN IF NOT EXISTS
  warehouse_location_id BIGINT REFERENCES warehouse_locations(id),
  bin_location VARCHAR(100); -- "A-12", "Shelf 3", etc.
```

---

## 🎨 UI/UX Design

### **Purchase Orders Page**
- Tab navigation: Draft, Pending, Approved, Received, All
- Create PO button (with "From Low Stock" quick action)
- PO list with status badges
- PO detail modal with:
  - Header: PO number, supplier, status, dates
  - Items table (editable)
  - Totals section
  - Approval workflow buttons
  - Receiving section
  - Payment tracking
  - Document attachments

### **Suppliers Page**
- Supplier list with search/filter
- Supplier detail modal
- Supplier performance metrics
- Link to supplier's POs
- Preferred supplier indicator

### **Inventory Transfers**
- Transfer request form
- Transfer list with status
- Transfer approval workflow
- Transfer completion

### **Enhanced Inventory Page**
- Cost column (if user has permission)
- Total value calculation
- Transfer button
- Batch/lot information
- Expiration date warnings

---

## 🔄 Workflows

### **Purchase Order Workflow**
```
1. Low Stock Alert → Create PO (auto-populate items)
2. Add/Edit PO Items → Select Supplier
3. Submit for Approval (if required)
4. Approve PO → Status: Approved
5. Send to Supplier (optional: email PO)
6. Receive Items → Update quantities
7. Mark as Received → Auto-update inventory
8. Record Payment → Status: Paid
```

### **Inventory Transfer Workflow**
```
1. Request Transfer (from site → to site)
2. Select Items & Quantities
3. Submit for Approval
4. Approve Transfer
5. Process Transfer (deduct from source, add to destination)
6. Complete Transfer
```

### **Low Stock Alert Workflow**
```
1. System checks inventory levels (daily/hourly)
2. Identifies items below threshold
3. Creates notification
4. Option to auto-create PO
5. Send alerts to admins/managers
```

---

## 📊 Reports & Analytics

### **Inventory Reports**
1. **Inventory Valuation Report**
   - Total inventory value
   - Value by category
   - Value by site
   - Cost trends

2. **Stock Movement Report**
   - Items with most activity
   - Usage patterns
   - Seasonal trends

3. **Low Stock Report**
   - All items below threshold
   - Items out of stock
   - Reorder suggestions

4. **Expiring Items Report**
   - Items expiring soon
   - Expired items
   - FEFO (First Expired, First Out) suggestions

### **Procurement Reports**
1. **PO Status Report**
   - POs by status
   - Pending approvals
   - Overdue deliveries

2. **Supplier Performance**
   - On-time delivery rate
   - Quality metrics
   - Cost comparison

3. **Purchase History**
   - Spending by supplier
   - Spending by category
   - Cost trends

---

## 🚀 Implementation Order

### **Week 1-2: Phase 1.1 & 1.2 (Suppliers & POs)**
1. Create database tables
2. Supplier CRUD operations
3. PO creation & management
4. Basic PO workflow

### **Week 3: Phase 1.3 (Integration)**
1. Link suppliers to items
2. PO receiving → inventory update
3. Cost tracking

### **Week 4-5: Phase 2 (Advanced Features)**
1. Cost & valuation
2. Inventory transfers
3. Enhanced tracking

### **Week 6: Phase 3 (Automation)**
1. Automated alerts
2. Smart reordering

### **Week 7-8: Phase 4 (Reporting)**
1. Build reports
2. Create dashboards

---

## ✅ Success Criteria

### **Must Have:**
- ✅ Complete PO workflow (draft → paid)
- ✅ Supplier management
- ✅ Cost tracking
- ✅ Low stock alerts
- ✅ Inventory transfers
- ✅ Basic reporting

### **Nice to Have:**
- ✅ Batch/lot tracking
- ✅ Expiration dates
- ✅ Advanced analytics
- ✅ Forecasting
- ✅ Integrations

---

## 💡 Future Enhancements

1. **Barcode Scanning** - Mobile app integration
2. **RFID Support** - For large warehouses
3. **AI-Powered Forecasting** - ML-based demand prediction
4. **Multi-Currency** - For international suppliers
5. **Contract Management** - Supplier contracts & terms
6. **Quality Control** - Inspection workflows
7. **Returns Management** - Return to supplier
8. **Consignment Inventory** - Track consigned items

---

## 📝 Notes

- Start with Phase 1 (POs & Suppliers) - highest value
- Build incrementally - test each phase
- Focus on user experience - make it intuitive
- Consider mobile use - field workers need access
- Performance matters - optimize queries for large datasets

---

**Ready to start?** Let's begin with Phase 1.1: Supplier Management! 🚀

