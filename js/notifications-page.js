/**
 * Notifications Page
 * Full-page view for all notifications
 */

import { supabase } from './supabase.js';
import { toast } from './notifications.js';

// State
let currentFilter = 'all';
let currentPage = 1;
let pageSize = 20;
let allNotifications = [];
let isLoading = false;
let hasMore = true;

// Notification types and their Lucide icon names
const NOTIFICATION_TYPE_ICONS = {
  job_assigned: 'clipboard-list',
  job_completed: 'check-circle',
  job_updated: 'edit',
  booking_created: 'calendar',
  booking_updated: 'refresh-cw',
  booking_cancelled: 'x-circle',
  site_assigned: 'building',
  site_unassigned: 'building-x',
  mention: 'message-circle',
  system: 'bell'
};

/**
 * Initialize notifications page
 */
export async function initNotificationsPage() {
  try {
    // Setup event listeners
    setupEventListeners();
    
    // Load notifications
    await loadNotifications();
    
    // Setup real-time updates
    await setupRealtimeUpdates();
    
    console.log('✅ Notifications page initialized');
  } catch (error) {
    console.error('❌ Failed to initialize notifications page:', error);
    showError();
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Mark all as read button
  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', async () => {
      await markAllAsRead();
    });
  }
  
  // Filter button
  const filterBtn = document.getElementById('filter-btn');
  const filterDropdown = document.getElementById('filter-dropdown');
  if (filterBtn && filterDropdown) {
    filterBtn.addEventListener('click', () => {
      filterDropdown.classList.toggle('hidden');
    });
  }
  
  // Filter chips
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      // Update active state
      document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.remove('active', 'bg-nfgblue', 'text-white', 'border-nfgblue');
        c.classList.add('bg-white', 'dark:bg-gray-800');
      });
      chip.classList.add('active', 'bg-nfgblue', 'text-white', 'border-nfgblue');
      chip.classList.remove('bg-white', 'dark:bg-gray-800');
      
      // Update filter
      currentFilter = chip.dataset.filter;
      currentPage = 1;
      hasMore = true;
      
      // Reload notifications
      loadNotifications();
      
      // Hide dropdown on mobile
      if (window.innerWidth < 640) {
        filterDropdown?.classList.add('hidden');
      }
    });
  });
  
  // Load more button
  const loadMoreBtn = document.getElementById('load-more-btn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', async () => {
      await loadMoreNotifications();
    });
  }
}

/**
 * Load notifications
 */
export async function loadNotifications(reset = true) {
  if (isLoading) return;
  
  isLoading = true;
  showLoading();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = './index.html';
      return;
    }
    
    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    // Apply filter
    if (currentFilter === 'unread') {
      query = query.eq('read', false);
    } else if (currentFilter !== 'all') {
      query = query.eq('type', currentFilter);
    }
    
    // Apply pagination
    const from = reset ? 0 : (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (reset) {
      allNotifications = data || [];
    } else {
      allNotifications = [...allNotifications, ...(data || [])];
    }
    
    // Check if there are more
    hasMore = (data || []).length === pageSize;
    
    // Render notifications
    renderNotifications();
    
    // Update load more button
    updateLoadMoreButton();
    
    // Update empty state
    updateEmptyState();
    
  } catch (error) {
    console.error('❌ Failed to load notifications:', error);
    showError();
  } finally {
    isLoading = false;
  }
}

/**
 * Load more notifications
 */
async function loadMoreNotifications() {
  if (isLoading || !hasMore) return;
  
  currentPage++;
  await loadNotifications(false);
}

/**
 * Render notifications
 */
