// =====================================================
// In-App Messaging System
// Phase 1: MVP (Core Messaging)
// =====================================================

import { supabase } from './supabase.js';
import { showNotification } from './notifications.js';

// ========== STATE MANAGEMENT ==========
let currentUser = null;
let currentUserProfile = null;
let conversations = [];
let currentConversation = null;
let messages = [];
let realtimeChannel = null;
let realtimeSubscription = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async () => {
  // Hide page loader
  const pageLoader = document.getElementById('page-loader');
  if (pageLoader) {
    pageLoader.style.display = 'none';
  }

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    window.location.href = './index.html';
    return;
  }

  currentUser = user;

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('Error loading user profile:', profileError);
    // Create profile if doesn't exist
    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        full_name: user.email?.split('@')[0] || 'User',
        email: user.email,
        role: 'staff'
      })
      .select()
      .single();
    
    currentUserProfile = newProfile;
  } else {
    currentUserProfile = profile;
  }

  // Initialize event listeners
  initEventListeners();

  // Load conversations
  await loadConversations();

  // Initialize icons
  if (window.lucide) {
    lucide.createIcons();
  }
  
  // Initialize mobile navigation visibility after a short delay to ensure DOM is ready
  setTimeout(() => {
    // Check if we're viewing a conversation or on list
    const activeEl = document.getElementById('conversation-active');
    const isViewingConversation = activeEl && !activeEl.classList.contains('hidden');
    updateMobileNavigation(!isViewingConversation);
    
    // Initialize swipe gestures on mobile
    if (window.innerWidth < 768) {
      initPullToRefresh();
    }
  }, 100);
});

// ========== HAPTIC FEEDBACK ==========
function triggerHaptic(type = 'light') {
  if (!window.navigator || !window.navigator.vibrate) return;
  
  const patterns = {
    light: 10,        // Light tap
    medium: 20,       // Medium tap
    heavy: 30,        // Heavy tap
    success: [10, 50, 10],  // Success pattern
    error: [20, 50, 20],    // Error pattern
    warning: [15, 30, 15]   // Warning pattern
  };
  
  const pattern = patterns[type] || patterns.light;
  try {
    window.navigator.vibrate(pattern);
  } catch (e) {
    // Silently fail if haptic feedback is not supported
  }
}

// ========== EVENT LISTENERS ==========
function initEventListeners() {
  // New message button
  document.getElementById('new-message-btn')?.addEventListener('click', () => {
    triggerHaptic('light');
    openNewMessageModal();
  });
  
  // Empty state new message button
  document.getElementById('empty-state-new-message-btn')?.addEventListener('click', () => {
    triggerHaptic('medium');
    openNewMessageModal();
  });

  // Close new message modal
  document.getElementById('close-new-message-modal')?.addEventListener('click', () => {
    closeNewMessageModal();
  });

  // User search in new message modal
  const userSearch = document.getElementById('user-search');
  if (userSearch) {
    userSearch.addEventListener('input', (e) => {
      searchUsers(e.target.value);
    });
  }

  // Message form submission
  const messageForm = document.getElementById('message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      triggerHaptic('medium');
      await sendMessage();
    });
  }

  // Message input auto-resize and enable/disable send button
  const messageInput = document.getElementById('message-input');
  if (messageInput) {
    messageInput.addEventListener('input', (e) => {
      // Auto-resize textarea
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

      // Enable/disable send button
      const sendBtn = document.getElementById('send-message-btn');
      if (sendBtn) {
        sendBtn.disabled = !e.target.value.trim();
      }
    });

    // Send on Enter (but allow Shift+Enter for new line)
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (messageInput.value.trim()) {
          triggerHaptic('medium');
          sendMessage();
        } else {
          triggerHaptic('warning');
        }
      }
    });
  }

  // Conversation search
  const conversationSearch = document.getElementById('conversation-search');
  if (conversationSearch) {
    conversationSearch.addEventListener('input', (e) => {
      filterConversations(e.target.value);
    });
  }

  // Back to list button (mobile)
  document.getElementById('back-to-list-btn')?.addEventListener('click', () => {
    triggerHaptic('light');
    showConversationList();
  });

  // Back to dashboard button (mobile)
  document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
    triggerHaptic('light');
    window.location.href = './dashboard.html';
  });

  // Floating Action Button for new message (mobile)
  document.getElementById('fab-new-message')?.addEventListener('click', () => {
    triggerHaptic('medium');
    openNewMessageModal();
  });

  // Close modal on backdrop click
  const newMessageModal = document.getElementById('new-message-modal');
  if (newMessageModal) {
    newMessageModal.addEventListener('click', (e) => {
      if (e.target === newMessageModal) {
        closeNewMessageModal();
      }
    });
  }
}

