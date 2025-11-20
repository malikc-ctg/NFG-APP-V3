# Message Deletion Gameplan

## Goal
- Messages **NEVER** deleted from database (preserve all data)
- Messages **hidden from UI** for all participants when deleted
- Works across all devices and users

---

## Architecture

### 1. Database Table: `message_deletions`
- Tracks which users have "deleted" (hidden) which messages
- Structure:
  - `id` (UUID, primary key)
  - `message_id` (UUID, foreign key to messages)
  - `user_id` (UUID, foreign key to auth.users)
  - `deleted_at` (TIMESTAMPTZ)
  - UNIQUE constraint on `(message_id, user_id)`

### 2. RLS Policy
- Users can INSERT deletion records for any participant in conversations they're part of
- This allows "delete for everyone" functionality
- Users can only see their own deletion records

### 3. Delete Flow

#### When User Deletes a Message:
1. Get all participants in the conversation
2. Create deletion records for **ALL participants** in `message_deletions` table
3. Remove message from local `messages` array
4. Re-render messages (filtered list)

#### When Loading Messages:
1. Fetch messages from database (all messages for conversation)
2. Fetch deletion records for current user
3. Filter out any messages where `message_id` exists in user's deletions
4. Display only non-deleted messages

---

## Implementation Steps

### Step 1: Create Database Table ✅
- File: `ADD_MESSAGE_DELETIONS_TABLE.sql`
- Creates table with proper indexes and RLS policies
- **Status:** Already created, needs to be run in Supabase

### Step 2: Update Message Loading
- File: `js/messages.js` → `loadMessages()` function
- After fetching messages, fetch user's deletions
- Filter out deleted messages before rendering
- **Status:** Already implemented ✅

### Step 3: Update Delete Function
- File: `js/messages.js` → `deleteMessage()` function
- Remove all database update logic (no updates to `messages` table)
- Only create records in `message_deletions` table
- Create deletion records for ALL participants
- **Status:** Already implemented ✅

### Step 4: Update Rendering
- File: `js/messages.js` → `renderMessages()` function
- Messages are already filtered when loaded
- No need to check `deleted_at` field (we're not using it)
- **Status:** Already implemented ✅

---

## Key Points

✅ **Database**: Messages table unchanged - no updates, no soft deletes
✅ **UI Filtering**: Deleted messages filtered out when loading
✅ **Cross-device**: Database-backed, works everywhere
✅ **Delete for everyone**: Creates deletion records for all participants
✅ **Audit trail**: All messages preserved in database

---

## Testing Checklist

1. ✅ Run `ADD_MESSAGE_DELETIONS_TABLE.sql` in Supabase
2. ✅ Delete a message - should disappear from UI
3. ✅ Check database - message should still exist in `messages` table
4. ✅ Check `message_deletions` table - should have records for all participants
5. ✅ Open conversation as another user - message should be hidden
6. ✅ Refresh page - deleted messages should stay hidden
7. ✅ Test on different device - deletions should sync

---

## Database Structure

```
messages table (unchanged)
├── id
├── conversation_id
├── sender_id
├── content
├── created_at
└── ... (no deleted_at needed)

message_deletions table (new)
├── id
├── message_id → messages.id
├── user_id → auth.users.id
├── deleted_at
└── UNIQUE(message_id, user_id)
```

---

## RLS Policy Logic

**INSERT Policy:** Users can create deletion records for:
- Themselves (user_id = auth.uid())
- Other participants in conversations they're part of

This allows any participant to "delete for everyone" by creating deletion records for all participants.

