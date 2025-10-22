# View Site Button Troubleshooting Guide

## 🔍 Problem: "View Site" buttons not clickable

### Quick Fix Steps:

## Step 1: Open Browser Console
1. Open your browser (Chrome, Safari, Firefox)
2. Press **F12** or **Right-click → Inspect** to open Developer Tools
3. Click on the **Console** tab
4. Keep it open while testing

## Step 2: Refresh the Page
1. Go to the **Sites** or **Dashboard** page
2. Press **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac) for a hard refresh
3. Watch the console for messages

## Step 3: Check Console Messages

You should see these messages in order:
```
✅ UI module loaded.
✅ [UI] Initializing UI event handlers...
✅ [UI] Rendering sites: X sites
✅ [UI] Filtered sites: X sites  
✅ [UI] Sites rendered! Check for View Site buttons...
```

If you DON'T see these messages, there's an issue with the JavaScript loading.

## Step 4: Click a "View Site" Button

When you click, you should see:
```
✅ [UI] View Site button clicked! Site ID: 123
```

If you see an ERROR instead, copy the error message.

## Step 5: Check for Common Issues

### Issue A: No sites showing up
- **Symptom:** Empty grid, no site cards
- **Fix:** You need to create sites first. Click "Add Site" button

### Issue B: Console shows errors
- **Symptom:** Red error messages in console
- **Common errors:**
  - `Cannot read property of undefined` - Check if sites data exists
  - `initializeUI is not defined` - Module import issue
  - `openSiteDetailModal is not defined` - Missing function export

### Issue C: Buttons visible but no console logs when clicking
- **Symptom:** No messages when clicking View Site
- **Possible causes:**
  1. Event listener not attached
  2. Button missing `data-action="view-site"` attribute
  3. JavaScript error preventing listener setup

### Issue D: Console logs appear but modal doesn't open
- **Symptom:** See "View Site button clicked!" but no modal
- **Check:** Modal HTML might be missing from the page

## Step 6: Manual Test

Open the console and type:
```javascript
document.querySelectorAll('[data-action="view-site"]')
```

This should return a list of buttons. If it returns an empty list, the buttons aren't being rendered.

## Step 7: Test Event Listener

In the console, type:
```javascript
import { openSiteDetailModal } from './js/ui.js';
openSiteDetailModal(1);
```

This should manually open the modal. If it works, the problem is with the event listener.

## 🛠️ Manual Fix

If automatic doesn't work, try this manual approach:

### Option 1: Direct Button Click Handler
Add this to sites.html or dashboard.html, inside the `<script type="module">` section:

```javascript
// Add click handlers after sites are rendered
setTimeout(() => {
  document.querySelectorAll('[data-action="view-site"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const siteId = btn.dataset.siteId;
      console.log('Button clicked manually, site ID:', siteId);
      
      // Open modal code here
      const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]');
      const site = sites.find(s => s.id == siteId);
      if (site) {
        alert(`Site: ${site.name} - ${site.address}`);
      }
    });
  });
  console.log('Manual click handlers attached');
}, 1000);
```

### Option 2: Check if Module is Loading
Add this to the TOP of sites.html `<script type="module">`:

```javascript
console.log('=== SITES PAGE SCRIPT STARTING ===');
console.log('Module system working:', typeof import !== 'undefined');
```

## 📋 Report Checklist

If still not working, provide these details:
- [ ] Browser name and version
- [ ] Are sites rendering on the page?
- [ ] Console messages (copy all)
- [ ] Any red errors in console?
- [ ] Screenshot of the page
- [ ] Does clicking show ANY reaction (cursor change, button press animation)?

## 🎯 Expected Behavior

When working correctly:
1. Site cards appear with blue "View Site" buttons
2. Hover over button → cursor changes to pointer
3. Click button → console shows "View Site button clicked!"
4. Modal appears with site details
5. Click X or outside modal → modal closes

## 🚨 Emergency Workaround

If buttons still don't work, temporarily add `onclick` directly:

In `js/ui.js`, change the button HTML to:
```javascript
<button 
  onclick="alert('Site ID: ${site.id}')"
  class="w-full bg-nfgblue hover:bg-nfgdark text-white rounded-xl py-2 text-sm font-medium transition">
  View Site (Debug Mode)
</button>
```

If this DOES work, the problem is with the event delegation system.

---

**Note:** After following these steps, the buttons should work. If they still don't, please share the console output!

