# 🔑 Service Role Key - Legacy Keys is Normal

## ✅ Yes, This is Normal!

Supabase moved `service_role` and `anon` keys to a "Legacy keys" section, but **they still work perfectly fine** for webhooks and Edge Functions.

## ✅ Using Legacy Keys is Fine

The `service_role` key in "Legacy keys" is:
- ✅ Still valid and functional
- ✅ Still works with webhooks
- ✅ Still works with Edge Functions
- ✅ The correct key to use

## 🔍 How to Use It:

1. **Go to:** Settings → API
2. **Find:** "Legacy keys" section
3. **Copy:** The `service_role` key (starts with `eyJ...`)
4. **Use in webhook:** `Authorization: Bearer eyJ...` (your full key)

## ⚠️ Important Notes:

- **Use `service_role` key** (NOT `anon` key)
- **Full key:** Copy the entire key (it's long, starts with `eyJ...`)
- **Bearer prefix:** In webhook header, use `Bearer YOUR_KEY_HERE` (with space after "Bearer")

## ✅ This Should Work:

The webhook should work with the legacy `service_role` key. If it's still not firing, the issue is likely:
1. Webhook URL incorrect
2. Webhook not enabled
3. Messages not being inserted into database
4. Authorization header not set correctly

---

**Go ahead and use the legacy `service_role` key - it will work!** ✅