// ========== LOAD CONVERSATIONS ==========
async function loadConversations() {
  try {
    const loadingEl = document.getElementById('conversations-loading');
    const emptyEl = document.getElementById('conversations-empty');
    const listEl = document.getElementById('conversations-list');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (listEl) listEl.classList.add('hidden');

    // Get user's conversations with participant info
    // First, get participant records
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', currentUser.id);

    if (participantError) throw participantError;

    if (!participantData || participantData.length === 0) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    // Get conversation details separately
    const conversationIds = participantData.map(p => p.conversation_id);
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('id, type, job_id, title, created_by, created_at, updated_at, last_message_at')
      .in('id', conversationIds)
      .order('last_message_at', { ascending: false });

    if (conversationsError) throw conversationsError;

    if (!conversationsData || conversationsData.length === 0) {
      if (loadingEl) loadingEl.classList.add('hidden');
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }

    // Get other participants for each conversation
    const { data: allParticipants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id')
      .in('conversation_id', conversationIds);

    if (participantsError) throw participantsError;

    // Get user profiles for participants separately (to avoid relationship errors)
    const userIds = [...new Set((allParticipants || []).map(p => p.user_id))];
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    // Create a map of user_id -> profile
    const profilesMap = new Map((userProfiles || []).map(profile => [profile.id, profile]));

    // Get last messages for unread counts
    const { data: lastMessages, error: messagesError } = await supabase
      .from('messages')
      .select('conversation_id, created_at')
      .in('conversation_id', conversationIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // Build conversations array with participant info
    conversations = participantData.map(participant => {
      const conversation = (conversationsData || []).find(c => c.id === participant.conversation_id);
      if (!conversation) return null; // Skip if conversation not found

      const otherParticipants = (allParticipants || [])
        .filter(p => p.conversation_id === conversation.id && p.user_id !== currentUser.id)
        .map(p => profilesMap.get(p.user_id))
        .filter(Boolean); // Remove undefined entries

      // Get last message for this conversation
      const lastMessage = (lastMessages || []).find(m => m.conversation_id === conversation.id);

      // Calculate unread count
      const unreadCount = lastMessage && participant.last_read_at && 
        new Date(lastMessage.created_at) > new Date(participant.last_read_at)
        ? 1 : 0; // Simplified: 1 if there's a new message, 0 otherwise

      return {
        ...conversation,
        otherParticipants,
        lastReadAt: participant.last_read_at,
        unreadCount
      };
    }).filter(Boolean); // Remove null entries

    // Sort conversations by last_message_at (most recent first)
    // If last_message_at is null, use updated_at or created_at
    conversations.sort((a, b) => {
      const aTime = new Date(a.last_message_at || a.updated_at || a.created_at);
      const bTime = new Date(b.last_message_at || b.updated_at || b.created_at);
      return bTime - aTime; // Most recent first
    });

    // Render conversations
    renderConversations();

    if (loadingEl) loadingEl.classList.add('hidden');
    if (listEl) listEl.classList.remove('hidden');

    // Auto-select most recent conversation if none is selected
    if (conversations.length > 0 && !currentConversation) {
      const mostRecentConversation = conversations[0];
      await selectConversation(mostRecentConversation.id);
    } else {
      // If no conversation selected, show back button and FAB (on conversation list)
      updateMobileNavigation(true);
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
    toast?.error('Failed to load conversations', 'Error');
  }
}

// ========== RENDER CONVERSATIONS ==========
function renderConversations(filteredConversations = null) {
  const listEl = document.getElementById('conversations-list');
  if (!listEl) return;

  const conversationsToRender = filteredConversations || conversations;

  if (conversationsToRender.length === 0) {
    listEl.innerHTML = '';
    document.getElementById('conversations-empty')?.classList.remove('hidden');
    return;
  }

  document.getElementById('conversations-empty')?.classList.add('hidden');

  listEl.innerHTML = conversationsToRender.map(conv => {
    const otherUser = conv.otherParticipants?.[0];
    const displayName = otherUser?.full_name || otherUser?.email || 'Unknown User';
    const initials = getInitials(displayName);
    const avatarUrl = otherUser?.profile_picture;
    const lastMessageTime = conv.last_message_at ? formatRelativeTime(conv.last_message_at) : '';

    return `
      <div class="conversation-item-swipe-container relative overflow-hidden">
        <div 
          class="conversation-item p-4 border-b border-nfgray dark:border-gray-700 hover:bg-nfglight dark:hover:bg-gray-700 cursor-pointer transition-all relative z-10 bg-white dark:bg-gray-800 ${currentConversation?.id === conv.id ? 'bg-nfglight dark:bg-gray-700' : ''}"
          data-conversation-id="${conv.id}"
        >
          <div class="flex items-center gap-3">
            <div class="relative flex-shrink-0">
              ${avatarUrl 
                ? `<img src="${avatarUrl}" alt="${displayName}" class="w-12 h-12 rounded-full object-cover">`
                : `<div class="w-12 h-12 rounded-full bg-nfgblue dark:bg-blue-900 flex items-center justify-center text-white font-semibold text-sm">${initials}</div>`
              }
              ${conv.unreadCount > 0 ? `<span class="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-semibold">${conv.unreadCount}</span>` : ''}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h3 class="font-semibold text-sm truncate ${conv.unreadCount > 0 ? 'font-bold' : ''}">${escapeHtml(displayName)}</h3>
                ${lastMessageTime ? `<span class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">${lastMessageTime}</span>` : ''}
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${lastMessageTime ? 'Tap to view messages' : 'No messages yet'}</p>
            </div>
          </div>
        </div>
        <!-- Swipe Actions (hidden by default, revealed on swipe left) -->
        <div class="swipe-actions absolute right-0 top-0 bottom-0 flex items-center gap-2 px-4 bg-gradient-to-r from-transparent to-red-500 dark:to-red-600 opacity-0 pointer-events-none transition-opacity">
          <button class="swipe-action-btn archive-btn p-3 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition" data-action="archive" title="Archive">
            <i data-lucide="archive" class="w-5 h-5"></i>
          </button>
          <button class="swipe-action-btn delete-btn p-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition" data-action="delete" title="Delete">
            <i data-lucide="trash-2" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners
  listEl.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const conversationId = item.dataset.conversationId;
      selectConversation(conversationId);
    });
  });

  // Initialize swipe gestures for conversation items (mobile only)
  if (window.innerWidth < 768) {
    initConversationItemSwipe();
  }

  // Re-create icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

// ========== SELECT CONVERSATION ==========
async function selectConversation(conversationId) {
  try {
    currentConversation = conversations.find(c => c.id === conversationId);
    if (!currentConversation) {
      console.error('Conversation not found:', conversationId);
      return;
    }

    // Update UI
    showConversationView();
    updateConversationHeader();
    
    // Load messages
    await loadMessages(conversationId);

    // Mark as read
    await markConversationAsRead(conversationId);

    // Subscribe to real-time updates
    subscribeToMessages(conversationId);

    // Update conversation list highlight
    document.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.remove('bg-nfglight', 'dark:bg-gray-700');
      if (item.dataset.conversationId === conversationId) {
        item.classList.add('bg-nfglight', 'dark:bg-gray-700');
      }
    });
  } catch (error) {
    console.error('Error selecting conversation:', error);
    toast?.error('Failed to load conversation', 'Error');
  }
}

