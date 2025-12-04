# 🏢 Multi-Tenancy & White-Label Game Plan
## Transforming NFG → handl.it Platform

---

## 🎯 **GOAL**

Transform the NFG app into **handl.it** - a multi-tenant platform where:
- **handl.it** = The platform name
- **NFG** = First tenant/company (already set up)
- Each company gets white-labeled branding
- Complete data isolation between tenants

---

## 📋 **PHASE 1: Database Schema - Multi-Tenancy Foundation**

### 1.1 Update Company Profiles Table
**Add white-label fields:**
```sql
ALTER TABLE company_profiles ADD COLUMN IF NOT EXISTS:
  - platform_name TEXT DEFAULT 'handl.it'
  - company_display_name TEXT -- "Northern Facilities Group"
  - logo_url TEXT -- Company logo
  - primary_color TEXT DEFAULT '#0D47A1' -- Brand color
  - secondary_color TEXT -- Accent color
  - domain TEXT -- Custom domain (optional)
  - subdomain TEXT -- handl.it/{subdomain} (optional)
  - white_label_enabled BOOLEAN DEFAULT true
  - created_at TIMESTAMPTZ DEFAULT NOW()
  - updated_at TIMESTAMPTZ DEFAULT NOW()
```

### 1.2 Add Tenant ID to All Tables
**Add `company_id` or `tenant_id` to:**
- ✅ `company_profiles` (already has id)
- ✅ `user_profiles` (already has company_id)
- ✅ `sites` (already has created_by, link to company)
- ✅ `jobs` (link via created_by → company)
- ✅ `bookings` (link via client_id → company)
- ✅ `invoices` (link via created_by → company)
- ✅ `payments` (link via invoice → company)
- ✅ `expenses` (link via created_by → company)
- ✅ `inventory_items` (link via company)
- ✅ `platform_subscriptions` (already has company_id)
- ✅ All other tables

### 1.3 Create Tenant Isolation Indexes
```sql
-- Add indexes for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company ON sites(created_by);
-- ... for all tenant-linked tables
```

### 1.4 Row Level Security (RLS) Updates
**Update all RLS policies to include tenant isolation:**
```sql
-- Example: Users can only see their company's data
CREATE POLICY "tenant_isolation_users" ON user_profiles
  FOR ALL USING (
    company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );
```

---

## 📋 **PHASE 2: Platform Branding - handl.it Identity**

### 2.1 Update App Name & Metadata
**Files to update:**
- `index.html` - Login page title
- `manifest.json` - App name, icons
- All HTML files - Page titles
- `package.json` (if exists) - App name

**Changes:**
- "NFG Dashboard" → "handl.it" or "{Company Name}"
- Update favicons
- Update app icons

### 2.2 Create Branding Configuration
**New file: `js/branding.js`:**
```javascript
// Get company branding from database
export async function getCompanyBranding() {
  const { data: company } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', currentUser.company_id)
    .single();
  
  return {
    name: company.company_display_name || 'handl.it',
    logo: company.logo_url || '/default-logo.png',
    primaryColor: company.primary_color || '#0D47A1',
    secondaryColor: company.secondary_color || '#0A3A84',
    platformName: company.platform_name || 'handl.it'
  };
}

// Apply branding to page
export async function applyBranding() {
  const branding = await getCompanyBranding();
  
  // Update logo
  document.querySelectorAll('.company-logo').forEach(el => {
    el.src = branding.logo;
    el.alt = branding.name;
  });
  
  // Update colors
  document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
  document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor);
  
  // Update company name
  document.querySelectorAll('.company-name').forEach(el => {
    el.textContent = branding.name;
  });
}
```

