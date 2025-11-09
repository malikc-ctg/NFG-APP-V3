/**
 * NFG Notification Center
 * Manages in-app notifications with real-time updates
 */

import { supabase } from './supabase.js';
import { toast } from './notifications.js';
import { enablePushNotifications, disablePushNotifications, getPushStatus } from './pwa.js';

// Notification types and their icons
const NOTIFICATION_TYPE_ICONS = {
  job_assigned: '📋',
  job_completed: '✅',
  job_updated: '📝',
  booking_created: '📅',
  booking_updated: '🔄',
  booking_cancelled: '❌',
  mention: '💬',
  system: '🔔'
};

// Cache
let notificationCache = [];
let unreadCount = 0;
let realtimeSubscription = null;
let pollingInterval = null;
const pushStatusEventName = 'nfg:push-status-changed';

/**
 * Initialize notification center
 */
export async function initNotificationCenter() {
  try {
    // Create notification bell UI if it doesn't exist
    createNotificationBell();
    
    // Load notifications
    await loadNotifications();
    
    // Update unread count
    await updateUnreadCount();
    
    // Setup real-time updates
    setupRealtimeUpdates();
    
    // Setup polling as fallback (every 30 seconds)
    setupPolling(30000);
    
    // Auto-refresh unread count every minute
    setInterval(updateUnreadCount, 60000);
    
    console.log('✅ Notification center initialized');
  } catch (error) {
    console.error('❌ Failed to initialize notification center:', error);
  }
}

/**
 * Create notification bell button in header
 */
function createNotificationBell() {
  // Check if already exists
  if (document.getElementById('notification-bell-container')) {
    return;
  }
  
  const header = document.querySelector('header .flex.items-center.gap-2:last-child');
  if (!header) {
    console.warn('⚠️ Could not find header to insert notification bell');
    return;
  }
  
  const container = document.createElement('div');
  container.id = 'notification-bell-container';
  container.className = 'relative';
  
  container.innerHTML = `
    <button id="notification-bell" class="notification-bell" aria-label="Notifications">
      <i data-lucide="bell" class="w-5 h-5"></i>
      <span id="notification-badge" class="notification-badge hidden">0</span>
    </button>
    <div id="notification-center" class="notification-center">
      <div class="notification-header">
        <h3>Notifications</h3>
        <div class="notification-actions">
          <button id="toggle-push-btn" class="notification-action-btn"></button>
          <button id="mark-all-read-btn" class="notification-action-btn">Mark all read</button>
        </div>
      </div>
      <div id="notification-list" class="notification-list">
        <div class="notification-loading">
          <div class="notification-spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
      <div class="notification-footer">
        <a href="#" id="view-all-notifications" class="notification-footer-link">View All Notifications</a>
      </div>
    </div>
  `;
  
  // Insert before first child or append
  header.insertBefore(container, header.firstChild);
  
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  // Setup event listeners
  setupNotificationListeners();
}

/**
 * Setup event listeners for notification center
 */
function setupNotificationListeners() {
  const bell = document.getElementById('notification-bell');
  const center = document.getElementById('notification-center');
  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  const viewAllBtn = document.getElementById('view-all-notifications');
  const togglePushBtn = document.getElementById('toggle-push-btn');
  
  if (!bell || !center) return;
  
  // Toggle notification center
  bell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = center.classList.contains('open');
    
    if (isOpen) {
      closeNotificationCenter();
    } else {
      openNotificationCenter();
    }
  });
  
  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!center.contains(e.target) && !bell.contains(e.target)) {
      closeNotificationCenter();
    }
  });
  
  // Mark all as read
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await markAllAsRead();
    });
  }
  
  // View all notifications (could navigate to dedicated page)
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: Navigate to full notifications page
      toast.info('Notifications page coming soon!');
    });
  }

  if (togglePushBtn) {
    const handleStatus = (status) => updatePushToggleButton(togglePushBtn, status);

    // Initial state
    handleStatus(getPushStatus());

    window.addEventListener(pushStatusEventName, (event) => {
      handleStatus(event.detail ?? getPushStatus());
    });

    togglePushBtn.addEventListener('click', async (e) => {
      e.stopPropagation();

      const status = getPushStatus();
      if (!status.supported) {
        toast.warning('Push notifications are not supported on this device.');
        return;
      }

      if (status.permission === 'denied') {
        toast.error('Push notifications are blocked. Please allow notifications in your browser settings.');
        return;
      }

      togglePushBtn.disabled = true;
      const originalText = togglePushBtn.textContent;
      togglePushBtn.textContent = 'Working...';

      try {
        if (status.subscribed) {
          await disablePushNotifications();
          toast.info('Push notifications disabled.');
        } else {
          await enablePushNotifications();
          toast.success('Push notifications enabled.');
        }
      } catch (error) {
        console.error('❌ Failed to toggle push notifications:', error);
        toast.error(error.message || 'Unable to update push notifications.');
      } finally {
        togglePushBtn.disabled = false;
        togglePushBtn.textContent = originalText;
        handleStatus(getPushStatus());
      }
    });
  }
}

function updatePushToggleButton(button, status) {
  if (!button) return;

  if (!status.supported) {
    button.textContent = 'Push not supported';
    button.disabled = true;
    button.title = 'Push notifications are not supported in this browser.';
    return;
  }

  if (status.permission === 'denied') {
    button.textContent = 'Push blocked';
    button.disabled = true;
    button.title = 'Notifications are blocked in browser settings.';
    return;
  }

  if (status.subscribed) {
    button.textContent = 'Disable Push';
    button.disabled = false;
    button.title = 'Stop receiving push notifications on this device.';
  } else {
    button.textContent = 'Enable Push';
    button.disabled = false;
    button.title = 'Receive push notifications on this device.';
  }
}

