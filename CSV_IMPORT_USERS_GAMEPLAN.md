# 📥 CSV Import - Users/Workers (Phase 1.2)

## 🎯 Overview
Import users/workers from CSV to quickly onboard team members during client migration.

---

## ✅ What's Already Done
- ✅ CSV import infrastructure (modal, parsing, validation)
- ✅ Sites import (working)
- ✅ Jobs import (working)
- ✅ Worker lookup function exists (for jobs import)

---

## ❌ What Needs to Be Done

### **Phase 1.2.1: Add Users Field Definitions** (30 min)
- [ ] Add `users` to `FIELD_DEFINITIONS` in `csv-import.js`
- [ ] Add `users` to `COLUMN_MAPPINGS` for auto-detection
- [ ] Define required vs optional fields

### **Phase 1.2.2: User Validation Logic** (1 hour)
- [ ] Email uniqueness check
- [ ] Email format validation
- [ ] Role validation (staff, admin, client, super_admin)
- [ ] Duplicate detection (within CSV + existing users)
- [ ] Handle existing users (skip vs update option)

### **Phase 1.2.3: User Import Logic** (1.5 hours)
- [ ] Create user in Supabase Auth
- [ ] Create user_profile record
- [ ] Handle password (auto-generate or require in CSV)
- [ ] Set role and status
- [ ] Optional: Auto-send invitation emails

### **Phase 1.2.4: UI Updates** (30 min)
- [ ] Enable "Users/Workers" button in import modal
- [ ] Update template download for users
- [ ] Update success messages

---

## 📋 Field Definitions

### **Required Fields:**
- `full_name` - User's full name
- `email` - Email address (must be unique)

### **Optional Fields:**
- `role` - Default: 'staff' (staff, admin, client, super_admin)
- `phone` - Phone number
- `status` - Default: 'active' (active, inactive, suspended)
- `password` - If provided, use it; otherwise auto-generate

---

## 🔄 Import Workflow

```
1. User selects "Users/Workers" import type
2. Uploads CSV with user data
3. System validates:
   - Email format
   - Email uniqueness (check existing users)
   - Role validity
4. Preview shows:
   - Valid users (green)
   - Duplicate emails (warning - skip or update)
   - Invalid emails (error)
5. User confirms import
6. For each user:
   - Create Supabase Auth user
   - Create user_profile record
   - Set role and status
   - Optional: Send invitation email
7. Show results (successful, skipped, failed)
```

---

## 🗄️ Database Considerations

### **Tables Involved:**
- `auth.users` - Supabase Auth (created via API)
- `user_profiles` - User profile data

### **User Creation Process:**
1. Create user in Supabase Auth (requires email + password)
2. Create corresponding `user_profile` record
3. Link via `user_profiles.id = auth.users.id`

### **Password Handling:**
- **Option 1:** Auto-generate secure password, send via email
- **Option 2:** Require password in CSV (less secure)
- **Option 3:** Create users as "invited" (send invitation link)

**Recommended:** Option 3 (invitation links) - most secure

---

## 🎨 UI/UX Design

### **Import Modal Updates:**
- Enable "Users/Workers" button
- Show user-specific validation messages
- Handle duplicate email warnings
- Show invitation status

### **Validation Preview:**
- Show which users will be created
- Show which emails already exist (with option to skip)
- Show invalid emails/roles

---

## 🔒 Security Considerations

1. **Email Uniqueness** - Must check before creating
2. **Role Permissions** - Only admins can import users
3. **Password Security** - Don't store passwords in CSV
4. **Invitation Links** - Use secure tokens
5. **Rate Limiting** - Prevent bulk spam

---

## 📝 CSV Template

```csv
Full Name,Email,Role,Phone,Status
"John Doe","john@example.com","staff","(555) 123-4567","active"
"Jane Smith","jane@example.com","admin","(555) 987-6543","active"
"Bob Wilson","bob@example.com","client","(555) 111-2222","active"
```

---

## 🚀 Implementation Steps

### **Step 1: Add Field Definitions** (30 min)
```javascript
// In csv-import.js
FIELD_DEFINITIONS.users = {
  full_name: { label: 'Full Name', required: true, type: 'text' },
  email: { label: 'Email', required: true, type: 'email' },
  role: { label: 'Role', required: false, type: 'text', default: 'staff' },
  phone: { label: 'Phone', required: false, type: 'text' },
  status: { label: 'Status', required: false, type: 'text', default: 'active' }
};
```

### **Step 2: Add Column Mappings** (15 min)
```javascript
COLUMN_MAPPINGS.users = {
  'full name': 'full_name',
  'name': 'full_name',
  'email': 'email',
  'role': 'role',
  'phone': 'phone',
  'status': 'status'
};
```

### **Step 3: Add Validation** (1 hour)
- Email format check
- Email uniqueness check
- Role validation
- Duplicate detection

### **Step 4: Add Import Logic** (1.5 hours)
- Create Supabase Auth user
- Create user_profile
- Handle invitations

### **Step 5: Enable UI** (15 min)
- Enable button
- Update templates

---

## ✅ Success Criteria

- [ ] Can import users from CSV
- [ ] Validates email uniqueness
- [ ] Handles duplicate emails gracefully
- [ ] Creates users with correct roles
- [ ] Optional: Sends invitation emails
- [ ] Shows import results clearly

---

**Ready to start?** Let's begin with Step 1: Add Field Definitions! 🚀

