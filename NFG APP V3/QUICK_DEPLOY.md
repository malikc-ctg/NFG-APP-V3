# ⚡ Quick Deploy Guide (10 Minutes)

## 🎯 Goal
Get your NFG app live so your business partner can access invitation links!

---

## Option 1: Automated Script (Easiest) ⭐

### Run this command in Terminal:

```bash
cd "/Users/malikcampbell/NFG APP V3"
./deploy.sh
```

Follow the prompts - the script handles everything!

---

## Option 2: Manual Steps (5 Commands)

### Step 1: Prepare Files (1 minute)

```bash
cd "/Users/malikcampbell/NFG APP V3"

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
.DS_Store
.supabase/
EOF

# Create vercel.json
cat > vercel.json << 'EOF'
{
  "buildCommand": "echo 'Static site'",
  "outputDirectory": "."
}
EOF
```

### Step 2: Push to GitHub (2 minutes)

```bash
# Initialize Git
git init
git add .
git commit -m "Initial commit"

# Add your GitHub repo (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/nfg-app.git
git branch -M main
git push -u origin main
```

**Note:** Create the repository on GitHub first at https://github.com/new

### Step 3: Deploy to Vercel (3 minutes)

1. Go to https://vercel.com
2. Click **"Sign Up"** → **"Continue with GitHub"**
3. Click **"Add New Project"**
4. Select your `nfg-app` repository
5. Click **"Deploy"**
6. Wait 30 seconds - Done! ✅

### Step 4: Update Supabase (2 minutes)

1. Go to https://supabase.com/dashboard
2. Your project → **Authentication** → **URL Configuration**
3. **Site URL**: Add your Vercel URL (e.g., `https://nfg-app.vercel.app`)
4. **Redirect URLs**: Add:
   ```
   https://nfg-app.vercel.app/*
   https://nfg-app.vercel.app/accept-invitation.html
   ```
5. Click **"Save"**

### Step 5: Test! (2 minutes)

1. Visit your Vercel URL
2. Login to your app
3. Go to Settings → User Management
4. Send invitation to your partner
5. **Link will use your real domain!** ✅

---

## 🎉 Done!

Your app is live at: `https://your-app.vercel.app`

**Future updates are automatic:**
```bash
git add .
git commit -m "Update"
git push
# Vercel auto-deploys in 30 seconds!
```

---

## 🐛 Troubleshooting

### Can't push to GitHub?
```bash
# Login to GitHub
gh auth login
# Or use HTTPS with personal access token
```

### Vercel deployment failed?
- Check you have `vercel.json` in root folder
- View deployment logs in Vercel dashboard

### Invitation still shows localhost?
- Update Supabase Site URL (Step 4)
- Clear browser cache
- Hard refresh: Cmd+Shift+R

---

## 📖 Full Documentation

See `DEPLOY_TO_VERCEL.md` for complete details and advanced options.

---

**Need help? Check the deployment logs or reach out!** 🚀

