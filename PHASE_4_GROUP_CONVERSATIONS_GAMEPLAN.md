# 📋 Phase 4: Group Conversations - Gameplan

## 🎯 Overview
Implement group conversations that allow multiple users to participate in a single conversation, with admin roles, participant management, and group-specific features.

---

## ✅ Current State

### Database (Already Set Up ✅)
- ✅ `conversations` table has `type` column with `'group'` option
- ✅ `conversations` table has `title` column for group names
- ✅ `conversation_participants` table supports multiple users per conversation
- ✅ `conversation_participants` has `role` column ('participant', 'admin')
- ✅ RLS policies exist for conversations and participants

### Current Implementation (Direct Messages Only)
- ✅ Direct message conversations working
- ✅ Two-participant conversations
- ❌ No UI for creating groups
- ❌ No UI for managing participants
- ❌ No group-specific features (name, description, admins)
- ❌ Conversation list doesn't distinguish group vs direct

---

## 🎨 UI/UX Design

### 1. Create Group Button
**Location:** Above conversation list (desktop) or in header (mobile)
- **Button:** "New Group" or "+" icon with "New Group" option
- **Icon:** `users` or `user-plus` from Lucide
- **Action:** Opens "Create Group" modal

### 2. Create Group Modal
**Components:**
- **Group Name Input:** Required, 1-50 characters
- **Group Description:** Optional, textarea
- **Add Participants:** 
  - Search/select users to add
  - Shows user list with checkboxes
  - Shows already-added participants
  - Can add from user list or search
- **Initial Admins:** 
  - Creator is automatically admin
  - Can assign other users as admins during creation
- **Create Button:** Creates group and redirects to conversation

### 3. Group Conversation Header
**In active chat view:**
- **Group Name:** Larger, prominent
- **Participant Count:** "5 members" badge
- **Group Actions Button (three dots):**
  - View members
  - Edit group info (admins only)
  - Leave group
  - Delete group (admins only)

### 4. Group Info Sidebar/Modal
**Shows:**
- Group name and description
- Created date
- Member list:
  - Avatar/initials
  - Full name
  - Role badge (Admin/Participant)
  - Actions (if admin):
    - Make admin / Remove admin
    - Remove from group
- Add member button (admins only)
- Settings (if admin):
  - Edit group name
  - Edit description
  - Change group image/icon (future)

### 5. Conversation List Differentiation
**Visual indicators:**
- **Direct Messages:** Show other user's avatar and name
- **Group Conversations:**
  - Show group avatar (first letters of name) or icon
  - Show group name
  - Show participant count or last few avatars
  - Group icon indicator (`users` icon)

### 6. Participant Management
**Actions available to admins:**
- **Add Members:** Search and add users
- **Remove Members:** Remove participants (except self)
- **Promote/Demote Admins:** Change user roles
- **Edit Group Info:** Update name and description

**Actions available to all:**
- **Leave Group:** Remove self from group
- **View Members:** See all participants

### 7. System Messages
**Auto-generated messages for:**
- "User joined the group"
- "User left the group"
- "User was added by Admin"
- "User was removed by Admin"
- "User was promoted to admin"
- "User was demoted to participant"
- "Group name was changed"
- Message type: `'system'` (already exists in schema)

---

## 🔧 Implementation Steps

### Step 1: Database Verification & Enhancements
**File:** Create `ADD_GROUP_CONVERSATIONS_SCHEMA.sql`
- Verify existing columns support groups (already done ✅)
- Add `description` column to `conversations` table (optional, for group descriptions)
- Add `avatar_url` column to `conversations` table (optional, for group avatars)
- Verify RLS policies work for group conversations
- Test creating a group conversation manually

### Step 2: Create Group Modal UI
**File:** `messages.html`
- Add "New Group" button above conversation list
- Create modal structure:
  - Group name input
  - Group description textarea
  - Participant selector/search
  - Admin checkboxes
  - Create/Cancel buttons

