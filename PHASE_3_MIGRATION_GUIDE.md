# Phase 3: Data Migration Guide

## Overview
This phase migrates existing NFG data to the multi-tenant structure, setting NFG as the first tenant with white-label enabled.

## Prerequisites
✅ **Phase 1 must be completed first!** Run `ADD_MULTI_TENANCY_SCHEMA.sql` in Supabase SQL Editor.

## Steps

### 1. Backup Your Database
**IMPORTANT:** Always backup before running migrations!

In Supabase Dashboard:
- Go to **Settings** → **Database** → **Backups**
- Create a manual backup or verify automatic backups are enabled

### 2. Run Phase 1 Schema (If Not Done)
1. Open Supabase Dashboard → **SQL Editor**
2. Copy and paste contents of `ADD_MULTI_TENANCY_SCHEMA.sql`
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. Verify success message

### 3. Run Phase 3 Migration
1. Open Supabase Dashboard → **SQL Editor**
2. Copy and paste contents of `MIGRATE_NFG_TO_TENANT.sql`
3. Click **Run** (or press Cmd/Ctrl + Enter)
4. Review the output:
   - ✅ Company data updated
   - ✅ Users linked to NFG
   - ✅ Data integrity checks

### 4. Verify Migration

Run these queries to verify:

```sql
-- Check NFG company setup
SELECT 
  id,
  company_name,
  company_display_name,
  platform_name,
  white_label_enabled,
  subscription_tier,
  logo_url
FROM company_profiles
WHERE LOWER(company_name) LIKE '%northern%facilities%group%'
   OR LOWER(company_name) LIKE '%nfg%';

-- Check user linking
SELECT 
  COUNT(*) as total_users,
  COUNT(company_id) as users_with_company,
  COUNT(*) - COUNT(company_id) as orphaned_users
FROM user_profiles;

-- Check NFG branding
SELECT 
  company_display_name,
  white_label_enabled,
  subscription_tier,
  primary_color,
  logo_url
FROM company_profiles
WHERE white_label_enabled = true;
```

### 5. Expected Results

After migration:
- ✅ NFG company has `white_label_enabled = true`
- ✅ NFG company has `subscription_tier = 'premium'`
- ✅ NFG company has `platform_name = 'handl.it'`
- ✅ NFG company has `logo_url` set to NFG logo
- ✅ All users have `company_id` linked to NFG
- ✅ NFG displays as "Northern Facilities Group" (not handl.it)

### 6. Test Branding

1. Log in to the app
2. Check sidebar logo - should show NFG logo
3. Check page title - should say "Northern Facilities Group"
4. Check footer - should say "© 2025 Northern Facilities Group. Powered by handl.it"

## Troubleshooting

### Issue: "NFG company not found"
**Solution:** Create the company first:
```sql
INSERT INTO company_profiles (company_name, company_display_name, owner_id)
VALUES ('Northern Facilities Group', 'Northern Facilities Group', 'YOUR_USER_ID')
RETURNING id;
```

### Issue: Users not linked
**Solution:** Manually link users:
```sql
UPDATE user_profiles
SET company_id = (SELECT id FROM company_profiles WHERE company_name = 'Northern Facilities Group' LIMIT 1)
WHERE company_id IS NULL;
```

### Issue: White-label not working
**Solution:** Verify the flag:
```sql
UPDATE company_profiles
SET white_label_enabled = true
WHERE company_name = 'Northern Facilities Group';
```

## Next Steps

After successful migration:
- ✅ Phase 3 Complete
- ➡️ Proceed to Phase 4: Authentication & Tenant Context