function renderNotifications() {
  const container = document.getElementById('notifications-container');
  if (!container) return;
  
  if (allNotifications.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  // Group by date
  const grouped = groupNotificationsByDate(allNotifications);
  
  container.innerHTML = Object.keys(grouped).map(dateGroup => {
    const notifications = grouped[dateGroup];
    return `
      <div class="mb-6">
        <h3 class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-2">${dateGroup}</h3>
        <div class="space-y-2">
          ${notifications.map(notification => renderNotificationItem(notification)).join('')}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click handlers
  container.querySelectorAll('.notification-page-item').forEach(item => {
    item.addEventListener('click', async () => {
      const notificationId = item.dataset.notificationId;
      const link = item.dataset.link;
      
      // Mark as read
      await markAsRead(notificationId);
      
      // Navigate if link exists
      if (link && link !== '#') {
        window.location.href = link;
      }
    });
  });
  
  // Initialize Lucide icons after rendering
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Render single notification item
 */
function renderNotificationItem(notification) {
  const iconName = NOTIFICATION_TYPE_ICONS[notification.type] || 'bell';
  const isUnread = !notification.read;
  const timeAgo = formatTime(notification.created_at);
  
  return `
    <div class="notification-page-item ${isUnread ? 'unread' : ''} p-3 sm:p-4 bg-white dark:bg-gray-800 border border-nfgray rounded-xl cursor-pointer hover:shadow-md transition-shadow" 
         data-notification-id="${notification.id}"
         data-link="${notification.link || '#'}">
      <div class="flex items-start gap-2 sm:gap-3">
        <div class="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-nfglight dark:bg-gray-700 flex items-center justify-center">
          <i data-lucide="${iconName}" class="w-4 h-4 sm:w-5 sm:h-5 text-nfgblue dark:text-blue-400"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight">${escapeHtml(notification.title)}</h4>
            ${isUnread ? '<div class="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1 hidden sm:block"></div>' : ''}
          </div>
          <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">${escapeHtml(notification.message)}</p>
          <p class="text-xs text-gray-500 dark:text-gray-500 mt-1.5 sm:mt-2">${timeAgo}</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Group notifications by date
 */
function groupNotificationsByDate(notifications) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);
  
  notifications.forEach(notification => {
    const date = new Date(notification.created_at);
    let groupKey;
    
    if (date >= today) {
      groupKey = 'Today';
    } else if (date >= yesterday) {
      groupKey = 'Yesterday';
    } else if (date >= thisWeek) {
      groupKey = 'This Week';
    } else {
      groupKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
  });
  
  return groups;
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
    
    // Update local state
    const notification = allNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.read_at = new Date().toISOString();
    }
    
    // Re-render
    renderNotifications();
    
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Mark all unread as read
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);
    
    if (error) throw error;
    
    // Update local state
    allNotifications.forEach(n => {
      n.read = true;
      n.read_at = new Date().toISOString();
    });
    
    // Re-render
    renderNotifications();
    
    toast.success('All notifications marked as read');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to mark all as read:', error);
    toast.error('Failed to mark all notifications as read');
    return false;
  }
}

/**
 * Setup real-time updates
 */
async function setupRealtimeUpdates() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Subscribe to notifications table changes
    supabase
      .channel('notifications-page')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, 
        (payload) => {
          console.log('🔔 New notification received:', payload);
          
          // Add to beginning of list
          allNotifications.unshift(payload.new);
          
          // Re-render
          renderNotifications();
          
          // Update empty state
          updateEmptyState();
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
          // Update local state
          const index = allNotifications.findIndex(n => n.id === payload.new.id);
          if (index !== -1) {
            allNotifications[index] = payload.new;
            renderNotifications();
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
 * Update load more button
 */
function updateLoadMoreButton() {
  const container = document.getElementById('load-more-container');
  const btn = document.getElementById('load-more-btn');
  
  if (container && btn) {
    if (hasMore && allNotifications.length >= pageSize) {
      container.classList.remove('hidden');
      btn.disabled = isLoading;
      btn.textContent = isLoading ? 'Loading...' : 'Load More';
    } else {
      container.classList.add('hidden');
    }
  }
}

/**
 * Update empty state
 */
function updateEmptyState() {
  const container = document.getElementById('notifications-container');
  const emptyState = document.getElementById('empty-state');
  
  if (allNotifications.length === 0 && !isLoading) {
    if (container) container.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (container) container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');
  }
}

/**
 * Show loading state
 */
function showLoading() {
  const container = document.getElementById('notifications-container');
  if (container && allNotifications.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="inline-block w-12 h-12 border-4 border-nfgblue border-t-transparent rounded-full animate-spin"></div>
        <p class="mt-4 text-gray-500 dark:text-gray-400">Loading notifications...</p>
      </div>
    `;
  }
}

/**
 * Show error state
 */
function showError() {
  const container = document.getElementById('notifications-container');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-12">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <i data-lucide="alert-circle" class="w-8 h-8 text-red-600 dark:text-red-400"></i>
        </div>
        <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Failed to load notifications</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-4">Please try again later</p>
        <button onclick="location.reload()" class="px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark">
          Retry
        </button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
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
  
  return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: time.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNotificationsPage);
} else {
  initNotificationsPage();
}