**File:** `js/messages.js`
- Add `showCreateGroupModal()` function
- Add `hideCreateGroupModal()` function
- Add participant search/selection logic
- Add `createGroupConversation()` function

### Step 3: Create Group Function
**File:** `js/messages.js`
- Function: `createGroupConversation(name, description, participantIds, adminIds)`
- Creates conversation with `type = 'group'`
- Sets `title` and `description`
- Creates `conversation_participants` entries for all members
- Sets roles for admins
- Redirects to new group conversation
- Shows success notification

### Step 4: Update Conversation List Rendering
**File:** `js/messages.js` - `renderConversations()`
- Check `conversation.type`
- **Direct messages:** Show other user's info (existing logic)
- **Group conversations:** 
  - Show group avatar (initials from title)
  - Show group name
  - Show participant count
  - Show group icon indicator
  - Show last message preview

### Step 5: Group Conversation Header
**File:** `messages.html`
- Update conversation header to show:
  - Group name (if group)
  - Participant count (if group)
  - Group actions menu (three dots)

**File:** `js/messages.js`
- Update `renderActiveConversation()` or header rendering
- Add group-specific header elements
- Add click handler for group info button

### Step 6: Group Info Sidebar/Modal
**File:** `messages.html`
- Create group info modal/sidebar
- Shows: name, description, members, settings

**File:** `js/messages.js`
- Add `showGroupInfo(conversationId)` function
- Fetch conversation details and participants
- Render member list with roles
- Add actions for admins (edit, add member, remove member, etc.)

### Step 7: Add Participants Function
**File:** `js/messages.js`
- Function: `addParticipantsToGroup(conversationId, userIds)`
- Inserts new `conversation_participants` entries
- Creates system message: "User1, User2 added by AdminName"
- Updates group info UI
- Sends push notifications to new members (optional)

### Step 8: Remove Participants Function
**File:** `js/messages.js`
- Function: `removeParticipantFromGroup(conversationId, userId)`
- Checks if user is admin (only admins can remove)
- Cannot remove self via this function (use leaveGroup)
- Deletes `conversation_participants` entry
- Creates system message: "UserName removed by AdminName"
- Updates group info UI
- If removed user, redirect to conversation list

### Step 9: Update Participant Role Function
**File:** `js/messages.js`
- Function: `updateParticipantRole(conversationId, userId, newRole)`
- Updates `role` in `conversation_participants`
- Creates system message: "UserName promoted to admin" or "UserName is now a participant"
- Updates group info UI

### Step 10: Leave Group Function
**File:** `js/messages.js`
- Function: `leaveGroup(conversationId)`
- Removes current user from `conversation_participants`
- Creates system message: "UserName left the group"
- Redirects to conversation list
- Shows confirmation modal first

### Step 11: Edit Group Info Function
**File:** `js/messages.js`
- Function: `updateGroupInfo(conversationId, updates)`
- Updates `title` and/or `description` in `conversations`
- Creates system message: "Group name changed to 'New Name'" or "Group description updated"
- Updates UI (header, conversation list)
- Only admins can edit

### Step 12: System Messages Rendering
**File:** `js/messages.js` - `renderMessages()`
- Check `message.message_type === 'system'`
- Render system messages differently:
  - Centered text
  - Italic/gray styling
  - No sender info
  - No actions (reply, react, etc.)
  - Shows timestamp

### Step 13: Update Direct Message Function
**File:** `js/messages.js` - `createDirectConversation()`
- Ensure it still works correctly
- Verify it doesn't interfere with group creation
- Keep existing logic for two-participant conversations

### Step 14: Real-time Updates for Groups
**File:** `js/messages.js` - Real-time subscriptions
- Listen for changes to `conversation_participants`:
  - New participants added
  - Participants removed
  - Role changes
- Update group info UI when changes occur
- Show notifications for group events

