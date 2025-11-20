# Message Deletion - UI Only (Delete for Everyone) Gameplan

## Current State
- Messages stay in database (never hard-deleted)
- `message_deletions` table tracks per-user deletions
- When loading messages, we filter out messages where the current user has a deletion record
- When deleting, we create deletion records for all participants (but this might not be working due to RLS)

## Desired Behavior
**When ANY user deletes a message:**
- ✅ Message stays in database (never deleted)
- ✅ Deletion records created for ALL participants in the conversation
- ✅ Message disappears from UI for EVERYONE (sender, receiver, all participants)
- ✅ Message cannot be seen by anyone in the conversation

## Implementation Plan

### Phase 1: Fix Deletion Logic (Backend/RLS)
**Goal:** Ensure deletion records can be created for all participants

1. **Update RLS Policy:**
   - Simplify the INSERT policy for `message_deletions`
   - Allow creating deletion records if:
     - User is a participant in the message's conversation
     - AND they're creating deletion records for other participants in the same conversation
   - Use `SECURITY DEFINER` function to bypass RLS when checking participants

2. **Verify Helper Function:**
   - `user_can_delete_for_participant()` should correctly check if both users are participants
   - Use existing `user_is_participant()` function for reliability

### Phase 2: Update Frontend Deletion Logic
**Goal:** Ensure deletion records are created for ALL participants

**In `js/messages.js` → `deleteMessage()`:**
- ✅ Already fetches all participants (current)
- ✅ Already creates deletion records for all participants (current)
- ✅ Remove confirmation dialog text that mentions "for everyone" (since that's now automatic)
- ✅ Update success message to indicate it's deleted for everyone

### Phase 3: Update Message Loading Logic
**Goal:** Filter out messages with ANY deletion record

**In `js/messages.js` → `loadMessages()`:**
- Current: Filters out messages where current user has a deletion record ✅
- This is already correct! When we create deletion records for all participants, each user's `loadMessages()` will filter out the message

### Phase 4: Update UI Indicators
**Goal:** Remove any "deleted message" placeholders

**In `js/messages.js` → `renderMessages()`:**
- Current: Shows "This message was deleted" for soft-deleted messages
- **Change:** Since we're filtering out deleted messages entirely, remove this placeholder logic
- Messages with deletion records won't appear in the UI at all

### Phase 5: Real-time Updates
**Goal:** Ensure deletions propagate to all users in real-time

**In `js/messages.js` → Realtime listener:**
- Current: Listens for `UPDATE` and `DELETE` on `messages` table
- **Add:** Listen for `INSERT` on `message_deletions` table
- When a deletion record is inserted for the current user:
  - Remove message from local `messages` array
  - Re-render messages

## Database Changes Required

### SQL Script Updates
1. **Verify RLS Policy:**
   - Ensure `user_can_delete_for_participant()` function works correctly
   - Ensure INSERT policy allows creating deletion records for all participants

2. **Add Realtime for `message_deletions`:**
   - Enable Realtime publication for `message_deletions` table
   - This allows real-time updates when deletions happen

## Testing Checklist

1. ✅ **Single User Delete:**
   - User A deletes a message
   - Verify deletion records created for all participants
   - Verify message disappears from User A's UI

2. ✅ **Cross-User Visibility:**
   - User A deletes a message
   - User B (receiver) should not see the message anymore
   - Refresh or real-time update should remove it

3. ✅ **Message Persistence:**
   - Delete a message
   - Verify message still exists in `messages` table
   - Verify deletion records exist in `message_deletions` table

4. ✅ **Real-time Updates:**
   - User A deletes a message
   - User B (receiver) should see it disappear immediately (via Realtime)
   - No refresh required

5. ✅ **Edge Cases:**
   - Delete message in group conversation (3+ participants)
   - All participants should not see the message
   - Message creator deleting their own message
   - Non-creator deleting a message

## Files to Modify

1. **`ADD_MESSAGE_DELETIONS_TABLE.sql`:**
   - Verify/update RLS policies
   - Ensure function works correctly
   - Add Realtime publication

2. **`js/messages.js`:**
   - Update `deleteMessage()` confirmation text
   - Update `renderMessages()` to remove deleted message placeholder
   - Add Realtime listener for `message_deletions` table

3. **`MESSAGE_DELETION_UI_ONLY_GAMEPLAN.md`:**
   - This document (for reference)

## Key Differences from Current Implementation

| Aspect | Current | New (UI-Only) |
|--------|---------|---------------|
| **Database** | Message stays | Message stays ✅ Same |
| **Deletion Records** | Per-user | For ALL participants ✅ Same |
| **UI Visibility** | Hidden for user who deleted | Hidden for EVERYONE 🔄 Change |
| **Deletion Logic** | Already creates for all | Already creates for all ✅ Same |
| **Real-time** | Not implemented | Add listener for deletions ✅ New |

## Summary

The current implementation is **almost correct** for this behavior! We just need to:

1. ✅ **Fix RLS policy** - Ensure deletion records can be created for all participants
2. ✅ **Remove deleted message placeholder** - Since messages are filtered out entirely
3. ✅ **Add real-time listener** - So deletions propagate immediately to all users
4. ✅ **Update UI text** - Make it clear it deletes for everyone

The core logic (creating deletion records for all participants) is already in place. We just need to fix the RLS issue and add real-time updates.

