# 🚀 Multi-Tenancy Quick Start Guide

## ⚡ Get Started in 3 Steps

### Step 1: Run Database Schema Migration (5 minutes)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and run: `ADD_MULTI_TENANCY_SCHEMA.sql`
3. Wait for "✅ Multi-tenancy schema updated successfully!"

**What this does:**
- Adds white-label fields to `company_profiles`
- Creates tenant isolation indexes
- Updates RLS policies for security

---

### Step 2: Migrate NFG Data (5 minutes)

1. Still in **Supabase SQL Editor**
2. Copy and run: `MIGRATE_NFG_TO_TENANT.sql`
3. Review the data integrity queries

**What this does:**
- Sets up NFG as first tenant
- Configures NFG branding
- Links orphaned users to NFG company

---

### Step 3: Verify Migration (2 minutes)

Run this query to verify:

```sql
SELECT 
  id,
  company_name,
  company_display_name,
  platform_name,
  primary_color,
  white_label_enabled,
  (SELECT COUNT(*) FROM user_profiles WHERE company_id = company_profiles.id) as users
FROM company_profiles;
```

You should see:
- ✅ `platform_name` = 'handl.it'
- ✅ `company_display_name` = 'Northern Facilities Group'
- ✅ `white_label_enabled` = true
- ✅ Users linked to company

---

## ✅ What's Done After Phase 1

- ✅ Database schema ready for multi-tenancy
- ✅ White-label fields added
- ✅ NFG data migrated as first tenant
- ✅ Tenant isolation security in place
- ✅ Indexes for performance

---

## 🎯 Next Steps

**Phase 2:** Platform branding system (coming next)
- Create `js/branding.js`
- Update page titles to "handl.it"
- Dynamic logo loading

**Phase 3-10:** See `MULTI_TENANCY_GAMEPLAN.md` for full roadmap

---

## ⚠️ **Important Notes**

1. **Backup First!** Export your data before running migrations
2. **Test Environment:** Consider testing on a staging database first
3. **No Data Loss:** These scripts are additive - they only add columns
4. **Safe to Run:** Uses `IF NOT EXISTS` checks throughout

---

## 🐛 Troubleshooting

### "Column already exists" errors
- ✅ This is fine - the script uses `IF NOT EXISTS` checks
- Just continue - it means the column was already added

### "Policy already exists" errors
- ✅ Normal - scripts drop and recreate policies
- This ensures clean, correct policies

### Users without company_id
- Run the migration script's orphaned user linking
- Or manually link users to NFG company

---

## 📋 Pre-Migration Checklist

- [ ] Database backup created
- [ ] Reviewed SQL scripts
- [ ] Notified team (if working in production)
- [ ] Testing database available (recommended)
- [ ] Supabase SQL Editor access

---

## 🎉 Ready!

Once Step 1 & 2 are complete, you're ready for Phase 2: Branding System!

**Let me know when you've run the migrations and I'll continue with Phase 2!** 🚀