### 2.3 Update Tailwind Config for Dynamic Colors
**Update `tailwind.config` in all HTML files:**
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Use CSS variables for dynamic colors
        brand: 'var(--primary-color)',
        branddark: 'var(--secondary-color)',
        // Keep NFG colors as fallback
        nfgblue: '#0D47A1',
        nfgdark: '#0A3A84',
      }
    }
  }
}
```

---

## 📋 **PHASE 3: Data Migration - NFG as First Tenant**

### 3.1 Create Migration Script
**File: `MIGRATE_TO_MULTI_TENANT.sql`**

```sql
-- 1. Ensure NFG company exists
INSERT INTO company_profiles (
  id, name, company_display_name, platform_name,
  logo_url, primary_color, secondary_color,
  white_label_enabled, created_at
) VALUES (
  'existing-nfg-id', -- Use existing NFG company ID
  'Northern Facilities Group',
  'Northern Facilities Group',
  'handl.it',
  'https://...nfg-logo.png',
  '#0D47A1',
  '#0A3A84',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  company_display_name = 'Northern Facilities Group',
  platform_name = 'handl.it',
  white_label_enabled = true;

-- 2. Ensure all existing data has company_id
-- (Most should already have it via created_by relationships)

-- 3. Update any orphaned records
UPDATE user_profiles 
SET company_id = (SELECT id FROM company_profiles WHERE name = 'Northern Facilities Group' LIMIT 1)
WHERE company_id IS NULL;

-- 4. Verify data integrity
SELECT 
  'Users without company' as check_type,
  COUNT(*) as count
FROM user_profiles WHERE company_id IS NULL
UNION ALL
SELECT 
  'Sites without company',
  COUNT(*) 
FROM sites s
LEFT JOIN user_profiles u ON s.created_by = u.id
WHERE u.company_id IS NULL;
```

### 3.2 Backup Strategy
**Before migration:**
1. Export all data to JSON
2. Create database backup
3. Test migration on staging first

---

## 📋 **PHASE 4: Authentication & Tenant Selection**

### 4.1 Update Login Flow
**New flow:**
1. User enters email/password
2. System identifies their company
3. Load company branding
4. Redirect to dashboard with branding applied

### 4.2 Tenant Context
**New file: `js/tenant-context.js`:**
```javascript
export let currentTenant = null;

export async function loadTenantContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, company_profiles(*)')
    .eq('id', user.id)
    .single();
  
  currentTenant = profile?.company_profiles;
  return currentTenant;
}

export function getTenantId() {
  return currentTenant?.id;
}
```

### 4.3 Update All Queries
**Add tenant filtering to all Supabase queries:**
```javascript
// Before
const { data } = await supabase.from('sites').select('*');

// After
const tenantId = getTenantId();
const { data } = await supabase
  .from('sites')
  .select('*')
  .eq('company_id', tenantId); // Or via created_by relationship
```

---

## 📋 **PHASE 5: UI Updates - Dynamic Branding**

### 5.1 Logo Replacement
**Find all logo references:**
- Sidebar logos
- Login page logos
- Email templates
- PDF invoices
- Favicons

**Update to use:**
```html
<img src="{{company.logo_url}}" alt="{{company.name}}" class="company-logo">
```

### 5.2 Color Scheme Updates
**Replace hardcoded colors:**
- `nfgblue` → `brand` (CSS variable)
- `nfgdark` → `branddark` (CSS variable)
- Update all Tailwind classes

### 5.3 Company Name Display
**Update all "NFG" references:**
- Page titles
- Sidebar
- Footer
- Email signatures
- Invoice headers

**Use:**
```html
<span class="company-name">{{company.name}}</span>
```

### 5.4 Platform Name
**Show "handl.it" as platform:**
- Login page: "Powered by handl.it"
- Footer: "© 2025 handl.it"
- Settings: "handl.it Platform"

---

## 📋 **PHASE 6: Settings - Company Branding Management**

### 6.1 New Settings Section
**Add to `settings.html`:**
```html
<!-- Company Branding Section -->
<div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-6 shadow-nfg">
  <h3 class="text-lg font-semibold text-nfgblue mb-4">Company Branding</h3>
  
  <!-- Company Name -->
  <div class="mb-4">
    <label>Company Display Name</label>
    <input type="text" id="company-display-name" />
  </div>
  
  <!-- Logo Upload -->
  <div class="mb-4">
    <label>Company Logo</label>
    <input type="file" id="company-logo-upload" accept="image/*" />
    <img id="logo-preview" src="" />
  </div>
  
  <!-- Brand Colors -->
  <div class="mb-4">
    <label>Primary Color</label>
    <input type="color" id="primary-color" />
  </div>
  
  <div class="mb-4">
    <label>Secondary Color</label>
    <input type="color" id="secondary-color" />
  </div>
  
  <button onclick="saveBranding()">Save Branding</button>
</div>
```

### 6.2 Branding Update Functions
**Add to `js/settings.js`:**
```javascript
async function saveBranding() {
  const logoFile = document.getElementById('company-logo-upload').files[0];
  let logoUrl = currentCompany.logo_url;
  
  // Upload logo if new file
  if (logoFile) {
    logoUrl = await uploadCompanyLogo(logoFile);
  }
  
  const { error } = await supabase
    .from('company_profiles')
    .update({
      company_display_name: document.getElementById('company-display-name').value,
      logo_url: logoUrl,
      primary_color: document.getElementById('primary-color').value,
      secondary_color: document.getElementById('secondary-color').value,
      updated_at: new Date().toISOString()
    })
    .eq('id', currentCompany.id);
  
  if (!error) {
    toast.success('Branding updated!');
    await applyBranding(); // Refresh UI
  }
}
```

---

## 📋 **PHASE 7: Email Templates - White-Label**

### 7.1 Update Email Service
**Modify `supabase/functions/send-automated-email/index.ts`:**
```typescript
// Load company branding
const { data: company } = await supabase
  .from('company_profiles')
  .select('company_display_name, logo_url, primary_color')
  .eq('id', invoice.created_by)
  .single();

