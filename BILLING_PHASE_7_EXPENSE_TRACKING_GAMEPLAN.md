# 💰 Phase 7: Expense Tracking - Game Plan

## Overview
Implement complete expense tracking system to record expenses against jobs/sites, upload receipts, categorize expenses, and generate expense reports.

---

## 🎯 Goals

1. **Expense Management** - Record and track expenses linked to jobs/sites
2. **Receipt Upload** - Upload and store expense receipts in Supabase Storage
3. **Expense Categorization** - Categorize expenses (supplies, equipment, travel, labor, other)
4. **Expense Reports** - Generate reports and charts for expense analysis
5. **Profitability Tracking** - Link expenses to jobs for profitability calculations

---

## 📋 Implementation Steps

### Step 1: Add Expenses Tab to Reports Page

**Location:** `reports.html` (add new tab button and content)

**Tab Structure:**
- Add "Expenses" tab button next to "Billing" tab
- Create expenses tab content container
- Include summary cards, filters, and expenses table

**Summary Cards:**
- Total Expenses (all time)
- Expenses This Month
- Expenses by Category (breakdown)
- Average Expense per Job

---

### Step 2: Expense List View

**Features:**
- Table with columns: Date, Description, Category, Amount, Job/Site, Receipt, Actions
- Filters: Category, Date Range, Job, Site
- Search functionality
- Sort by date, amount, category
- Pagination (if needed)

**Table Design:**
```
| Date       | Description      | Category  | Amount   | Job/Site | Receipt | Actions |
|------------|------------------|-----------|----------|----------|---------|---------|
| Jan 15     | Cleaning supplies| Supplies | $150.00  | Job #123 | 📄 View | Edit/Delete |
```

---

### Step 3: Add Expense Modal

**Modal Structure:**
- Description (required)
- Category dropdown (supplies, equipment, travel, labor, other)
- Amount (required, numeric)
- Expense Date (default to today)
- Job (optional dropdown)
- Site (optional dropdown)
- Vendor Name (optional)
- Receipt Upload (optional, Supabase Storage)
- Notes (optional textarea)

**Receipt Upload:**
- File input (accept images and PDFs)
- Upload to Supabase Storage: `expense-receipts/{user_id}/{expense_id}/{filename}`
- Show preview after upload
- Display existing receipt if editing

---

### Step 4: Expense Submission

**Process:**
1. Validate form (description, category, amount required)
2. Upload receipt if provided (Supabase Storage)
3. Insert expense into `expenses` table
4. Refresh expense list
5. Update summary cards
6. Show success toast

**Database Insert:**
```javascript
const { data: expense, error } = await supabase
  .from('expenses')
  .insert({
    job_id: jobId || null,
    site_id: siteId || null,
    description: description,
    category: category,
    amount: amount,
    expense_date: expenseDate,
    vendor_name: vendorName || null,
    receipt_url: receiptUrl || null,
    notes: notes || null,
    created_by: currentUser.id
  });
```

---

### Step 5: Expense Reports & Charts

**Summary Cards:**
- Total Expenses: Sum of all expenses
- This Month: Sum of expenses in current month
- By Category: Breakdown by category (pie chart or list)
- Average per Job: Total expenses / number of jobs with expenses

**Charts:**
- Expenses by Category (pie chart)
- Expenses Over Time (line chart - last 12 months)
- Expenses by Job (bar chart - top 10 jobs)

**Export:**
- Export to CSV
- Include all filters applied
- Columns: Date, Description, Category, Amount, Job, Site, Vendor

---

### Step 6: Edit/Delete Expenses

**Edit Expense:**
- Open expense modal with pre-filled data
- Allow updating all fields
- Re-upload receipt if needed
- Update expense in database

**Delete Expense:**
- Confirmation dialog
- Delete expense from database
- Delete receipt from storage (if exists)
- Refresh expense list

---

## 🗄️ Database Schema

**Expenses Table** (already exists):
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  site_id BIGINT REFERENCES sites(id),
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('supplies', 'equipment', 'travel', 'labor', 'other')),
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  vendor_name VARCHAR(255),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI/UX Design

### Expenses Tab Layout
```
┌─────────────────────────────────────────┐
│ Expenses                    [+ Add]     │
├─────────────────────────────────────────┤
│ [Cards: Total | This Month | Category] │
├─────────────────────────────────────────┤
│ Filters: [Category ▼] [Date] [Job]     │
│ Search: [________________]              │
├─────────────────────────────────────────┤
│ Date | Description | Category | Amount  │
│ Jan 15 | Supplies | $150.00 | ...       │
└─────────────────────────────────────────┘
```