// ========== LOAD MESSAGES ==========
async function loadMessages(conversationId) {
  try {
    const loadingEl = document.getElementById('messages-loading');
    const emptyEl = document.getElementById('messages-empty');
    const listEl = document.getElementById('messages-list');

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');
    if (listEl) listEl.classList.add('hidden');

    // Fetch messages
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    messages = messagesData || [];

    // Fetch sender profiles separately (to avoid PostgREST relationship errors)
    if (messages.length > 0) {
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: senderProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, profile_picture')
        .in('id', senderIds);

      if (profilesError) {
        console.warn('Error fetching sender profiles:', profilesError);
      } else {
        // Create a map of sender_id -> profile
        const profilesMap = new Map((senderProfiles || []).map(profile => [profile.id, profile]));
        
        // Attach sender profiles to messages
        messages = messages.map(message => ({
          ...message,
          sender: profilesMap.get(message.sender_id) || null
        }));
      }
    }

    // Get read receipts
    // Note: RLS policy requires checking conversation participation for each message
    // If this query fails with 403, it's an RLS issue - we'll continue without read receipts
    if (messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      const { data: readsData, error: readsError } = await supabase
        .from('message_reads')
        .select('message_id, user_id')
        .in('message_id', messageIds);

      // If RLS blocks the query, log warning but continue (read receipts are not critical)
      if (readsError) {
        if (readsError.code === 'PGRST301' || readsError.message?.includes('403') || readsError.message?.includes('permission')) {
          console.warn('[Messages] Could not load read receipts - RLS policy may be blocking. This is non-critical.');
        } else {
          console.error('[Messages] Error loading read receipts:', readsError);
        }
      }

      // Attach read status to messages (if data was loaded)
      if (readsData) {
        messages.forEach(message => {
          message.readBy = (readsData || [])
            .filter(r => r.message_id === message.id)
            .map(r => r.user_id);
        });
      } else {
        // No read receipts available - set empty array
        messages.forEach(message => {
          message.readBy = [];
        });
      }
    }

    // Render messages
    renderMessages();

    if (loadingEl) loadingEl.classList.add('hidden');
    if (messages.length === 0) {
      if (emptyEl) emptyEl.classList.remove('hidden');
    } else {
      if (listEl) listEl.classList.remove('hidden');
      scrollToBottom();
    }
  } catch (error) {
    console.error('Error loading messages:', error);
    toast?.error('Failed to load messages', 'Error');
  }
}

