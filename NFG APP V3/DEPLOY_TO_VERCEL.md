# 🚀 Deploy NFG App to Vercel

## Step 1: Prepare Your Project (2 minutes)

### Create necessary config files:

**1. Create `.gitignore` file:**

```bash
# In your project root, create .gitignore
cat > .gitignore << 'EOF'
# Node modules
node_modules/

# Environment variables (IMPORTANT - don't commit secrets!)
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# Editor files
.vscode/
.idea/

# Logs
*.log
npm-debug.log*

# Build output
dist/
build/

# Supabase local files
.supabase/
EOF
```

**2. Create `vercel.json` for configuration:**

```bash
cat > vercel.json << 'EOF'
{
  "buildCommand": "echo 'No build needed - static site'",
  "outputDirectory": ".",
  "installCommand": "echo 'No install needed'",
  "framework": null,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
EOF
```

---

## Step 2: Initialize Git Repository (1 minute)

```bash
# Navigate to your project
cd "/Users/malikcampbell/NFG APP V3"

# Initialize Git (if not already done)
git init

# Add all files
git add .

# Make your first commit
git commit -m "Initial commit - NFG Facilities App"
```

---

## Step 3: Push to GitHub (3 minutes)

### Option A: Create New Repository on GitHub Website

1. Go to https://github.com/new
2. Repository name: `nfg-facilities-app` (or your choice)
3. Description: "Northern Facilities Group Management System"
4. Keep it **Private** (recommended for business app)
5. **DON'T** initialize with README (you already have code)
6. Click "Create repository"

### Option B: Or use GitHub CLI (if you have it)

```bash
# Login to GitHub
gh auth login

# Create repository
gh repo create nfg-facilities-app --private --source=. --remote=origin

# Push to GitHub
git push -u origin main
```

### If using website method, run these commands:

```bash
# Add GitHub as remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/nfg-facilities-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 4: Deploy to Vercel (3 minutes)

### 1. Go to Vercel

- Visit https://vercel.com
- Click **"Sign Up"** or **"Login"**
- Choose **"Continue with GitHub"**

### 2. Import Project

- Click **"Add New..."** → **"Project"**
- Find your `nfg-facilities-app` repository
- Click **"Import"**

### 3. Configure Project

**Framework Preset:** Select **"Other"** (it's a static HTML site)

**Root Directory:** Leave as `.` (root)

**Build Command:** Leave empty or use `echo "Static site"`

**Output Directory:** Leave as `.` (root)

**Install Command:** Leave empty

### 4. Deploy!

- Click **"Deploy"**
- Wait 30-60 seconds
- Get your live URL: `https://nfg-facilities-app.vercel.app`

---

## Step 5: Update Supabase Settings (IMPORTANT!)

### Add Your Production Domain to Supabase

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication → URL Configuration**
4. Add your Vercel URL to **Site URL**:
   ```
   https://your-app-name.vercel.app
   ```

5. Add to **Redirect URLs**:
   ```
   https://your-app-name.vercel.app
   https://your-app-name.vercel.app/*
   https://your-app-name.vercel.app/accept-invitation.html
   ```

6. Click **"Save"**

---

## Step 6: Test Everything (5 minutes)

### 1. Visit Your Live Site
```
https://your-app-name.vercel.app
```

### 2. Test Login
- Try logging in with your account
- Should work immediately

### 3. Test Invitations
- Go to Settings → User Management
- Send an invitation
- **The email link will now use your Vercel domain!** ✅
- Your partner can actually access it!

---

## 🎯 Future Updates (Super Easy!)

### Every time you make changes:

```bash
# 1. Save your changes
git add .
git commit -m "Description of what you changed"

# 2. Push to GitHub
git push

# 3. Vercel auto-deploys! (takes ~30 seconds)
```

**That's it!** Vercel automatically detects the push and deploys the new version.

---

## 🔒 Security Checklist

### ✅ Before You Deploy:

- [ ] **`.gitignore` created** (don't commit secrets!)
- [ ] **No API keys in code** (they're in Supabase already)
- [ ] **Supabase RLS enabled** on sensitive tables
- [ ] **GitHub repo is Private** (for business app)

### ✅ After Deployment:

- [ ] **Test login on live site**
- [ ] **Update Supabase redirect URLs**
- [ ] **Send test invitation** (verify link works)
- [ ] **Test on mobile device**

---

## 🌐 Custom Domain (Optional)

Want `app.northernfacilities.com` instead of Vercel subdomain?

### In Vercel:

1. Go to your project **Settings → Domains**
2. Add your custom domain
3. Follow DNS instructions (add CNAME record)

### In Supabase:

1. Update **Site URL** and **Redirect URLs** to use your custom domain

---

## 📊 Vercel Features You Get (Free!)

- ✅ **Automatic HTTPS** (SSL certificate)
- ✅ **Global CDN** (fast worldwide)
- ✅ **Auto-deploy on push** (CI/CD)
- ✅ **Preview deployments** for branches
- ✅ **Analytics** (see usage stats)
- ✅ **99.99% uptime**

---

## 🐛 Troubleshooting

### "Permission denied" when pushing to GitHub?

```bash
# Use SSH key or GitHub token
gh auth login
# Or use personal access token
```

### Vercel build failing?

- Make sure `vercel.json` is in root directory
- Check Vercel deployment logs for errors

### Invitations still showing localhost?

- Clear browser cache
- Check Supabase Site URL is updated
- Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

### Can't log in on live site?

- Verify Supabase redirect URLs include Vercel domain
- Check browser console for errors
- Ensure Supabase project is not paused

---

## 📝 Quick Command Reference

```bash
# Initial setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main

# Future updates
git add .
git commit -m "Your change description"
git push

# Check status
git status

# View commit history
git log --oneline

# Create new branch for testing
git checkout -b feature-name
```

---

## 🎉 You're Done!

Your NFG app is now live at: `https://your-app-name.vercel.app`

**Next time you make changes:**
1. Edit files locally
2. `git add . && git commit -m "Update" && git push`
3. Wait 30 seconds
4. Refresh your live site - changes are live!

**Your business partner can now:**
- Access invitation links (no more localhost error!)
- Use the app from anywhere
- Bookmark the real URL

---

## 💡 Pro Tips

### 1. Use Branches for Testing
```bash
git checkout -b test-feature
# Make changes
git push origin test-feature
# Vercel creates preview URL for this branch!
```

### 2. Protect Main Branch
- Only push working code to `main`
- Test in development branches first
- Main branch = live production site

### 3. Environment Variables (if needed later)
- Vercel Dashboard → Project Settings → Environment Variables
- Add production-specific configs

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **GitHub Docs**: https://docs.github.com
- **Supabase Docs**: https://supabase.com/docs

Your app is production-ready! 🚀

