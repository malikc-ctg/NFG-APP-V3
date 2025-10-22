# ⚡ Quick Start: Zoho Email Setup

Get automatic email invitations working in 5 minutes!

---

## 🎯 What You Need

Before starting, get these from your Zoho account:
1. **Client ID** and **Client Secret** from https://api-console.zoho.com/
2. **Refresh Token** (we'll help you generate this)
3. Your **Zoho email address**

---

## 🚀 Super Quick Setup (5 minutes)

### Option 1: Automated Script (Recommended)

```bash
# 1. Make sure you're in the project directory
cd "/Users/malikcampbell/NFG APP V3"

# 2. Login to Supabase
supabase login

# 3. Link your project (get your project ref from Supabase dashboard)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Run the setup script
./setup-zoho-email.sh
```

The script will ask for your Zoho credentials and set everything up automatically!

---

### Option 2: Manual Setup

If you prefer to do it manually, follow the detailed guide in `ZOHO_EMAIL_SETUP.md`

---

## 📝 Step-by-Step: Get Zoho Credentials

### 1. Create API Client (2 minutes)

1. Go to https://api-console.zoho.com/
2. Click "Add Client" → "Server-based Applications"
3. Enter:
   - **Client Name**: NFG Facilities
   - **Homepage URL**: http://localhost:5500
   - **Redirect URI**: http://localhost:5500/callback
4. Click "Create"
5. **Save your Client ID and Client Secret**

### 2. Generate Refresh Token (2 minutes)

**Step A:** Get Authorization Code

Open this URL (replace `YOUR_CLIENT_ID`):
```
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.messages.CREATE,ZohoMail.accounts.READ&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:5500/callback
```

You'll be redirected to a URL with a `code` parameter - **copy that code**!

**Step B:** Get Refresh Token

Run this in Terminal (replace YOUR_CODE, YOUR_CLIENT_ID, YOUR_CLIENT_SECRET):
```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "code=YOUR_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:5500/callback" \
  -d "grant_type=authorization_code"
```

**Copy the `refresh_token` from the response!**

### 3. Deploy to Supabase (1 minute)

```bash
# Set credentials
supabase secrets set ZOHO_CLIENT_ID=your_client_id
supabase secrets set ZOHO_CLIENT_SECRET=your_secret
supabase secrets set ZOHO_REFRESH_TOKEN=your_token
supabase secrets set ZOHO_FROM_EMAIL=your@email.com

# Deploy
supabase functions deploy send-invitation-email
```

---

## ✅ Test It!

1. Open your NFG app: http://127.0.0.1:5500/settings.html
2. Go to **Settings → User Management**
3. Click **"Invite User"**
4. Enter an email and role
5. Click **Send**

🎉 **Email sent automatically via Zoho!**

---

## 🔍 Troubleshooting

### "Supabase CLI not found"
```bash
npm install -g supabase
```

### "Not logged in to Supabase"
```bash
supabase login
```

### "Project not linked"
```bash
supabase link --project-ref YOUR_PROJECT_REF
```
(Get project ref from your Supabase dashboard URL)

### Check if it's working:
```bash
# View logs
supabase functions logs send-invitation-email

# List secrets
supabase secrets list
```

---

## 📧 What Happens Next?

Once setup is complete:
- ✅ Invitations send **automatically** (no popups!)
- ✅ Professional HTML emails with your branding
- ✅ Recipients get clickable invitation links
- ✅ Links expire after 7 days for security
- ✅ All sent via your Zoho account

---

## 💰 Cost

**Free!** Zoho allows ~100 emails per day on the free tier, which is perfect for most businesses.

---

## 🆘 Need Help?

1. Read the detailed guide: `ZOHO_EMAIL_SETUP.md`
2. Check Edge Function logs: `supabase functions logs send-invitation-email`
3. Verify secrets are set: `supabase secrets list`

---

## 🎨 Want to Customize the Email?

Edit: `supabase/functions/send-invitation-email/index.ts`

Look for the `emailHTML` variable and customize the design, colors, and text.

After editing, redeploy:
```bash
supabase functions deploy send-invitation-email
```

---

**Ready? Let's go!** Run `./setup-zoho-email.sh` to get started! 🚀