// ========== RENDER MESSAGES ==========
function renderMessages() {
  const listEl = document.getElementById('messages-list');
  if (!listEl) return;

  listEl.innerHTML = messages.map((message, index) => {
    const isSent = message.sender_id === currentUser.id;
    const sender = message.sender || {};
    const senderName = sender.full_name || sender.email || 'Unknown';
    const senderInitials = getInitials(senderName);
    const senderAvatar = sender.profile_picture;
    const timestamp = formatMessageTime(message.created_at);
    const isEdited = message.is_edited;
    const isRead = message.readBy && message.readBy.length > 0;

    // Group messages from same sender (show avatar only on first message)
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMessage || prevMessage.sender_id !== message.sender_id || 
      (new Date(message.created_at) - new Date(prevMessage.created_at)) > 5 * 60 * 1000; // 5 minutes

    return `
      <div class="message-item flex items-end gap-2 ${isSent ? 'flex-row-reverse' : ''}" data-message-id="${message.id}">
        ${showAvatar && !isSent ? `
          <div class="flex-shrink-0">
            ${senderAvatar 
              ? `<img src="${senderAvatar}" alt="${senderName}" class="w-8 h-8 rounded-full object-cover">`
              : `<div class="w-8 h-8 rounded-full bg-nfgblue dark:bg-blue-900 flex items-center justify-center text-white text-xs font-semibold">${senderInitials}</div>`
            }
          </div>
        ` : !isSent ? '<div class="w-8"></div>' : ''}
        <div class="message-bubble ${isSent ? 'message-bubble-sent' : 'message-bubble-received'} px-4 py-2">
          ${!isSent && showAvatar ? `<p class="text-xs font-semibold mb-1 ${isSent ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}">${escapeHtml(senderName)}</p>` : ''}
          <p class="text-sm whitespace-pre-wrap">${escapeHtml(message.content || '')}</p>
          <div class="flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}">
            <span class="text-xs ${isSent ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}">${timestamp}</span>
            ${isEdited ? `<span class="text-xs ${isSent ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}">(edited)</span>` : ''}
            ${isSent && isRead ? `<i data-lucide="check-check" class="w-3 h-3 text-blue-300"></i>` : isSent ? `<i data-lucide="check" class="w-3 h-3 text-white/70"></i>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Re-create icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

// ========== SEND MESSAGE ==========
async function sendMessage() {
  const messageInput = document.getElementById('message-input');
  if (!messageInput || !currentConversation) {
    toast?.error('No conversation selected', 'Error');
    triggerHaptic('error');
    return;
  }

  const content = messageInput.value.trim();
  if (!content) {
    triggerHaptic('warning');
    return;
  }

  try {
    // Disable input and button
    messageInput.disabled = true;
    const sendBtn = document.getElementById('send-message-btn');
    if (sendBtn) sendBtn.disabled = true;

    // Insert message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConversation.id,
        sender_id: currentUser.id,
        content: content,
        message_type: 'text'
      })
      .select('*')
      .single();

    if (insertError) {
      triggerHaptic('error');
      throw insertError;
    }

    // Fetch sender profile separately (to avoid PostgREST relationship errors)
    let senderProfile = null;
    if (newMessage) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, profile_picture')
        .eq('id', newMessage.sender_id)
        .single();
      
      senderProfile = profile;
    }

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;

    // Add message to local array with sender profile
    const messageWithSender = {
      ...newMessage,
      sender: senderProfile || null,
      readBy: []
    };
    messages.push(messageWithSender);

    // Re-render messages with animation
    renderMessages();
    
    // Ensure conversation view stays visible
    showConversationView();
    
    // Scroll to bottom after a short delay to ensure DOM is updated
    setTimeout(() => {
      scrollToBottom();
      // Trigger success haptic after scroll
      triggerHaptic('success');
    }, 50);
    
    // Mark as read
    await markConversationAsRead(currentConversation.id);

    // Reload conversations to update last message
    await loadConversations();
  } catch (error) {
    console.error('Error sending message:', error);
    triggerHaptic('error');
    toast?.error('Failed to send message', 'Error');
  } finally {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    if (messageInput) messageInput.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ========== REAL-TIME SUBSCRIPTION ==========
function subscribeToMessages(conversationId) {
  // Unsubscribe from previous channel
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
  }

  // Subscribe to new messages
  realtimeSubscription = supabase
    .channel(`messages:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, async (payload) => {
      // New message received
      const newMessage = payload.new;

      // Check if message already exists in array (prevents duplicates from own sends)
      const existingIndex = messages.findIndex(m => m.id === newMessage.id);
      if (existingIndex !== -1) {
        // Message already exists, update it with any new data (like read receipts)
        if (newMessage.sender_id === currentUser.id) {
          // This is our own message that we already added optimistically
          // Just update the existing message with any new data
          messages[existingIndex] = { ...messages[existingIndex], ...newMessage };
        } else {
          // Update existing message with new data
          messages[existingIndex] = { ...messages[existingIndex], ...newMessage };
        }
        renderMessages();
        return;
      }

      // Fetch sender info
      const { data: sender } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, profile_picture')
        .eq('id', newMessage.sender_id)
        .single();

      newMessage.sender = sender;
      newMessage.readBy = [];

      // Add to messages array
      messages.push(newMessage);

      // Re-render
      renderMessages();
      
      // Ensure conversation view stays visible
      if (currentConversation && currentConversation.id === conversationId) {
        showConversationView();
        
        // Scroll to bottom after a short delay
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }

      // Mark as read if it's not from current user
      if (newMessage.sender_id !== currentUser.id) {
        await markConversationAsRead(conversationId);
      }

      // Reload conversations
      await loadConversations();
    })
    .subscribe();
}

// ========== MARK AS READ ==========
async function markConversationAsRead(conversationId) {
  try {
    // Update participant's last_read_at
    await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', currentUser.id);

    // Mark all unread messages as read
    const unreadMessages = messages.filter(m => 
      m.sender_id !== currentUser.id && 
      (!m.readBy || !m.readBy.includes(currentUser.id))
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map(m => m.id);
      
      // Insert read receipts (one at a time to handle conflicts gracefully)
      // Use insert with ignoreDuplicates instead of upsert for better RLS compatibility
      for (const messageId of messageIds) {
        try {
          await supabase
            .from('message_reads')
            .insert({
              message_id: messageId,
              user_id: currentUser.id,
              read_at: new Date().toISOString()
            });
        } catch (error) {
          // Ignore duplicate key errors (already marked as read)
          if (error.code !== '23505' && !error.message?.includes('duplicate')) {
            console.warn('[Messages] Error marking message as read:', error);
          }
        }
      }

      // Update local read status
      unreadMessages.forEach(message => {
        if (!message.readBy) message.readBy = [];
        if (!message.readBy.includes(currentUser.id)) {
          message.readBy.push(currentUser.id);
        }
      });

      // Re-render to show read receipts
      renderMessages();
    }
  } catch (error) {
    console.error('Error marking conversation as read:', error);
  }
}

// ========== NEW MESSAGE MODAL ==========
async function openNewMessageModal() {
  const modal = document.getElementById('new-message-modal');
  if (!modal) return;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Load users
  await loadUsers();

  // Re-create icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

function closeNewMessageModal() {
  const modal = document.getElementById('new-message-modal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');

  // Clear search
  const userSearch = document.getElementById('user-search');
  if (userSearch) userSearch.value = '';

  // Clear users list
  const usersList = document.getElementById('users-list');
  if (usersList) usersList.innerHTML = '';
}

async function loadUsers(searchQuery = '') {
  try {
    let query = supabase
      .from('user_profiles')
      .select('id, full_name, email, profile_picture, role')
      .neq('id', currentUser.id)
      .order('full_name');

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data: users, error } = await query.limit(20);

    if (error) throw error;

    renderUsersList(users || []);
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function searchUsers(query) {
  loadUsers(query);
}

function renderUsersList(users) {
  const usersList = document.getElementById('users-list');
  if (!usersList) return;

  if (users.length === 0) {
    usersList.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No users found</p>';
    return;
  }

  usersList.innerHTML = users.map(user => {
    const displayName = user.full_name || user.email || 'Unknown';
    const initials = getInitials(displayName);
    const avatarUrl = user.profile_picture;

    return `
      <div 
        class="flex items-center gap-3 p-3 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700 cursor-pointer transition"
        data-user-id="${user.id}"
      >
        ${avatarUrl 
          ? `<img src="${avatarUrl}" alt="${displayName}" class="w-10 h-10 rounded-full object-cover">`
          : `<div class="w-10 h-10 rounded-full bg-nfgblue dark:bg-blue-900 flex items-center justify-center text-white font-semibold text-sm">${initials}</div>`
        }
        <div class="flex-1 min-w-0">
          <h4 class="font-medium text-sm truncate">${escapeHtml(displayName)}</h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${escapeHtml(user.email || '')}</p>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listeners
  usersList.querySelectorAll('[data-user-id]').forEach(item => {
    item.addEventListener('click', async () => {
      const userId = item.dataset.userId;
      await createOrSelectConversation(userId);
    });
  });
}

// ========== CREATE OR SELECT CONVERSATION ==========
async function createOrSelectConversation(otherUserId) {
  try {
    // Call helper function to create or get existing conversation
    const { data, error } = await supabase.rpc('create_direct_conversation', {
      user1_id: currentUser.id,
      user2_id: otherUserId
    });

    if (error) {
      console.error('RPC Error details:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No conversation ID returned from function');
    }

    const conversationId = data;

    // Close modal
    closeNewMessageModal();

    // Reload conversations
    await loadConversations();

    // Select the conversation (this will show the view)
    await selectConversation(conversationId);
    
    // Ensure view is visible
    showConversationView();
  } catch (error) {
    console.error('Error creating conversation:', error);
    const errorMessage = error?.message || error?.details || 'Failed to create conversation';
    toast?.error(errorMessage, 'Error');
  }
}

// ========== UI HELPERS ==========
function showConversationView() {
  const emptyEl = document.getElementById('conversation-empty');
  const activeEl = document.getElementById('conversation-active');
  const listEl = document.getElementById('conversation-list');
  const viewEl = document.getElementById('conversation-view');

  if (!currentConversation) {
    // No conversation selected, show empty state with fade in
    if (emptyEl) {
      emptyEl.classList.remove('hidden');
      emptyEl.style.opacity = '0';
      requestAnimationFrame(() => {
        emptyEl.style.opacity = '1';
      });
    }
    if (activeEl) {
      activeEl.classList.add('hidden');
      activeEl.style.opacity = '0';
    }
    // Show back button and FAB when on empty state (conversation list)
    updateMobileNavigation(true);
    return;
  }

  // Conversation is selected, show active view with smooth transition
  if (emptyEl) {
    emptyEl.style.opacity = '0';
    setTimeout(() => {
      emptyEl.classList.add('hidden');
    }, 200);
  }
  if (activeEl) {
    activeEl.classList.remove('hidden');
    activeEl.style.opacity = '0';
    requestAnimationFrame(() => {
      activeEl.style.opacity = '1';
    });
  }
  
  // On mobile, hide list and show view
  if (window.innerWidth < 768) {
    if (listEl) {
      listEl.style.opacity = '0';
      setTimeout(() => {
        listEl.classList.add('hidden');
      }, 200);
    }
    if (viewEl) {
      viewEl.classList.remove('hidden');
      viewEl.classList.add('flex');
      viewEl.style.opacity = '0';
      requestAnimationFrame(() => {
        viewEl.style.opacity = '1';
      });
    }
    // Hide back button and FAB when viewing conversation
    updateMobileNavigation(false);
    // Initialize swipe to go back gesture
    setTimeout(() => {
      initSwipeToGoBack();
    }, 100);
    // Ensure back button icon is visible on mobile
    if (window.lucide) {
      lucide.createIcons();
    }
  } else {
    // On desktop, show both
    if (viewEl) {
      viewEl.classList.remove('hidden');
      viewEl.classList.add('md:block');
      viewEl.style.opacity = '1';
    }
    // Always show back button and FAB on desktop (they're hidden via CSS)
    updateMobileNavigation(true);
  }
}

function showConversationList() {
  const listEl = document.getElementById('conversation-list');
  const viewEl = document.getElementById('conversation-view');

  if (listEl) {
    listEl.classList.remove('hidden');
    listEl.style.opacity = '0';
    requestAnimationFrame(() => {
      listEl.style.opacity = '1';
    });
  }
  if (viewEl) {
    viewEl.style.opacity = '0';
    setTimeout(() => {
      viewEl.classList.add('hidden');
      viewEl.classList.remove('flex', 'md:block');
    }, 200);
  }
  
  // Clear current conversation
  currentConversation = null;
  
  // Show back button and FAB when on conversation list
  updateMobileNavigation(true);
}

// Update mobile navigation visibility (back button and FAB)
function updateMobileNavigation(show) {
  const backBtn = document.getElementById('back-to-dashboard-btn');
  const fab = document.getElementById('fab-new-message');
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // On mobile, show/hide based on state
    if (backBtn) {
      if (show) {
        backBtn.classList.remove('hidden');
      } else {
        backBtn.classList.add('hidden');
      }
    }
    
    if (fab) {
      // FAB should only show when on conversation list (not viewing conversation)
      if (show) {
        fab.classList.remove('hidden');
      } else {
        fab.classList.add('hidden');
      }
    }
  } else {
    // On desktop, always hide (they're mobile-only)
    if (backBtn) backBtn.classList.add('hidden');
    if (fab) fab.classList.add('hidden');
  }
  
  // Recreate icons when visibility changes
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Handle window resize to update mobile navigation visibility
window.addEventListener('resize', () => {
  // Check current view state and update navigation accordingly
  const activeEl = document.getElementById('conversation-active');
  const isViewingConversation = activeEl && !activeEl.classList.contains('hidden');
  updateMobileNavigation(!isViewingConversation);
  
  // Reinitialize swipe gestures if switching to/from mobile
  if (window.innerWidth < 768) {
    initSwipeToGoBack();
    initConversationItemSwipe();
    initPullToRefresh();
  }
});

// ========== SWIPE GESTURES (Mobile Only) ==========

// 1. Swipe right to go back (conversation → list)
function initSwipeToGoBack() {
  const conversationView = document.getElementById('conversation-active');
  if (!conversationView || window.innerWidth >= 768) return;
  
  let touchStartX = 0;
  let touchStartY = 0;
  let isSwiping = false;
  let startTime = 0;
  
  conversationView.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    startTime = Date.now();
    isSwiping = false;
  }, { passive: true });
  
  conversationView.addEventListener('touchmove', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Check if horizontal swipe (ignore if too much vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping = true;
      
      // Only allow swipe right (positive deltaX)
      if (deltaX > 0 && deltaX < 100) {
        // Visual feedback: slight translate
        conversationView.style.transform = `translateX(${deltaX}px)`;
        conversationView.style.transition = 'none';
        conversationView.style.opacity = `${1 - (deltaX / 200)}`;
      }
    }
  }, { passive: true });
  
  conversationView.addEventListener('touchend', (e) => {
    if (!touchStartX || !touchStartY) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchEndX - touchStartX;
    const swipeTime = Date.now() - startTime;
    const swipeSpeed = Math.abs(deltaX) / swipeTime; // pixels per ms
    
    // Reset transform
    conversationView.style.transform = '';
    conversationView.style.transition = '';
    conversationView.style.opacity = '';
    
    // Swipe right to go back (threshold: 50px or fast swipe)
    if (isSwiping && deltaX > 0 && currentConversation) {
      if (deltaX > 50 || (deltaX > 30 && swipeSpeed > 0.5)) {
        triggerHaptic('medium');
        showConversationList();
      }
    }
    
    touchStartX = 0;
    touchStartY = 0;
    isSwiping = false;
  }, { passive: true });
}