### Add Expense Modal
- Clean form layout
- Category icons/badges
- Receipt upload with preview
- Job/Site dropdowns (optional)
- Validation feedback

---

## 🔧 Technical Implementation

### Files to Modify:
1. **`reports.html`**
   - Add "Expenses" tab button
   - Add expenses tab content
   - Add expense modal HTML
   - Implement expense functions

### Key Functions:

```javascript
// Load expenses
async function loadExpenses(filters = {}) {
  // Fetch expenses with filters
  // Apply category, date range, job, site filters
  // Render expense table
  // Update summary cards
}

// Add expense
async function addExpense(expenseData) {
  // Upload receipt if provided
  // Insert expense
  // Refresh list
}

// Upload receipt
async function uploadExpenseReceipt(file, expenseId) {
  // Upload to Supabase Storage
  // Return receipt URL
}

// Generate expense reports
function generateExpenseCharts(expenses) {
  // Create pie chart (by category)
  // Create line chart (over time)
  // Create bar chart (by job)
}

// Export expenses
function exportExpensesToCSV(expenses) {
  // Convert to CSV
  // Download file
}
```

---

## ✅ Implementation Checklist

### Phase 7.1: UI Setup
- [ ] Add "Expenses" tab to reports page
- [ ] Create expenses tab content container
- [ ] Add summary cards (Total, This Month, By Category)
- [ ] Create expense table structure

### Phase 7.2: Add Expense Modal
- [ ] Create add expense modal HTML
- [ ] Add form fields (description, category, amount, date, job, site, vendor, notes)
- [ ] Add receipt upload input
- [ ] Style modal consistently

### Phase 7.3: Expense Submission
- [ ] Implement receipt upload to Supabase Storage
- [ ] Insert expense into database
- [ ] Validate form data
- [ ] Handle errors gracefully
- [ ] Show success/error toasts

### Phase 7.4: Expense List & Filters
- [ ] Fetch and display expenses
- [ ] Implement category filter
- [ ] Implement date range filter
- [ ] Implement job/site filters
- [ ] Add search functionality
- [ ] Sort expenses

### Phase 7.5: Summary Cards & Charts
- [ ] Calculate total expenses
- [ ] Calculate this month's expenses
- [ ] Calculate expenses by category
- [ ] Create pie chart (by category)
- [ ] Create line chart (over time)
- [ ] Create bar chart (by job)

### Phase 7.6: Edit/Delete Expenses
- [ ] Add edit button to expense rows
- [ ] Implement edit expense modal
- [ ] Update expense in database
- [ ] Add delete button with confirmation
- [ ] Delete expense and receipt

### Phase 7.7: Export & Reports
- [ ] Export expenses to CSV
- [ ] Apply filters to export
- [ ] Format CSV properly

---

## 🧪 Testing Checklist

1. **Add Expense:**
   - [ ] Can open add expense modal
   - [ ] Can fill in all fields
   - [ ] Can upload receipt
   - [ ] Expense saves successfully
   - [ ] Receipt displays correctly
   - [ ] Expense appears in list

2. **Filters:**
   - [ ] Category filter works
   - [ ] Date range filter works
   - [ ] Job filter works
   - [ ] Site filter works
   - [ ] Search works

3. **Reports:**
   - [ ] Summary cards show correct data
   - [ ] Charts render correctly
   - [ ] Export to CSV works

4. **Edit/Delete:**
   - [ ] Can edit expense
   - [ ] Can delete expense
   - [ ] Receipt deleted when expense deleted

---

## 🚀 Estimated Time

- **Phase 7.1-7.2 (UI Setup):** 2-3 hours
- **Phase 7.3 (Submission):** 1-2 hours
- **Phase 7.4 (List & Filters):** 2 hours
- **Phase 7.5 (Charts):** 2 hours
- **Phase 7.6 (Edit/Delete):** 1-2 hours
- **Phase 7.7 (Export):** 1 hour
- **Testing & Polish:** 1-2 hours

**Total: 10-14 hours**

---

## 📝 Notes

- Receipt storage: Use Supabase Storage bucket `expense-receipts`
- Category icons: Use Lucide icons for each category
- Profitability: Future enhancement - link expenses to invoices for profit calculation
- Recurring expenses: Future enhancement - set up recurring expense templates

---

**Ready to implement?** Say "yes" to proceed! 🚀

