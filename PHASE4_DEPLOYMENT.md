# Phase 4: Deployment Instructions

## 🚀 Deploy Stripe Connect OAuth Edge Function

### **Step 1: Verify Secrets Are Set**

Make sure all Stripe secrets are configured:

```bash
supabase secrets list | grep STRIPE
```

You should see:
- ✅ `STRIPE_PLATFORM_SECRET_KEY`
- ✅ `STRIPE_PLATFORM_PUBLISHABLE_KEY`
- ✅ `STRIPE_CONNECT_CLIENT_ID`

If any are missing, set them:
```bash
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="sk_test_..."
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="pk_test_..."
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_..."
```

### **Step 2: Deploy the Edge Function**

```bash
cd "/Users/malikcampbell/NFG APP V3"
supabase functions deploy stripe-connect-oauth
```

You should see:
```
✓ Deploying function stripe-connect-oauth...
✓ Function deployed successfully
Function URL: https://YOUR_PROJECT.supabase.co/functions/v1/stripe-connect-oauth
```

### **Step 3: Configure Stripe Dashboard**

1. Go to: https://dashboard.stripe.com/test/settings/applications (or live mode)
2. Under **Redirect URIs**, add:
   ```
   https://YOUR_PROJECT.supabase.co/functions/v1/stripe-connect-oauth?action=callback
   ```
   Replace `YOUR_PROJECT` with your Supabase project reference ID.

3. Save the changes

### **Step 4: Test the Connection**

1. Go to Settings → Payment Gateway
2. Select "Stripe"
3. Click "Connect Stripe Account"
4. You should be redirected to Stripe
5. Authorize the connection
6. You should be redirected back to Settings
7. Status should show "Connected"

---

## 🔍 Troubleshooting

### **Function Not Deploying**

```bash
# Check if you're logged in
supabase projects list

# If not logged in
supabase login

# Check if project is linked
supabase link --project-ref YOUR_PROJECT_REF
```

### **OAuth Callback Not Working**

1. **Check redirect URI matches exactly** in Stripe Dashboard
2. **Verify function is deployed**: Check Supabase Dashboard → Edge Functions
3. **Check function logs**:
   ```bash
   supabase functions logs stripe-connect-oauth
   ```

### **"Payment gateway not configured" Error**

- Check secrets are set: `supabase secrets list | grep STRIPE`
- Verify secrets are correct (no typos)
- Secrets must be set before deploying function

### **"Invalid or expired OAuth session"**

- OAuth sessions expire after 30 minutes
- Try connecting again
- Check `gateway_oauth_sessions` table for expired sessions

---

## 📋 Checklist

Before testing:

- [ ] All Stripe secrets are set
- [ ] Edge Function is deployed
- [ ] Redirect URI is configured in Stripe Dashboard
- [ ] Company profile exists for test user
- [ ] User has `company_id` in their profile

---

**Ready to test!** 🚀