// 2. Swipe left on conversation items to reveal actions
function initConversationItemSwipe() {
  const conversationItems = document.querySelectorAll('.conversation-item');
  if (conversationItems.length === 0 || window.innerWidth >= 768) return;
  
  conversationItems.forEach(item => {
    const container = item.closest('.conversation-item-swipe-container');
    if (!container) return;
    
    const actions = container.querySelector('.swipe-actions');
    if (!actions) return;
    
    let touchStartX = 0;
    let currentX = 0;
    let isSwipeActive = false;
    let isRevealed = false;
    
    // Track revealed items globally to close others
    const revealedItems = new Set();
    
    item.addEventListener('touchstart', (e) => {
      // Close other revealed items
      revealedItems.forEach(otherItem => {
        if (otherItem !== item) {
          const otherContainer = otherItem.closest('.conversation-item-swipe-container');
          const otherActions = otherContainer?.querySelector('.swipe-actions');
          if (otherContainer && otherActions) {
            otherItem.style.transform = 'translateX(0)';
            otherActions.style.opacity = '0';
            otherActions.style.pointerEvents = 'none';
          }
          revealedItems.delete(otherItem);
        }
      });
      
      touchStartX = e.touches[0].clientX;
      isSwipeActive = false;
    }, { passive: true });
    
    item.addEventListener('touchmove', (e) => {
      if (!touchStartX) return;
      
      const deltaX = e.touches[0].clientX - touchStartX;
      
      // Only allow left swipe (negative deltaX)
      if (deltaX < 0 && Math.abs(deltaX) > 10) {
        isSwipeActive = true;
        currentX = Math.max(deltaX, -140); // Max reveal 140px
        item.style.transform = `translateX(${currentX}px)`;
        item.style.transition = 'none';
        
        // Show actions with opacity
        const opacity = Math.min(Math.abs(currentX) / 140, 1);
        actions.style.opacity = opacity.toString();
        actions.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      } else if (deltaX > 0 && isRevealed) {
        // Swiping back to close
        currentX = Math.max(-140 + deltaX, -140);
        item.style.transform = `translateX(${currentX}px)`;
        item.style.transition = 'none';
        
        const opacity = Math.max(Math.abs(currentX) / 140, 0);
        actions.style.opacity = opacity.toString();
        actions.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      }
    }, { passive: true });
    
    item.addEventListener('touchend', () => {
      if (!isSwipeActive && !isRevealed) {
        touchStartX = 0;
        return;
      }
      
      item.style.transition = 'transform 0.2s ease-out';
      
      if (Math.abs(currentX) > 70) {
        // Snap to revealed position
        triggerHaptic('light');
        item.style.transform = 'translateX(-140px)';
        actions.style.opacity = '1';
        actions.style.pointerEvents = 'auto';
        isRevealed = true;
        revealedItems.add(item);
      } else {
        // Snap back
        item.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
        actions.style.pointerEvents = 'none';
        isRevealed = false;
        revealedItems.delete(item);
      }
      
      touchStartX = 0;
      isSwipeActive = false;
      
      setTimeout(() => {
        item.style.transition = '';
      }, 200);
    }, { passive: true });
    
    // Handle action button clicks
    actions.querySelectorAll('.swipe-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const conversationId = item.dataset.conversationId;
        const action = btn.dataset.action;
        
        // Close swipe actions first
        item.style.transform = 'translateX(0)';
        actions.style.opacity = '0';
        actions.style.pointerEvents = 'none';
        isRevealed = false;
        revealedItems.delete(item);
        
        if (action === 'archive') {
          triggerHaptic('medium');
          // TODO: Implement archive conversation
          toast?.info('Archive feature coming soon', 'Info');
        } else if (action === 'delete') {
          triggerHaptic('heavy');
          // TODO: Implement delete conversation
          if (confirm('Are you sure you want to delete this conversation?')) {
            triggerHaptic('success');
            toast?.info('Delete feature coming soon', 'Info');
          }
        }
        
        // Recreate icons after action
        if (window.lucide) {
          lucide.createIcons();
        }
      });
    });
  });
  
  // Close revealed items when clicking outside
  document.addEventListener('click', (e) => {
    if (revealedItems.size > 0) {
      revealedItems.forEach(revealedItem => {
        const container = revealedItem.closest('.conversation-item-swipe-container');
        if (container && !container.contains(e.target)) {
          const actions = container.querySelector('.swipe-actions');
          if (actions) {
            revealedItem.style.transform = 'translateX(0)';
            actions.style.opacity = '0';
            actions.style.pointerEvents = 'none';
            revealedItems.delete(revealedItem);
          }
        }
      });
    }
  });
}