### Step 15: Permissions & Security
**File:** `js/messages.js`
- Add permission checks before actions:
  - `isGroupAdmin(conversationId)` - Check if current user is admin
  - `isGroupParticipant(conversationId)` - Check if user is in group
- Hide/show UI elements based on permissions
- Validate permissions server-side (RLS should handle this)

### Step 16: Search & Filter
**File:** `js/messages.js`
- Update conversation search to include group names
- Add filter: "All", "Direct Messages", "Groups"
- Filter conversation list by type

---

## 📝 Detailed Code Changes

### 1. Database Schema Updates
```sql
-- Optional: Add description column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Optional: Add avatar_url for group images
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

### 2. State Management
```javascript
// In js/messages.js
let currentGroupInfo = null; // For group info modal
let groupParticipants = new Map(); // conversationId -> participants[]
```

### 3. Create Group Modal HTML
```html
<!-- In messages.html -->
<div id="create-group-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
    <h2 class="text-xl font-bold mb-4">Create Group</h2>
    
    <input type="text" id="group-name-input" placeholder="Group name" class="w-full mb-4" />
    
    <textarea id="group-description-input" placeholder="Description (optional)" class="w-full mb-4"></textarea>
    
    <div id="participant-selector" class="mb-4">
      <h3 class="font-semibold mb-2">Add Members</h3>
      <input type="text" id="participant-search" placeholder="Search users..." class="w-full mb-2" />
      <div id="participant-list" class="max-h-48 overflow-y-auto"></div>
    </div>
    
    <div class="flex gap-2 justify-end">
      <button id="cancel-create-group" class="px-4 py-2">Cancel</button>
      <button id="create-group-btn" class="px-4 py-2 bg-nfgblue text-white rounded">Create</button>
    </div>
  </div>
