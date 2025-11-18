# 💬 In-App Messaging Game Plan

## 🎯 Goal
Implement a comprehensive in-app messaging system that allows users to communicate directly with each other, discuss jobs, and collaborate in real-time.

---

## 📋 Feature Overview

### Core Features
1. **Direct Messages** - One-on-one conversations between users
2. **Job-Specific Chat** - Threaded conversations linked to specific jobs
3. **Group Conversations** - Multi-user group chats
4. **Real-Time Updates** - Messages appear instantly without refresh
5. **Message History** - Persistent message storage and search
6. **Notifications** - Alert users of new messages
7. **Read Receipts** - See when messages are read
8. **File Attachments** - Share images, documents, etc.

---

## 🗄️ Database Schema

### Phase 1: Core Tables

#### `conversations` Table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL, -- 'direct', 'job', 'group'
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE, -- NULL for direct/group
  title VARCHAR(255), -- For group conversations
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ, -- For sorting conversations
  UNIQUE(job_id) -- One conversation per job
);

-- Indexes
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_job_id ON conversations(job_id);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC);
```

#### `conversation_participants` Table
```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'participant', -- 'participant', 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ, -- For read receipts
  UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
```

#### `messages` Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
  attachment_url TEXT, -- For images/files
  attachment_name VARCHAR(255), -- Original filename
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For threaded replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ, -- Soft delete
  is_edited BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_reply_to_id ON messages(reply_to_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
```

#### `message_reads` Table (For Read Receipts)
```sql
CREATE TABLE message_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
```

### Phase 2: RLS Policies

```sql
-- Conversations: Users can only see conversations they're participants in
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Conversation Participants: Users can see participants in their conversations
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Messages: Users can see messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- Messages: Users can send messages to conversations they're in
CREATE POLICY "Users can send messages to their conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

-- Messages: Users can edit/delete their own messages
CREATE POLICY "Users can edit their own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE -- Soft delete
  USING (sender_id = auth.uid());
```

---

## 🎨 UI/UX Design

### 1. **Messages Page** (`messages.html`)
- **Layout:**
  - Left sidebar: List of conversations (direct, job, group)
  - Main area: Active conversation view
  - Mobile: Stacked view (conversation list → conversation view)

- **Conversation List:**
  - Avatar/initials for each participant
  - Conversation name (user name, job title, or group name)
  - Last message preview
  - Timestamp (relative: "2m ago", "Yesterday", date)
  - Unread count badge
  - Online status indicator (for direct messages)
  - Search/filter conversations

- **Conversation View:**
  - Header: Participants, job link (if job conversation), actions menu
  - Message list: Scrollable, newest at bottom
  - Message bubbles: Sent (right, blue) vs Received (left, gray)
  - Message info: Timestamp, read receipts, edit indicator
  - Input area: Text input, attachment button, send button
  - Typing indicator: "User is typing..."

### 2. **Message Components**
- **Text Messages:**
  - Message bubble with content
  - Sender name/avatar
  - Timestamp
  - Read receipts (checkmarks)
  - Edit/delete actions (for own messages)

- **File Attachments:**
  - Image preview (thumbnails)
  - File icon for documents
  - Download button
  - File size/name

- **System Messages:**
  - Centered, muted style
  - "User joined", "User left", "Job status changed"

- **Reply Threads:**
  - Show quoted message above reply
  - Collapsible thread view

### 3. **Job Integration**
- **Job Detail Modal:**
  - "Messages" tab or section
  - Show job conversation
  - Quick message input

- **Job List/Cards:**
  - Message icon/badge if unread messages
  - Click to open job conversation

---

## 🔧 Technical Implementation

### Phase 1: Database & Backend (2-3 hours)

1. **Create Database Schema**
   - Run SQL migrations for all tables
   - Set up RLS policies
   - Create indexes for performance
   - Add triggers for `updated_at` timestamps

2. **Supabase Realtime Setup**
   - Enable Realtime for `messages` table
   - Configure Realtime channels
   - Set up row-level security for Realtime

3. **Helper Functions**
   - `createDirectConversation(user1_id, user2_id)` - Auto-create or get existing
   - `createJobConversation(job_id)` - Create conversation for job
   - `addParticipant(conversation_id, user_id)` - Add user to conversation
   - `markAsRead(conversation_id, user_id)` - Update read receipts

### Phase 2: UI Components (3-4 hours)

1. **Messages Page Structure**
   - Create `messages.html`
   - Layout: Sidebar + main conversation view
   - Responsive design (mobile stacking)

2. **Conversation List Component**
   - Fetch user's conversations
   - Sort by `last_message_at`
   - Display unread counts
   - Search/filter functionality

3. **Conversation View Component**
   - Message list rendering
   - Scroll to bottom on new messages
   - Message input form
   - Attachment upload UI

4. **Message Components**
   - Message bubble component
   - Read receipt indicators
   - Timestamp formatting
   - Edit/delete actions

### Phase 3: Real-Time Messaging (2-3 hours)

1. **Supabase Realtime Integration**
   - Subscribe to `messages` table changes
   - Listen for new messages in active conversation
   - Update UI in real-time

2. **Typing Indicators**
   - Track typing state
   - Broadcast typing events (via custom channel or table)
   - Show "User is typing..." indicator

3. **Read Receipts**
   - Update `last_read_at` when viewing conversation
   - Update `message_reads` when message is viewed
   - Display read status on messages

### Phase 4: Job Integration (1-2 hours)

1. **Job Detail Modal**
   - Add "Messages" tab/section
   - Show job conversation
   - Quick message input

2. **Job List Integration**
   - Show message icon/badge on jobs with unread
   - Click to open job conversation