// 3. Pull to refresh on conversation list
function initPullToRefresh() {
  const conversationsContainer = document.getElementById('conversations-container');
  if (!conversationsContainer || window.innerWidth >= 768) return;
  
  let touchStartY = 0;
  let isPulling = false;
  let pullDistance = 0;
  
  // Create pull-to-refresh indicator
  let indicator = document.getElementById('pull-to-refresh-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'pull-to-refresh-indicator';
    indicator.className = 'pull-to-refresh-indicator absolute top-0 left-0 right-0 flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none';
    indicator.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i><span>Pull to refresh</span>';
    conversationsContainer.style.position = 'relative';
    conversationsContainer.insertBefore(indicator, conversationsContainer.firstChild);
  }
  
  conversationsContainer.addEventListener('touchstart', (e) => {
    // Only if at top of scroll
    if (conversationsContainer.scrollTop === 0) {
      touchStartY = e.touches[0].clientY;
      isPulling = false;
      pullDistance = 0;
    }
  }, { passive: true });
  
  conversationsContainer.addEventListener('touchmove', (e) => {
    if (touchStartY === 0 || conversationsContainer.scrollTop > 0) return;
    
    const deltaY = e.touches[0].clientY - touchStartY;
    
    if (deltaY > 0) {
      isPulling = true;
      pullDistance = Math.min(deltaY, 80);
      
      // Visual feedback
      const opacity = Math.min(pullDistance / 80, 1);
      indicator.style.opacity = opacity.toString();
      indicator.style.transform = `translateY(${pullDistance - 40}px)`;
      
      // Rotate icon based on pull distance
      const icon = indicator.querySelector('i');
      if (icon) {
        icon.style.transform = `rotate(${pullDistance * 4.5}deg)`;
      }
      
      // Change text when ready to refresh
      const text = indicator.querySelector('span');
      if (text) {
        text.textContent = pullDistance >= 70 ? 'Release to refresh' : 'Pull to refresh';
      }
    }
  }, { passive: true });
  
  conversationsContainer.addEventListener('touchend', () => {
    if (isPulling && pullDistance >= 70) {
      // Trigger refresh with haptic feedback
      triggerHaptic('medium');
      indicator.querySelector('i').classList.add('animate-spin');
      loadConversations().finally(() => {
        triggerHaptic('success');
        setTimeout(() => {
          indicator.querySelector('i').classList.remove('animate-spin');
          indicator.style.opacity = '0';
          indicator.style.transform = 'translateY(-40px)';
          const icon = indicator.querySelector('i');
          if (icon) icon.style.transform = 'rotate(0deg)';
          const text = indicator.querySelector('span');
          if (text) text.textContent = 'Pull to refresh';
        }, 300);
      });
    } else {
      // Reset
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-40px)';
      const icon = indicator.querySelector('i');
      if (icon) icon.style.transform = 'rotate(0deg)';
      const text = indicator.querySelector('span');
      if (text) text.textContent = 'Pull to refresh';
    }
    
    touchStartY = 0;
    isPulling = false;
    pullDistance = 0;
  }, { passive: true });
}

