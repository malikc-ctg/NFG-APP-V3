# Troubleshoot: Push Notifications Not Appearing

## The Problem

- ✅ Push subscription created successfully (toast showed)
- ✅ Function returns `{"success": true, "sent": 1}`
- ❌ No notification appears on your device

## Step-by-Step Debugging

### Step 1: Test Notification Display Directly

**Run this in browser console:**

```javascript
navigator.serviceWorker.ready.then(async (registration) => {
  await registration.showNotification('Test Notification', {
    body: 'If you see this, notifications work!',
    icon: '/assets/icons/icon-192.png',
    requireInteraction: true
  });
});
```

**What to check:**
- ✅ **If you see the notification** → Notifications work, but service worker isn't receiving push events
- ❌ **If you don't see it** → Notifications are blocked or suppressed

### Step 2: Check Service Worker Logs

1. **Open Developer Tools** → **Console**
2. **Keep console open**
3. **Send a test push notification** (run the curl command)
4. **Watch for service worker logs:**
   - `[SW] Push event received!` → Service worker received the push ✅
   - `[SW] Push payload (JSON):` → Payload was parsed ✅
   - `[SW] Showing notification:` → Notification is being shown ✅
   - `[SW] ✅ Notification shown successfully` → Notification was displayed ✅

**If you don't see `[SW] Push event received!`:**
- Service worker isn't receiving push events
- Subscription might be invalid
- Browser might not be forwarding push events

### Step 3: Check Browser Notification Settings

**Chrome:**
1. Click the lock icon in the address bar
2. Check "Notifications" setting
3. Should be "Allow" (not "Block" or "Ask")

**Or:**
1. Go to `chrome://settings/content/notifications`
2. Find your site (`nfgone.ca`)
3. Make sure it's "Allowed"

### Step 4: Check OS Notification Settings

**macOS:**
1. **System Settings** → **Notifications**
2. Find your browser (Chrome/Safari)
3. Make sure notifications are **enabled**
4. Check **Do Not Disturb** is **OFF**
5. Check **Focus** mode is **OFF**

**Windows:**
1. **Settings** → **System** → **Notifications**
2. Make sure notifications are **enabled**
3. Check **Focus Assist** is **OFF**

### Step 5: Check Service Worker Status

**Run this in browser console:**

```javascript
navigator.serviceWorker.getRegistration().then(registration => {
  console.log('Service Worker:', registration ? 'Registered' : 'Not registered');
  if (registration) {
    console.log('Active:', registration.active ? 'Yes' : 'No');
    console.log('State:', registration.active?.state);
  }
});
```

**Should show:**
- Service Worker: Registered ✅
- Active: Yes ✅
- State: activated ✅

### Step 6: Verify Subscription in Database

**Run this SQL in Supabase:**

```sql
SELECT 
  id, 
  user_id, 
  LEFT(endpoint, 50) as endpoint_preview,
  created_at
FROM push_subscriptions
WHERE user_id = 'b6c70905-828b-45f8-8cd8-b5c1d281a21b';
```

**Should show:**
- 1 row with recent `created_at` timestamp ✅

### Step 7: Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-push-notification** → **Logs**
2. Send a test push notification
3. Look for:
   - `✅ Found 1 subscriptions for user` ✅
   - `✅ Push sent successfully to endpoint:` ✅
   - Any error messages ❌

### Step 8: Test with Browser DevTools

1. Open **Developer Tools** → **Application** → **Service Workers**
2. Click **"Push"** button (if available)
3. This sends a test push notification
4. See if it appears

## Common Issues and Fixes

### Issue 1: Notifications Are Suppressed

**Symptoms:**
- Test notification works, but push notifications don't appear
- Browser/OS is in Do Not Disturb or Focus mode

**Fix:**
- Turn off Do Not Disturb
- Turn off Focus mode
- Check browser notification settings

### Issue 2: Service Worker Not Receiving Push Events

**Symptoms:**
- No `[SW] Push event received!` in console
- Function returns success, but nothing happens

**Possible Causes:**
- Subscription endpoint is invalid
- Browser isn't forwarding push events
- Service worker isn't active

**Fix:**
1. Re-enable push notifications in Settings
2. Unregister and re-register service worker
3. Clear browser cache and reload

### Issue 3: Notification Permission Denied

**Symptoms:**
- `Notification.permission` returns `"denied"`

**Fix:**
1. Go to browser settings
2. Allow notifications for your site
3. Or reset notification permissions for your site

### Issue 4: Service Worker Not Active

**Symptoms:**
- Service worker shows as "installing" or "waiting"
- Not in "activated" state

**Fix:**
1. Go to **Application** → **Service Workers**
2. Click **"Unregister"**
3. Refresh the page
4. Service worker should re-register
5. Re-enable push notifications

### Issue 5: Browser Tab Must Be Open

**Symptoms:**
- Push notifications only work when tab is open
- Not working when browser is minimized/closed

**Note:** This is normal for some browsers. Push notifications should work even when the tab is closed, but the browser must be running.

**Fix:**
- Make sure browser is running (not quit)
- Tab can be closed, but browser must be open
- On mobile, browser must be running in background

## Quick Test Checklist

Run through this checklist:

- [ ] Test notification works (Step 1)
- [ ] Service worker is active (Step 5)
- [ ] Subscription exists in database (Step 6)
- [ ] Browser notifications are allowed (Step 3)
- [ ] OS notifications are enabled (Step 4)
- [ ] Do Not Disturb is OFF (Step 4)
- [ ] Function logs show "Push sent successfully" (Step 7)
- [ ] Service worker logs show "Push event received" (Step 2)

## Next Steps

1. **Run the debug script** in browser console: `debug-push-not-receiving.js`
2. **Test notification display** (Step 1)
3. **Check service worker logs** when sending push (Step 2)
4. **Verify browser/OS settings** (Steps 3-4)
5. **Check function logs** in Supabase (Step 7)

## Still Not Working?

If you've checked everything and it's still not working:

1. **Share the browser console output** when you send a push
2. **Share the service worker logs** (if any)
3. **Share the function logs** from Supabase
4. **Share what you see** when you test notification display (Step 1)

This will help identify the exact issue! 🚀