// Use in email template
const html = createEmailTemplate({
  companyName: company.company_display_name,
  companyLogo: company.logo_url,
  primaryColor: company.primary_color,
  platformName: 'handl.it',
  // ... rest of template
});
```

### 7.2 Update All Email Templates
- Invoice emails
- Payment confirmations
- Job assignments
- Booking confirmations
- All use company branding

---

## 📋 **PHASE 8: PDF Generation - White-Label**

### 8.1 Update Invoice PDFs
**If using PDF generation:**
- Use company logo
- Use company colors
- Use company name
- Show "Powered by handl.it" in footer

---

## 📋 **PHASE 9: Subdomain/Domain Support (Optional)**

### 9.1 Subdomain Routing
**For future:**
- `nfg.handl.it` → NFG tenant
- `company2.handl.it` → Company 2 tenant
- Custom domains: `app.company.com` → Company tenant

**Implementation:**
- Check subdomain on login
- Route to correct tenant
- Store in company_profiles.subdomain

---

## 📋 **PHASE 10: Testing & Validation**

### 10.1 Multi-Tenant Testing
- [ ] Create second test company
- [ ] Verify data isolation
- [ ] Test branding changes
- [ ] Test all features with different tenants
- [ ] Verify RLS policies work

### 10.2 NFG Migration Testing
- [ ] Verify NFG data intact
- [ ] Verify NFG branding works
- [ ] Test all NFG features
- [ ] Verify no data loss

---

## 🗂️ **FILE STRUCTURE CHANGES**

### New Files:
```
js/
  - branding.js (branding utilities)
  - tenant-context.js (tenant management)
  
sql/
  - MIGRATE_TO_MULTI_TENANT.sql
  - ADD_WHITE_LABEL_FIELDS.sql
  
docs/
  - MULTI_TENANCY_GUIDE.md
```

### Files to Update:
- All HTML files (branding, titles)
- All JS files (add tenant filtering)
- Email templates (white-label)
- PDF templates (white-label)
- Settings page (branding management)

---

## ⚠️ **CRITICAL CONSIDERATIONS**

### Data Isolation
- **MUST** ensure RLS policies prevent cross-tenant data access
- **MUST** verify all queries filter by tenant
- **MUST** test with multiple tenants

### Performance
- Add indexes on `company_id` columns
- Consider tenant-based caching
- Monitor query performance

### Security
- Never expose tenant IDs in URLs (use subdomain or session)
- Validate tenant access on every request
- Audit tenant isolation regularly

### Migration Safety
- Backup everything first
- Test migration on staging
- Have rollback plan
- Migrate during low-traffic period

---

## 📅 **ESTIMATED TIMELINE**

- **Phase 1-2:** Database & Branding (4-6 hours)
- **Phase 3:** Migration (2-3 hours)
- **Phase 4:** Authentication (2-3 hours)
- **Phase 5:** UI Updates (4-6 hours)
- **Phase 6:** Settings (2-3 hours)
- **Phase 7-8:** Email/PDF (2-3 hours)
- **Phase 9:** Subdomain (optional, 3-4 hours)
- **Phase 10:** Testing (3-4 hours)

**Total: 22-32 hours** (3-4 days of focused work)

---

## 🚀 **RECOMMENDED APPROACH**

### Week 1: Foundation
1. Database schema updates
2. Branding system
3. NFG migration

### Week 2: Implementation
4. Authentication updates
5. UI branding
6. Settings page

### Week 3: Polish & Testing
7. Email/PDF updates
8. Comprehensive testing
9. Bug fixes

---

## ✅ **SUCCESS CRITERIA**

- [ ] NFG data migrated successfully
- [ ] NFG branding works correctly
- [ ] Can create new tenant
- [ ] Data isolation verified
- [ ] All features work with branding
- [ ] Email templates use branding
- [ ] Settings page allows branding updates
- [ ] No data loss or corruption
- [ ] Performance acceptable
- [ ] Security verified

---

## 🎯 **READY TO START?**

This is a major refactor. I recommend:
1. **Start with Phase 1** (Database schema)
2. **Test thoroughly** before moving on
3. **Migrate NFG data** carefully
4. **Iterate** on branding system

**Want me to start with Phase 1?** 🚀

