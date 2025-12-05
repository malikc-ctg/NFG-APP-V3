# 💎 White-Label Pricing Model

## 🎯 **WHITE-LABEL = PREMIUM FEATURE**

White-labeling is **NOT** standard - it's a premium feature that companies pay extra for.

---

## 📊 **SUBSCRIPTION TIERS**

### **FREE/BASIC Tier** (Default)
- ✅ Full platform access
- ✅ All core features
- ❌ **NO white-label** - Uses handl.it branding
- ✅ handl.it logo on pages
- ✅ handl.it colors
- ✅ "Powered by handl.it" branding visible

### **PREMIUM Tier** (Paid)
- ✅ Everything in Basic
- ✅ **White-label enabled**
- ✅ Custom logo
- ✅ Custom colors
- ✅ Custom company name displayed
- ✅ "Powered by handl.it" in small footer only

### **ENTERPRISE Tier** (Higher Paid)
- ✅ Everything in Premium
- ✅ Custom domain (app.yourcompany.com)
- ✅ Full white-label (minimal platform branding)
- ✅ Priority support

---

## 🔧 **HOW IT WORKS**

### Default Behavior (Basic Tier):
```javascript
// Company without white-label
const branding = {
  name: 'handl.it',  // Platform name
  logo: '/handl-it-logo.png',  // Platform logo
  colors: {
    primary: '#0D47A1',  // handl.it brand color
    secondary: '#0A3A84'
  },
  showPlatformBranding: true  // "Powered by handl.it" visible
}
```

### Premium Behavior (White-Label Enabled):
```javascript
// Company with white-label
const branding = {
  name: 'Northern Facilities Group',  // Company name
  logo: company.logo_url,  // Company logo
  colors: {
    primary: company.primary_color,  // Company colors
    secondary: company.secondary_color
  },
  showPlatformBranding: false  // Only small footer
}
```

---

## 💰 **PRICING STRUCTURE**

### Basic Plan: $X/month
- All features
- handl.it branding
- Perfect for most companies

### Premium Plan: $X/month
- Everything in Basic
- **+ White-label** ($Y extra)
- Custom branding
- For companies that need their own brand

### Enterprise Plan: $X/month
- Everything in Premium
- Custom domain
- Full white-label
- Priority support

---

## 🔐 **FEATURE FLAG**

```sql
-- In company_profiles table
white_label_enabled BOOLEAN DEFAULT false  -- Premium feature
subscription_tier TEXT DEFAULT 'basic'     -- free, basic, premium, enterprise
```

**Logic:**
- If `white_label_enabled = false` → Use handl.it branding
- If `white_label_enabled = true` → Use company branding

---

## 🎨 **VISUAL DIFFERENCES**

### Basic Tier (handl.it Branding):
- Logo: handl.it logo everywhere
- Colors: handl.it blue (#0D47A1)
- Footer: "© 2025 handl.it - All rights reserved"
- Email: "handl.it" in email templates
- Visible platform branding

### Premium Tier (White-Label):
- Logo: Company's logo
- Colors: Company's brand colors
- Footer: "© 2025 [Company Name]. Powered by handl.it"
- Email: Company branding with small handl.it attribution
- Minimal platform branding

---

## ✅ **NFG SETUP**

NFG will be set as:
- `subscription_tier = 'premium'`
- `white_label_enabled = true`
- Full white-label branding
- Custom logo and colors

---

## 🚀 **IMPLEMENTATION**

The code checks:
```javascript
if (company.white_label_enabled) {
  // Use company branding
  logo = company.logo_url;
  colors = company.primary_color;
  name = company.company_display_name;
} else {
  // Use handl.it branding (default)
  logo = '/handl-it-logo.png';
  colors = '#0D47A1';
  name = 'handl.it';
}
```

---

**Key Point:** White-label is a **paid upgrade**, not standard. Most companies use handl.it branding unless they pay for white-label!