function updateConversationHeader() {
  if (!currentConversation) return;

  const otherUser = currentConversation.otherParticipants?.[0];
  const displayName = otherUser?.full_name || otherUser?.email || 'Unknown User';
  const initials = getInitials(displayName);
  const avatarUrl = otherUser?.profile_picture;

  const headerName = document.getElementById('conversation-header-name');
  const headerAvatar = document.getElementById('conversation-header-avatar');
  const headerStatus = document.getElementById('conversation-header-status');

  if (headerName) headerName.textContent = displayName;
  if (headerStatus) headerStatus.textContent = 'Online'; // TODO: Implement online status
  if (headerAvatar) {
    if (avatarUrl) {
      headerAvatar.innerHTML = `<img src="${avatarUrl}" alt="${displayName}" class="w-full h-full rounded-full object-cover">`;
    } else {
      headerAvatar.textContent = initials;
    }
  }
}

function scrollToBottom() {
  const container = document.getElementById('messages-container');
  if (container) {
    // Use multiple requestAnimationFrame calls to ensure scroll happens after DOM updates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
        
        // Ensure the container is actually scrollable
        if (container.scrollHeight > container.clientHeight) {
          container.scrollTop = container.scrollHeight;
        }
      });
    });
  }
}

function filterConversations(query) {
  if (!query.trim()) {
    renderConversations();
    return;
  }

  const filtered = conversations.filter(conv => {
    const otherUser = conv.otherParticipants?.[0];
    const name = (otherUser?.full_name || otherUser?.email || '').toLowerCase();
    return name.includes(query.toLowerCase());
  });

  renderConversations(filtered);
}

// ========== UTILITY FUNCTIONS ==========
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatMessageTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === new Date(now - 86400000).toDateString();

  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } else if (isYesterday) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== TOAST NOTIFICATIONS ==========
// Use existing toast system
const toast = {
  success: (message, title) => {
    showNotification(message, 'success', title);
  },
  error: (message, title) => {
    showNotification(message, 'error', title);
  }
};

