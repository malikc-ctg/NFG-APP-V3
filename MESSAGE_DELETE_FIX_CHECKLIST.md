# Message Delete Fix Checklist

## The Problem
- RLS error: "new row violates row-level security policy for table 'messages'"
- This happens when trying to set `deleted_at` on a message

## The Solution
Run the SQL script to fix the RLS policy.

## Step-by-Step Instructions

### Step 1: Run the SQL Fix
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `FIX_MESSAGE_DELETE_ONE_SHOT.sql`
4. Click "Run" (or press Ctrl/Cmd + Enter)
5. Check the output - you should see:
   - "Found X UPDATE policies on messages table"
   - "Dropped policy: [policy name]" for each policy
   - "SUCCESS! Policy created correctly. Total UPDATE policies: 1"
   - A final query showing the policy that was created

### Step 2: Verify It Worked
- The script will automatically verify the policy was created
- You should see only ONE UPDATE policy named "Users can update their own messages"
- If you see multiple policies or an error, that's the problem

### Step 3: Test Message Deletion
1. Go back to your app
2. Try deleting a message you sent
3. It should work now!

## If It Still Doesn't Work

### Check Current Policies
Run `TEST_MESSAGE_DELETE.sql` to see:
- What UPDATE policies currently exist
- If RLS is enabled
- If permissions are granted

### Common Issues
1. **Multiple Policies Conflicting** - Should only be ONE UPDATE policy
2. **Policy Not Created** - Script might have failed silently
3. **Wrong Policy Name** - Should be exactly "Users can update their own messages"

## What the Fixed Policy Does
- Allows users to UPDATE messages where `sender_id = auth.uid()`
- No restrictions on what fields can be updated (can set `deleted_at`)
- Simple and straightforward - no complex logic

## Files Reference
- **FIX_MESSAGE_DELETE_ONE_SHOT.sql** - Main fix script (RUN THIS)
- **TEST_MESSAGE_DELETE.sql** - Diagnostic script (check current state)
- **CLEANUP_MESSAGE_DELETION.sql** - Clean up old code (optional)