/**
 * Open notification center
 */
function openNotificationCenter() {
  const center = document.getElementById('notification-center');
  const bell = document.getElementById('notification-bell');
  
  if (center) {
    center.classList.add('open');
  }
  if (bell) {
    bell.classList.add('active');
  }
  
  // Refresh notifications when opening
  loadNotifications();
}

/**
 * Close notification center
 */
function closeNotificationCenter() {
  const center = document.getElementById('notification-center');
  const bell = document.getElementById('notification-bell');
  
  if (center) {
    center.classList.remove('open');
  }
  if (bell) {
    bell.classList.remove('active');
  }
}

/**
 * Load notifications from database
 */
export async function loadNotifications(limit = 50) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    notificationCache = data || [];
    renderNotifications(notificationCache);
    
    return notificationCache;
  } catch (error) {
    console.error('❌ Failed to load notifications:', error);
    showNotificationError();
    return [];
  }
}

/**
 * Render notifications in the list
 */
function renderNotifications(notifications) {
  const list = document.getElementById('notification-list');
  if (!list) return;
  
  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div class="notification-empty">
        <div class="notification-empty-icon">
          <i data-lucide="bell-off" class="w-full h-full"></i>
        </div>
        <p class="notification-empty-text">No notifications yet</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  
  list.innerHTML = notifications.map(notification => `
    <div class="notification-item ${notification.read ? '' : 'unread'}" 
         data-notification-id="${notification.id}"
         data-link="${notification.link || '#'}">
      <div class="notification-item-content">
        <div class="notification-icon ${notification.type}">
          ${NOTIFICATION_TYPE_ICONS[notification.type] || '🔔'}
        </div>
        <div class="notification-details">
          <h4 class="notification-title">${escapeHtml(notification.title)}</h4>
          <p class="notification-message">${escapeHtml(notification.message)}</p>
          <p class="notification-time">${formatTime(notification.created_at)}</p>
        </div>
        ${!notification.read ? '<div class="notification-dot"></div>' : ''}
      </div>
    </div>
  `).join('');
  
  // Add click handlers
  list.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notificationId = item.dataset.notificationId;
      const link = item.dataset.link;
      
      // Mark as read
      await markAsRead(notificationId);
      
      // Navigate if link exists
      if (link && link !== '#') {
        window.location.href = link;
      }
      
      closeNotificationCenter();
    });
  });
  
  if (window.lucide) window.lucide.createIcons();
}

/**
 * Update unread count badge
 */
export async function updateUnreadCount() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    
    if (error) throw error;
    
    unreadCount = data?.length || 0;
    updateBadge();
    
    return unreadCount;
  } catch (error) {
    console.error('❌ Failed to update unread count:', error);
    return 0;
  }
}

/**
 * Update badge display
 */
function updateBadge() {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (error) throw error;
    
    // Update cache
    const notification = notificationCache.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.read_at = new Date().toISOString();
    }
    
    // Update UI
    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (item) {
      item.classList.remove('unread');
      const dot = item.querySelector('.notification-dot');
      if (dot) dot.remove();
    }
    
    // Update badge
    await updateUnreadCount();
    
    return true;
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    const { error } = await supabase.rpc('mark_all_notifications_read');
    
    if (error) throw error;
    
    // Update cache
    notificationCache.forEach(n => {
      n.read = true;
      n.read_at = new Date().toISOString();
    });
    
    // Update UI
    renderNotifications(notificationCache);
    
    // Update badge
    await updateUnreadCount();
    
    toast.success('All notifications marked as read');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to mark all as read:', error);
    toast.error('Failed to mark all notifications as read');
    return false;
  }
}

/**
 * Setup real-time updates using Supabase Realtime
 */
function setupRealtimeUpdates() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Subscribe to notifications table changes
    realtimeSubscription = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔔 New notification received:', payload);
          
          // Add to cache
          notificationCache.unshift(payload.new);
          
          // Re-render
          renderNotifications(notificationCache);
          
          // Update badge
          updateUnreadCount();
          
          // Show toast if center is closed
          if (!document.getElementById('notification-center')?.classList.contains('open')) {
            toast.info(payload.new.message, payload.new.title);
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Update cache
          const index = notificationCache.findIndex(n => n.id === payload.new.id);
          if (index !== -1) {
            notificationCache[index] = payload.new;
            renderNotifications(notificationCache);
            updateUnreadCount();
          }
        }
      )
      .subscribe();
    
    console.log('✅ Real-time notifications subscribed');
  } catch (error) {
    console.error('❌ Failed to setup real-time updates:', error);
  }
}

/**
 * Setup polling as fallback
 */
function setupPolling(interval = 30000) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingInterval = setInterval(async () => {
    await loadNotifications();
    await updateUnreadCount();
  }, interval);
}

/**
 * Show error state in notification list
 */
function showNotificationError() {
  const list = document.getElementById('notification-list');
  if (list) {
    list.innerHTML = `
      <div class="notification-empty">
        <div class="notification-empty-icon">
          <i data-lucide="alert-circle" class="w-full h-full"></i>
        </div>
        <p class="notification-empty-text">Failed to load notifications</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Create a notification (helper function)
 */
export async function createNotification(userId, type, title, message, link = null, metadata = {}) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('❌ Failed to create notification:', error);
    return null;
  }
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Helper: Format time
 */
function formatTime(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return time.toLocaleDateString();
}

/**
 * Cleanup on page unload
 */
window.addEventListener('beforeunload', () => {
  if (realtimeSubscription) {
    supabase.removeChannel(realtimeSubscription);
  }
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
});

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotificationCenter);
} else {
  initNotificationCenter();
}