</div>
```

### 4. Create Group Function
```javascript
async function createGroupConversation(name, description, participantIds, adminIds) {
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert([{
      type: 'group',
      title: name,
      description: description || null,
      created_by: currentUser.id
    }])
    .select()
    .single();

  if (convError) throw convError;

  // Add participants (all members, including creator)
  const allParticipants = [currentUser.id, ...participantIds];
  const participantEntries = allParticipants.map(userId => ({
    conversation_id: conversation.id,
    user_id: userId,
    role: adminIds.includes(userId) ? 'admin' : 'participant'
  }));

  const { error: participantsError } = await supabase
    .from('conversation_participants')
    .insert(participantEntries);

  if (participantsError) throw participantsError;

  // Create system message
  const memberNames = participantIds.map(id => /* get name */).join(', ');
  await supabase
    .from('messages')
    .insert([{
      conversation_id: conversation.id,
      sender_id: currentUser.id,
      content: `Group created. ${memberNames} added.`,
      message_type: 'system'
    }]);

  return conversation;
}
```

### 5. Render Group Conversations
```javascript
function renderConversationItem(conversation) {
  if (conversation.type === 'group') {
    // Render group conversation
    return `
      <div class="conversation-item group" data-conversation-id="${conversation.id}">
        <div class="group-avatar">${getGroupInitials(conversation.title)}</div>
        <div class="conversation-info">
          <div class="flex items-center gap-2">
            <h3>${escapeHtml(conversation.title)}</h3>
            <i data-lucide="users" class="w-4 h-4"></i>
          </div>
          <p class="text-sm text-gray-500">${conversation.participant_count} members</p>
          <p class="text-xs text-gray-400">${lastMessagePreview}</p>
        </div>
      </div>
    `;
  } else {
    // Render direct message (existing logic)
  }
}
```

### 6. System Message Rendering
```javascript
function renderMessage(message) {
  if (message.message_type === 'system') {
    return `
      <div class="system-message text-center py-2">
        <p class="text-xs italic text-gray-500 dark:text-gray-400">
          ${escapeHtml(message.content)}
        </p>
        <span class="text-xs text-gray-400">${formatTime(message.created_at)}</span>
      </div>
    `;
  }
  // ... existing message rendering
}
```

### 7. Group Actions Menu
```javascript
async function showGroupActions(conversationId) {
  const conversation = conversations.find(c => c.id === conversationId);
  const isAdmin = await checkIsGroupAdmin(conversationId);
  
  const menuItems = [
    { label: 'View Members', action: () => showGroupInfo(conversationId) },
    { label: 'Leave Group', action: () => leaveGroup(conversationId) }
  ];
  
  if (isAdmin) {
    menuItems.push(
      { label: 'Edit Group Info', action: () => editGroupInfo(conversationId) },
      { label: 'Manage Members', action: () => showGroupInfo(conversationId, { manage: true }) },
      { label: 'Delete Group', action: () => deleteGroup(conversationId) }
    );
  }
  
  // Show dropdown menu
}
```

---

## 🧪 Testing Checklist

### Group Creation
- [ ] Can create group with name
- [ ] Can add description (optional)
- [ ] Can add multiple participants
- [ ] Can set initial admins
- [ ] Creator is automatically admin
- [ ] System message created on group creation
- [ ] Redirects to new group conversation

### Group Display
- [ ] Group appears in conversation list
- [ ] Shows group name and avatar
- [ ] Shows participant count
- [ ] Differentiates from direct messages
- [ ] Group icon indicator visible

### Group Info
- [ ] Can view group info
- [ ] Shows all members with roles
- [ ] Shows creation date
- [ ] Admin actions visible only to admins

### Adding Members
- [ ] Admins can add members
- [ ] Non-admins cannot add members
- [ ] System message created when member added
- [ ] New member receives notification (if implemented)
- [ ] Group info updates in real-time

### Removing Members
- [ ] Admins can remove members
- [ ] Cannot remove self (use Leave Group)
- [ ] System message created when member removed
- [ ] Removed user redirected if active conversation
- [ ] Group info updates in real-time

### Role Management
- [ ] Admins can promote participants to admin
- [ ] Admins can demote admins to participant
- [ ] Cannot demote self
- [ ] System message created on role change
- [ ] UI updates to show new role

### Leave Group
- [ ] Any participant can leave group
- [ ] Confirmation modal shown
- [ ] System message created when leaving
- [ ] Redirected to conversation list
- [ ] Can rejoin if invited again (future feature)

### Edit Group Info
- [ ] Only admins can edit
- [ ] Can update group name
- [ ] Can update description
- [ ] System message created on change
- [ ] UI updates immediately

### Permissions
- [ ] Non-admins cannot see admin-only actions
- [ ] Non-participants cannot access group
- [ ] RLS policies prevent unauthorized access
- [ ] UI respects permission checks

### System Messages
- [ ] System messages render correctly
- [ ] Centered and styled differently
- [ ] No sender info shown
- [ ] No actions available
- [ ] Timestamp displayed

### Real-time Updates
- [ ] New participants appear in real-time
- [ ] Removed participants disappear in real-time
- [ ] Role changes update in real-time
- [ ] Group info changes update in real-time

### Edge Cases
- [ ] Last admin leaves (should prevent or transfer ownership)
- [ ] All participants removed (group becomes empty)
- [ ] Very long group names (truncate)
- [ ] Maximum participants (if limit exists)
- [ ] Deleted user in participant list

---

## 🎨 Visual Design Notes

### Group Avatar
- **Default:** First 2 letters of group name, colored background
- **Future:** Custom group image
- **Size:** 40x40px (same as user avatars)

### Group Indicator
- **Icon:** `users` from Lucide
- **Size:** 16x16px
- **Color:** Gray/muted
- **Position:** Next to group name

### System Messages
- **Style:** Centered, italic, smaller font
- **Color:** Gray/muted (`text-gray-500`)
- **Background:** Transparent or very light background
- **Padding:** Minimal vertical padding

### Admin Badge
- **Style:** Small badge/indicator
- **Color:** NFG blue or gold
- **Text:** "Admin" or icon
- **Position:** Next to user name in member list

---

## 📊 Database Schema (Mostly Complete ✅)

### Existing (Already Working)
```sql
-- conversations table
type VARCHAR(20) CHECK (type IN ('direct', 'job', 'group'))
title VARCHAR(255) -- For group names
created_by UUID

