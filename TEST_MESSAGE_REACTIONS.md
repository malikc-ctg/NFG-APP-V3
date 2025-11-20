# 🧪 Testing Message Reactions Feature

## Step 1: Setup Database

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Run SQL Migration**
   - Go to **SQL Editor** in the left sidebar
   - Click **New Query**
   - Open the file `ADD_MESSAGE_REACTIONS.sql`
   - Copy and paste the entire contents into the SQL Editor
   - Click **Run** (or press `Cmd+Enter` / `Ctrl+Enter`)
   - You should see a success message: `✅ message_reactions table created!`

## Step 2: Test in UI

### Test 1: View Reactions Button
1. Open the Messages page in your app
2. Select a conversation (or create a new one if needed)
3. **Hover over any message** (move your mouse over a message bubble)
4. You should see a **smile-plus icon** (😊+) appear in the bottom-left or bottom-right of the message
   - This is the "Add Reaction" button

### Test 2: Add a Reaction
1. Click the **smile-plus icon** on any message
2. An **emoji picker** should appear with 8 common emojis:
   - 👍 ❤️ 😂 😮 😢 🔥 👏 🎉
3. Click any emoji (e.g., 👍)
4. The emoji should appear **below the message** as a reaction button
5. You should see the reaction count (e.g., "👍 1")

### Test 3: Multiple Reactions
1. Click the **smile-plus icon** again on the same message
2. Select a different emoji (e.g., ❤️)
3. Both reactions should appear: 👍 1 and ❤️ 1
4. You can add multiple different emojis to the same message

### Test 4: Toggle Reaction (Add/Remove)
1. Click on a reaction button you just added (e.g., 👍)
2. If it was already there, it should **remove** the reaction
3. Click it again - it should **add** the reaction back
4. The count should update (e.g., "👍 0" then "👍 1")

### Test 5: Your Reactions Highlighted
1. Add a reaction to a message (e.g., 👍)
2. The reaction button should have a **blue background/border** indicating it's yours
3. Reactions from other users won't have the blue highlight

### Test 6: Real-time Updates (Two Browser Windows)
1. Open your app in **two different browser windows** (or incognito mode)
2. Log in as **two different users** (User A and User B)
3. User A: Add a reaction to a message (e.g., ❤️)
4. User B: The reaction should **automatically appear** on their screen without refreshing
5. User B: Add a different reaction (e.g., 🔥)
6. User A: Should see both reactions appear in real-time

### Test 7: Multiple Users Same Reaction
1. User A: Add 👍 reaction
2. User B: Add 👍 reaction to the same message
3. The reaction button should show **"👍 2"** (count of 2)
4. Hovering over the 👍 button should show a tooltip with both user names

### Test 8: Reaction on Image/File Messages
1. Send a message with an image or file attachment
2. Try adding a reaction to it
3. Reactions should work on all message types (text, image, file)

## Expected Behavior

✅ **Working Correctly:**
- Reaction button appears on hover
- Emoji picker shows 8 emojis
- Reactions appear below messages
- Clicking reaction toggles it (add/remove)
- Your reactions are highlighted in blue
- Real-time updates work across users
- Counts update correctly
- Tooltips show user names

❌ **If Something's Wrong:**
- Check browser console for errors (F12 → Console tab)
- Verify SQL migration ran successfully
- Make sure you're logged in
- Try refreshing the page
- Check if Realtime is enabled in Supabase (Settings → API → Realtime)

## Troubleshooting

### Reactions Not Appearing
- **Check:** Did you run the SQL migration?
- **Check:** Are there any errors in the browser console?
- **Fix:** Run `ADD_MESSAGE_REACTIONS.sql` again in Supabase SQL Editor

### Real-time Not Working
- **Check:** Is Realtime enabled in Supabase?
- **Check:** Are you using two different user accounts?
- **Fix:** Go to Supabase Dashboard → Settings → API → Ensure Realtime is enabled

### Emoji Picker Not Showing
- **Check:** Did you click the smile-plus icon?
- **Check:** Is the message hover state working?
- **Fix:** Make sure you're hovering over the message first

### Reactions Not Saving
- **Check:** Browser console for RLS (Row Level Security) errors
- **Check:** Are you logged in?
- **Fix:** Verify RLS policies in Supabase (Table Editor → message_reactions → Policies)

## Success Criteria

The feature is working correctly if:
1. ✅ You can see the reaction button on hover
2. ✅ Emoji picker opens and shows emojis
3. ✅ Reactions appear below messages
4. ✅ You can add and remove reactions
5. ✅ Your reactions are highlighted
6. ✅ Real-time updates work across users
7. ✅ Counts and tooltips work correctly

---

**Happy Testing! 🎉**

