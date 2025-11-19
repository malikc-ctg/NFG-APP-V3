# Phase 1: Core Enhancements - Setup Instructions

## ✅ Features Implemented

1. **Message Editing & Deleting**
   - Edit messages within 15 minutes of sending
   - Delete messages (soft delete - removes for you)
   - Desktop: Hover over message to see edit/delete buttons
   - Mobile: Long-press message to see menu

2. **Archive & Delete Conversations**
   - Archive conversations (hide from list, keep messages)
   - Delete conversations (permanently remove)
   - Swipe left on conversation to reveal actions (mobile)
   - Actions available in swipe menu

3. **Typing Indicators**
   - Real-time typing indicators ("User is typing...")
   - Shows when other participants are typing
   - Auto-hides after 3 seconds of inactivity
   - Uses Supabase Realtime presence channels

4. **Online/Offline Status**
   - Shows "Online" when user is active
   - Shows "Last seen X ago" when offline
   - Updates in real-time via presence channels
   - Updates `last_seen_at` every 30 seconds

## 📋 Database Setup

### Step 1: Run SQL Migration

Run the following SQL script in your Supabase SQL Editor:

```sql
-- File: PHASE1_MESSAGES_ENHANCEMENTS.sql
```

This will:
- Add `archived_at` and `archived_by` columns to `conversations` table
- Add `last_seen_at` column to `user_profiles` table
- Create indexes for performance
- Add helper functions and grants

### Step 2: Verify Changes

After running the SQL, verify the columns were added:

```sql
-- Check conversations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
  AND column_name IN ('archived_at', 'archived_by');

-- Check user_profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'last_seen_at';
```

## 🎯 How to Use

### Message Editing (Desktop)
1. Hover over any message you sent
2. Click the pencil icon to edit
3. Edit the message content
4. Save changes

### Message Editing (Mobile)
1. Long-press any message you sent
2. Select "Edit" from the menu
3. Edit the message content
4. Save changes

### Message Deleting
1. Hover over message (desktop) or long-press (mobile)
2. Click the trash icon
3. Confirm deletion

**Note:** Messages can only be edited within 15 minutes of sending.

### Archive Conversation
1. Swipe left on conversation (mobile)
2. Click the archive button (yellow icon)
3. Conversation will be hidden from your list

### Delete Conversation
1. Swipe left on conversation (mobile)
2. Click the delete button (red icon)
3. Confirm deletion
4. Conversation and all messages will be permanently deleted

### Typing Indicators
- Automatically shows when someone is typing
- Appears below the messages list
- Disappears after 3 seconds of inactivity

### Online Status
- Automatically tracked when viewing conversations
- Shows in conversation header
- Updates every 30 seconds while active

## 🔧 Technical Details

### Message Editing
- Uses `is_edited` flag in database
- Updates `updated_at` timestamp
- Shows "(edited)" indicator
- 15-minute edit window enforced client-side and server-side

### Message Deleting
- Uses soft delete (`deleted_at` column)
- Messages are filtered out in queries
- Can be hard deleted in future for "delete for everyone"

### Archive Conversations
- Sets `archived_at` timestamp
- Stores `archived_by` user ID
- Filtered out from conversation list (client-side)
- Can be unarchived in future feature

### Typing Indicators
- Uses Supabase Realtime presence channels
- Channel: `typing:{conversation_id}`
- Throttled to send max once per second
- Auto-clear after 3 seconds

### Online Status
- Uses Supabase Realtime presence channels
- Channel: `presence:{conversation_id}`
- Updates `last_seen_at` every 30 seconds
- Shows "Online" or "Last seen X ago"

## 🐛 Troubleshooting

### Typing indicators not showing
- Check browser console for Realtime errors
- Verify Supabase Realtime is enabled
- Check presence channel subscription

### Online status not updating
- Verify `last_seen_at` column exists in `user_profiles`
- Check presence channel subscription
- Verify RLS policies allow updates

### Archive/Delete not working
- Verify `archived_at` and `archived_by` columns exist
- Check RLS policies for `conversations` table
- Verify user has UPDATE permissions

### Message edit/delete not working
- Verify `is_edited` and `deleted_at` columns exist in `messages`
- Check RLS policies allow updates
- Verify user is the sender (enforced in code)

## 📝 Next Steps

After Phase 1 is complete, consider:
- Phase 2: File attachments
- Phase 2: Search within messages
- Phase 3: Message reactions
- Phase 4: Group conversations

## 🎉 Success!

All Phase 1 features are now implemented and ready to use!