-- conversation_participants table
conversation_id UUID
user_id UUID
role VARCHAR(20) CHECK (role IN ('participant', 'admin'))

-- messages table
message_type VARCHAR(20) CHECK (message_type IN ('text', 'image', 'file', 'system'))
```

### Optional Additions
```sql
-- Add description column
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add avatar_url for group images (future)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;
```

---

## 🚀 Implementation Order

### Phase 4.1: Core Group Creation (2-3 hours)
1. Database verification & optional enhancements
2. Create Group modal UI
3. Create Group function
4. Update conversation list to show groups
5. Basic group header

### Phase 4.2: Group Management (2-3 hours)
6. Group info sidebar/modal
7. Add participants function
8. Remove participants function
9. Update participant roles function
10. Leave group function

### Phase 4.3: Group Features (1-2 hours)
11. Edit group info function
12. System messages rendering
13. Permissions & security checks
14. Real-time updates for group events

### Phase 4.4: Polish & Testing (1-2 hours)
15. Search & filter conversations
16. Visual polish
17. Edge case handling
18. Comprehensive testing

**Total Estimated Time:** 6-10 hours

---

## 🔄 Future Enhancements (Post-MVP)

1. **Group Images:** Custom avatars for groups
2. **Group Descriptions:** Rich text descriptions
3. **Mention Support:** @mention users in groups
4. **Group Announcements:** Pin important messages
5. **Group Invites:** Shareable invite links
6. **Group Settings:** Mute notifications, custom colors
7. **Group Roles:** More granular roles (moderator, member, etc.)
8. **Group Permissions:** Fine-grained permission control
9. **Group Activity Log:** History of group changes
10. **Group Search:** Search within group messages only
11. **Thread Support in Groups:** Nested discussions
12. **Group Reactions:** Emoji reactions on group messages
13. **Group Polls:** Quick polls within groups
14. **Group Events:** Schedule events within groups

---

## ✅ Success Criteria

The feature is complete when:
1. ✅ Users can create group conversations
2. ✅ Groups appear in conversation list with visual distinction
3. ✅ Admins can add/remove members
4. ✅ Admins can promote/demote other admins
5. ✅ Any participant can leave group
6. ✅ System messages show group events
7. ✅ Group info displays all members and roles
8. ✅ Permissions are enforced (UI and RLS)
9. ✅ Real-time updates work for group events
10. ✅ Works on both desktop and mobile

---

## 🚨 Important Considerations

### Last Admin Leaving
- **Problem:** If last admin leaves, group has no admins
- **Solution Options:**
  1. Prevent last admin from leaving (require transferring admin first)
  2. Auto-promote oldest participant to admin
  3. Auto-delete group if last admin leaves

**Recommendation:** Option 1 (prevent leaving) with option to transfer admin role first.

### Empty Groups
- **Problem:** If all participants leave, group becomes empty
- **Solution:** Auto-delete group when last participant leaves, or keep as archived

### Performance
- **Consideration:** Groups with many participants may have performance issues
- **Solution:** 
  - Paginate member list for large groups
  - Optimize queries with proper indexes
  - Consider caching participant lists

### Notifications
- **Consideration:** Group messages may create notification spam
- **Solution:**
  - Implement group notification settings
  - Batch notifications for active groups
  - Allow muting groups

---

**Ready to start implementation?** 🚀

Let's begin with Phase 4.1: Core Group Creation!