3. **Auto-Create Job Conversations**
   - Create conversation when job is created
   - Add job creator and assigned worker as participants

### Phase 5: File Attachments (2-3 hours)

1. **File Upload**
   - Upload to Supabase Storage
   - Store file URL in `messages.attachment_url`
   - Support images and documents

2. **File Display**
   - Image previews (thumbnails)
   - Document icons with download
   - Lightbox for full-size images

3. **File Size Limits**
   - Max file size validation
   - Progress indicator for uploads

### Phase 6: Advanced Features (2-3 hours)

1. **Message Search**
   - Search within conversation
   - Search across all conversations
   - Highlight search terms

2. **Message Actions**
   - Edit messages (show "edited" indicator)
   - Delete messages (soft delete)
   - Reply to messages (threading)

3. **Notifications**
   - In-app notification badge
   - Email notifications (optional)
   - Push notifications (if PWA supports)

---

## 📱 Mobile Considerations

1. **Responsive Layout**
   - Stack conversation list and view on mobile
   - Full-screen conversation view
   - Bottom navigation for messages

2. **Touch Optimizations**
   - Larger touch targets
   - Swipe actions (delete, reply)
   - Pull to refresh

3. **Mobile-Specific Features**
   - Image picker from camera
   - Voice messages (future)
   - Location sharing (future)

---

## 🔐 Security & Privacy

1. **RLS Policies**
   - Users can only see their conversations
   - Users can only send messages to conversations they're in
   - Users can only edit/delete their own messages

2. **Content Moderation** (Future)
   - Profanity filter
   - Spam detection
   - Report inappropriate messages

3. **Data Retention**
   - Auto-archive old conversations
   - Delete old messages (configurable)
   - Export conversation history

---

## 🚀 Implementation Phases

### **Phase 1: MVP (Core Messaging)** ⭐ START HERE
**Estimated Time:** 6-8 hours

**Features:**
- Direct messages between users
- Real-time message delivery
- Message history
- Basic UI (conversation list + view)
- Read receipts

**Deliverables:**
- Database schema
- `messages.html` page
- Basic conversation UI
- Real-time updates

---

### **Phase 2: Job Conversations**
**Estimated Time:** 2-3 hours

**Features:**
- Job-specific conversations
- Auto-create conversation on job creation
- Job conversation in job detail modal
- Unread message badges on jobs

---

### **Phase 3: File Attachments**
**Estimated Time:** 2-3 hours

**Features:**
- Image uploads
- Document uploads
- File previews
- Download functionality

---

### **Phase 4: Advanced Features**
**Estimated Time:** 3-4 hours

**Features:**
- Message editing
- Message deletion
- Reply threading
- Message search
- Typing indicators

---

### **Phase 5: Group Conversations** (Optional)
**Estimated Time:** 3-4 hours

**Features:**
- Create group conversations
- Add/remove participants
- Group conversation management
- Group message notifications

---

## 📊 Database Queries Examples

### Get User's Conversations
```sql
SELECT 
  c.*,
  COUNT(DISTINCT m.id) FILTER (WHERE m.created_at > cp.last_read_at) as unread_count,
  (
    SELECT content 
    FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as last_message
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE cp.user_id = $1
GROUP BY c.id, cp.last_read_at
ORDER BY c.last_message_at DESC NULLS LAST;
```

### Get Messages for Conversation
```sql
SELECT 
  m.*,
  up.full_name as sender_name,
  up.profile_picture as sender_avatar,
  COUNT(DISTINCT mr.id) as read_count,
  COUNT(DISTINCT cp.user_id) as total_participants
FROM messages m
JOIN user_profiles up ON m.sender_id = up.id
LEFT JOIN message_reads mr ON m.id = mr.message_id
LEFT JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
WHERE m.conversation_id = $1
  AND m.deleted_at IS NULL
GROUP BY m.id, up.full_name, up.profile_picture
ORDER BY m.created_at ASC;
```

---

## 🎯 Success Metrics

1. **User Engagement**
   - Messages sent per day
   - Active conversations
   - Response time

2. **Feature Adoption**
   - % of users using messaging
   - Job conversations created
   - File attachments shared

3. **Performance**
   - Message delivery time
   - Real-time update latency
   - Page load time

---

## ✅ Testing Checklist

### Functional Testing
- [ ] Send/receive messages
- [ ] Real-time updates work
- [ ] Read receipts update correctly
- [ ] File attachments upload/display
- [ ] Job conversations auto-create
- [ ] Message search works
- [ ] Edit/delete messages

### UI/UX Testing
- [ ] Responsive on mobile
- [ ] Conversation list scrolls smoothly
- [ ] Message input is accessible
- [ ] Typing indicators appear
- [ ] Unread badges update

### Security Testing
- [ ] Users can't see other users' conversations
- [ ] RLS policies work correctly
- [ ] File uploads are secure
- [ ] Message content is sanitized

### Performance Testing
- [ ] Handles 100+ messages per conversation
- [ ] Real-time updates don't lag
- [ ] Page loads quickly
- [ ] File uploads don't block UI

---

## 📝 Notes

- **Real-Time:** Use Supabase Realtime for instant message delivery
- **Storage:** Use Supabase Storage for file attachments
- **Notifications:** Integrate with existing notification system
- **Mobile:** Prioritize mobile experience (most users on mobile)
- **Scalability:** Consider pagination for large message lists

---

## 🚀 Ready to Start?

**Recommended:** Begin with **Phase 1 (MVP)** to get core messaging working, then iterate with additional features.

Would you like me to:
1. ✅ Start with Phase 1 (MVP - Core Messaging)
2. Skip to Phase 2 (Job Conversations)
3. Custom implementation plan

