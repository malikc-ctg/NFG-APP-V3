# 🚧 Maintenance Mode Instructions

## 🔴 TO ENABLE MAINTENANCE MODE:

1. **The `vercel.json` file is already set up to redirect ALL traffic to `maintenance.html`**
2. Simply push to GitHub:
   ```bash
   git add vercel.json maintenance.html
   git commit -m "Enable maintenance mode"
   git push origin main
   ```
3. Wait 30-60 seconds for Vercel to deploy
4. **ALL users will now see the maintenance page!**

## ✅ TO DISABLE MAINTENANCE MODE:

1. **Delete or rename `vercel.json`:**
   ```bash
   git rm vercel.json
   git commit -m "Disable maintenance mode"
   git push origin main
   ```
   
   OR just rename it:
   ```bash
   mv vercel.json vercel.json.disabled
   git add vercel.json vercel.json.disabled
   git commit -m "Disable maintenance mode"
   git push origin main
   ```

2. Wait 30-60 seconds for Vercel to deploy
3. **App is back online!**

---

## 📋 RECOMMENDED WORKFLOW FOR YOUR CURRENT ISSUE:

1. ✅ **Enable maintenance mode** (push vercel.json)
2. ✅ **Run the SQL migration** in Supabase
3. ✅ **Test with a new account** to verify multi-tenancy works
4. ✅ **Disable maintenance mode** (remove vercel.json)
5. ✅ **Notify users** that the app is back online

---

## ⚡ QUICK COMMANDS:

### Enable Maintenance:
```bash
git add vercel.json maintenance.html MAINTENANCE_MODE_INSTRUCTIONS.md
git commit -m "🚧 Enable maintenance mode for security updates"
git push origin main
```

### Disable Maintenance:
```bash
git rm vercel.json
git commit -m "✅ Disable maintenance mode - app is back online"
git push origin main
```

---

## 🎨 CUSTOMIZATION:

To change the maintenance message, edit `maintenance.html` and update:
- The title
- The message text
- The estimated completion time
- The contact email

The page will auto-refresh every 30 seconds, so users don't need to manually refresh.

