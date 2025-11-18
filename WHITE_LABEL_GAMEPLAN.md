# 🎨 White-Label Capability - Implementation & Pricing Plan

## 📋 What is White-Labeling?

White-labeling allows your customers to **rebrand your app as their own** - removing your branding (NFG) and replacing it with their company name, logo, colors, and domain. This is **essential for enterprise customers** who want to resell or rebrand your platform.

---

## 🎯 White-Label Features to Implement

### **Tier 1: Basic White-Label** ($99/month add-on)

#### ✅ **1. Custom Branding**
- **Custom Logo Upload**
  - Replace NFG logo in sidebar, header, favicon
  - Support PNG/SVG formats
  - Multiple sizes (favicon, sidebar, email headers)
  
- **Custom App Name**
  - Change "NFG" to their company name
  - Update page titles (e.g., "Acme Corp — Dashboard")
  - Update PWA name and manifest

- **Custom Color Scheme**
  - Replace NFG blue (#0D47A1) with their brand color
  - Update all buttons, links, accents
  - Support primary, secondary, accent colors
  - Dark mode color customization

- **Custom Tagline**
  - Replace "WHERE OPERATIONS MEET INNOVATION"
  - Customizable company tagline

**Implementation:**
- Add `organizations` table with `logo_url`, `brand_color`, `app_name`, `tagline`
- Create branding config API/function
- Update all HTML pages to use dynamic branding
- CSS variables for colors (e.g., `--brand-primary`, `--brand-secondary`)

**Files to Modify:**
- All HTML files (title tags, logo img src)
- `manifest.json` (name, icons)
- CSS files (color variables)
- JavaScript (dynamic logo loading)

---

#### ✅ **2. Custom Domain**
- **Subdomain Setup** (Basic)
  - `app.theirdomain.com` instead of `nfgone.ca`
  - DNS configuration support
  - SSL certificate (automatic via Vercel/Cloudflare)

**Implementation:**
- Multi-tenant routing (check subdomain, load org config)
- DNS verification in settings
- Domain mapping in database

**Complexity:** Medium (requires DNS setup guide)

---

#### ✅ **3. Remove Vendor Branding**
- **Remove "NFG" references**
  - Remove "Northern Facilities Group" text
  - Remove "Powered by NFG" footers
  - Remove NFG logo watermarks
  
- **Replace with Custom Branding**
  - Their company name in all places
  - Their logo in all places
  - Their branding in emails

**Implementation:**
- Search/replace all hardcoded "NFG" references
- Make branding dynamic based on `organization_id`
- Update email templates

**Files to Modify:**
- All HTML files
- Email templates (invitation, PO, expense)
- PDF generators (invoices)
- Notification messages

---

#### ✅ **4. Custom Email Domain**
- **Custom "From" Address**
  - `support@theirdomain.com` instead of `noreply@nfgone.ca`
  - Email verification/SPF records guide

**Implementation:**
- Store custom email domain in `organizations` table
- Update Edge Functions to use custom domain
- Email verification workflow

**Complexity:** Medium (requires email domain setup)

---

### **Tier 2: Advanced White-Label** ($149/month add-on)

Includes everything in Tier 1, plus:

#### ✅ **5. Custom Landing Pages**
- **Custom Login/Signup Pages**
  - Custom welcome messages
  - Custom help text
  - Custom images/backgrounds
  
- **Custom Onboarding Flow**
  - Custom welcome screens
  - Custom tutorial content
  - Custom help documentation links

**Implementation:**
- Organization-specific page templates
- Dynamic content loading
- Custom CSS injection per org

---

#### ✅ **6. Custom Email Templates**
- **Full Email Customization**
  - Custom invitation emails (their branding)
  - Custom invoice emails
  - Custom notification emails
  - Custom PO emails
  - Custom expense emails

**Implementation:**
- Template system in Edge Functions
- HTML template storage per organization
- Dynamic template rendering

---

#### ✅ **7. Custom PDF Branding**
- **Invoice PDFs**
  - Their logo on invoices
  - Their company name/address
  - Their colors
  
- **Purchase Order PDFs**
  - Their branding on POs
  - Their letterhead

**Implementation:**
- Dynamic PDF generation with org branding
- Custom header/footer per org
- Logo embedding in PDFs

---

#### ✅ **8. Custom Support Email**
- **Support Email Address**
  - `support@theirdomain.com`
  - Email forwarding setup

**Implementation:**
- Store support email in `organizations`
- Update contact forms/help links
- Email routing (if needed)

---

### **Tier 3: Enterprise White-Label** ($199/month add-on)

Includes everything in Tier 2, plus:

#### ✅ **9. White-Label Mobile Apps** (Future)
- **Native iOS/Android Apps**
  - Their app name in App Store
  - Their logo/icon
  - Their splash screen
  - Their branding throughout

**Implementation:**
- React Native or Flutter app
- Dynamic branding build
- App Store submission support

**Complexity:** Very High (separate project)

---

#### ✅ **10. Custom Help Documentation**
- **Help Center Customization**
  - Custom help docs (their domain)
  - Custom FAQ
  - Custom video tutorials
  - Custom knowledge base

**Implementation:**
- Subdomain for help (help.theirdomain.com)
- CMS for documentation
- Custom branding throughout

---

#### ✅ **11. Custom Domain (Full)**
- **Full Domain Setup**
  - `app.theirdomain.com` (custom subdomain)
  - Custom email domain fully integrated
  - SSL management

**Implementation:**
- Multi-tenant routing at domain level
- DNS management interface
- SSL certificate automation

---

#### ✅ **12. API White-Labeling**
- **Custom API Documentation**
  - Their branding on API docs
  - Custom domain for API docs
  - Custom developer portal

**Implementation:**
- Branded API documentation site
- Custom API endpoints (if needed)

---

## 🗄️ Database Schema Changes

### **Add to `organizations` table:**

```sql
-- White-label settings
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS white_label_enabled BOOLEAN DEFAULT FALSE;

-- Branding
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS app_name TEXT DEFAULT 'NFG';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Colors
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT '#0D47A1';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_accent_color TEXT;

-- Domain
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_email_domain TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT FALSE;

-- Email
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS support_email TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS from_email TEXT;

-- Advanced
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_css TEXT; -- For custom styling
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_js TEXT; -- For custom scripts
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS remove_vendor_branding BOOLEAN DEFAULT FALSE;
```

---

## 💰 Pricing Recommendations

### **Market Analysis:**

**Competitor White-Label Pricing:**
- **ServiceTitan:** Custom pricing (typically $500+/month)
- **FieldPulse:** $99/month add-on
- **Jobber:** $199/month add-on
- **Housecall Pro:** $149/month add-on
- **JobNimbus:** $99/month add-on

**Industry Standard:** $99-$199/month add-on

---

### **Recommended Pricing:**

#### **Option 1: Single Tier** ⭐ (RECOMMENDED)

**White-Label Add-On: $149/month**

**Includes:**
- ✅ Custom logo, colors, app name
- ✅ Custom domain (subdomain)
- ✅ Remove vendor branding
- ✅ Custom email domain
- ✅ Custom email templates
- ✅ Custom PDF branding
- ✅ Custom support email
- ✅ Custom landing pages

**Why $149/month:**
- ✅ Competitive with market
- ✅ Covers development costs
- ✅ Premium feature pricing
- ✅ Enterprise customers can afford it
- ✅ Good profit margin

---

#### **Option 2: Tiered White-Label**

**Basic White-Label: $99/month**
- ✅ Custom logo, colors, app name
- ✅ Remove vendor branding
- ✅ Basic email customization

**Professional White-Label: $149/month** ⭐ (RECOMMENDED)
- ✅ Everything in Basic
- ✅ Custom domain
- ✅ Full email customization
- ✅ Custom PDF branding
- ✅ Custom landing pages

**Enterprise White-Label: $199/month**
- ✅ Everything in Professional
- ✅ Custom help documentation
- ✅ Full domain setup
- ✅ API white-labeling
- ✅ Priority support

---

#### **Option 3: Annual Plans**

**White-Label (Annual):**
- Basic: $89/month ($1,068/year) - 10% discount
- Professional: $139/month ($1,668/year) - 7% discount
- Enterprise: $179/month ($2,148/year) - 10% discount

**One-Time Setup Fee:**
- Basic: $199 setup
- Professional: $499 setup
- Enterprise: $999 setup

**Why Setup Fees:**
- ✅ Covers initial configuration time
- ✅ Ensures serious customers
- ✅ Offsets support costs

---

## 📊 Revenue Projections

### **Year 1 (50 customers with white-label):**

**Scenario A: 10% adoption rate (5 customers)**
- 5 × $149/month = **$745/month = $8,940/year**

**Scenario B: 20% adoption rate (10 customers)**
- 10 × $149/month = **$1,490/month = $17,880/year**

**Scenario C: 30% adoption rate (15 customers)**
- 15 × $149/month = **$2,235/month = $26,820/year**

**With Setup Fees:**
- 15 × $499 setup = **$7,485 one-time**
- 15 × $149/month = **$26,820/year**
- **Total Year 1: $34,305**

---

## 🎯 Implementation Priority

### **Phase 1: Basic Branding (2-3 weeks)**

1. **Database Schema** (1 day)
   - Add white-label columns to `organizations` table
   
2. **Branding API** (3-5 days)
   - Create function to fetch org branding
   - Store logos in Supabase Storage
   - Update color scheme dynamically

3. **Frontend Updates** (5-7 days)
   - Replace hardcoded logos with dynamic
   - Replace hardcoded colors with CSS variables
   - Update page titles dynamically
   - Update manifest.json dynamically

4. **Email Templates** (3-5 days)
   - Update invitation email template
   - Update PO email template
   - Update expense email template
   - Make all emails use org branding

**Total: ~2-3 weeks**

---

### **Phase 2: Domain & Advanced (2-3 weeks)**

5. **Custom Domain** (5-7 days)
   - Multi-tenant routing by subdomain
   - DNS verification
   - Domain mapping

6. **Custom PDFs** (3-5 days)
   - Update invoice PDF generator
   - Update PO PDF generator
   - Add org branding to PDFs

7. **Custom Landing Pages** (5-7 days)
   - Dynamic login/signup pages
   - Custom onboarding content
   - Help documentation links

**Total: ~2-3 weeks**

---

### **Phase 3: Enterprise Features (4-6 weeks)**

8. **Help Documentation** (2-3 weeks)
   - Custom help center
   - CMS for docs
   - Custom domain for help

9. **API White-Labeling** (1-2 weeks)
   - Branded API docs
   - Custom developer portal

10. **Mobile Apps** (Future - separate project)
    - React Native app
    - Dynamic branding builds

**Total: ~4-6 weeks**

---

## 📋 Files to Modify

### **Database:**
- `ADD_WHITE_LABEL_COLUMNS.sql` (new)

### **JavaScript:**
- `js/branding.js` (new) - Branding config loader
- All page JS files - Use branding config
- `js/ui.js` - Logo/color updates
- `js/notifications.js` - Branded notifications

### **HTML:**
- All HTML files - Dynamic titles, logos
- `manifest.json` - Dynamic manifest generation

### **Email Templates:**
- `supabase/functions/send-invitation-email/index.ts`
- `supabase/functions/send-purchase-order-email/index.ts`
- `supabase/functions/send-expense-receipt-email/index.ts`

### **PDF Generators:**
- `js/invoice-pdf.js` (in reports.html)
- `js/po-pdf.js` (in inventory.js)

### **CSS:**
- `css/branding.css` (new) - Dynamic color variables
- Update all CSS files to use CSS variables

---

## 🎨 Branding Configuration UI

### **Settings Page → White-Label Section:**

```html
<!-- White-Label Settings -->
<div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-6">
  <h3>White-Label Branding</h3>
  
  <!-- Enable White-Label -->
  <label>
    <input type="checkbox" id="white-label-enabled">
    Enable White-Label Branding
  </label>
  
  <!-- Logo Upload -->
  <div>
    <label>Company Logo</label>
    <input type="file" accept="image/png,image/svg+xml">
    <button>Upload Logo</button>
  </div>
  
  <!-- App Name -->
  <div>
    <label>App Name</label>
    <input type="text" id="app-name" placeholder="Your Company Name">
  </div>
  
  <!-- Company Name -->
  <div>
    <label>Company Name</label>
    <input type="text" id="company-name">
  </div>
  
  <!-- Tagline -->
  <div>
    <label>Tagline</label>
    <input type="text" id="tagline">
  </div>
  
  <!-- Colors -->
  <div>
    <label>Primary Brand Color</label>
    <input type="color" id="brand-primary-color" value="#0D47A1">
  </div>
  
  <!-- Custom Domain -->
  <div>
    <label>Custom Domain (e.g., app.yourcompany.com)</label>
    <input type="text" id="custom-domain">
    <button>Verify Domain</button>
  </div>
  
  <!-- Email Domain -->
  <div>
    <label>Custom Email Domain (e.g., yourcompany.com)</label>
    <input type="text" id="custom-email-domain">
  </div>
  
  <!-- Support Email -->
  <div>
    <label>Support Email</label>
    <input type="email" id="support-email">
  </div>
  
  <!-- Remove Vendor Branding -->
  <label>
    <input type="checkbox" id="remove-vendor-branding">
    Remove "Powered by NFG" branding
  </label>
  
  <button>Save White-Label Settings</button>
</div>
```

---

## 💰 Final Pricing Recommendation

### **Single Tier Approach:** ⭐ (RECOMMENDED)

**White-Label Add-On: $149/month**

**Includes:**
- ✅ All branding customization
- ✅ Custom domain setup
- ✅ Email customization
- ✅ PDF customization
- ✅ Landing page customization

**One-Time Setup Fee: $499**

**Total First Year:** $499 + ($149 × 12) = **$2,287**

**Why This Pricing:**
- ✅ **Competitive** - In line with market ($99-$199)
- ✅ **Profitable** - Covers dev + support costs
- ✅ **Accessible** - Enterprise customers can afford
- ✅ **Simple** - One tier, easy to sell

---

### **Alternative: Tiered Approach**

**Basic: $99/month** (+ $199 setup)
- Logo, colors, app name, remove branding

**Professional: $149/month** (+ $499 setup) ⭐
- Everything + domain + email + PDFs

**Enterprise: $199/month** (+ $999 setup)
- Everything + help docs + API + mobile apps

---

## 📈 Value Proposition

### **For Your Customers:**
- ✅ **Resell Your Platform** - White-label allows them to sell as their own
- ✅ **Professional Branding** - Their customers see their brand, not yours
- ✅ **Custom Domain** - `app.theirdomain.com` looks professional
- ✅ **Enterprise Ready** - Required for large enterprise deals

### **For You:**
- ✅ **Higher Revenue** - $149/month × 10 customers = $17,880/year
- ✅ **Higher Retention** - White-label customers are more locked-in
- ✅ **Enterprise Sales** - Enables large enterprise deals
- ✅ **Competitive Edge** - Not all competitors offer this

---

## 🎯 My Recommendation

### **Price it at: $149/month + $499 setup fee**

**Rationale:**
1. **Competitive** - Right in the middle of market range
2. **Profitable** - Covers costs with good margin
3. **Accessible** - Enterprise customers expect this price
4. **Simple** - One tier, easy to understand and sell
5. **Value Match** - Feature set justifies price

### **Annual Plans:**
- **Annual:** $139/month ($1,668/year) - 7% discount
- **2-Year:** $129/month ($1,548/year) - 13% discount

### **Setup Fee:**
- **One-Time:** $499 (covers configuration time)
- **Waived:** For annual/2-year plans

---

## 🚀 Quick Win Pricing Strategy

### **Launch Offer (First 10 customers):**
- **$99/month** + **$299 setup** (33% off)
- **Limited time:** First 10 white-label customers
- **Lock in:** Early adopter pricing

**Why:**
- ✅ Get initial customers quickly
- ✅ Build case studies
- ✅ Test the feature
- ✅ Generate revenue

---

## 📋 Summary

**What to Add:**
1. ✅ Custom logo, colors, app name
2. ✅ Custom domain (subdomain)
3. ✅ Remove vendor branding
4. ✅ Custom email domain/templates
5. ✅ Custom PDF branding
6. ✅ Custom landing pages
7. ✅ Custom support email

**How Much to Charge:**
- **Monthly:** $149/month ⭐ (RECOMMENDED)
- **Setup Fee:** $499 one-time
- **Annual:** $139/month ($1,668/year)

**Implementation Time:**
- **Phase 1 (Basic):** 2-3 weeks
- **Phase 2 (Advanced):** 2-3 weeks
- **Phase 3 (Enterprise):** 4-6 weeks

**Revenue Potential:**
- **Year 1 (10 customers):** $17,880/year
- **Year 1 (20 customers):** $35,760/year
- **Year 1 (30 customers):** $53,640/year

---

**This is a HIGH-VALUE feature that enterprise customers will pay for!** 💰

