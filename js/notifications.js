/**
 * NFG Toast Notification System
 * Beautiful card-style notifications with NFG logo
 */

// NFG Logo URL
const NFG_LOGO_URL = 'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/2.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzLzIucG5nIiwiaWF0IjoxNzYxODY2MTE0LCJleHAiOjQ4ODM5MzAxMTR9.E1JoQZxqPy0HOKna6YfjPCfin5Pc3QF0paEV7qzVfDw';

// Initialize toast container
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
}

// Type configurations
const NOTIFICATION_TYPES = {
  success: {
    title: 'Success',
    icon: '✓',
    headerClass: 'success'
  },
  error: {
    title: 'Error',
    icon: '✕',
    headerClass: 'error'
  },
  warning: {
    title: 'Warning',
    icon: '⚠',
    headerClass: 'warning'
  },
  info: {
    title: 'Info',
    icon: 'ℹ',
    headerClass: 'info'
  },
  default: {
    title: 'Notification',
    icon: '',
    headerClass: 'default'
  }
};

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info', 'default'
 * @param {string} title - Optional custom title
 * @param {number} duration - Duration in ms (0 = no auto-dismiss)
 */
export function showNotification(message, type = 'default', title = null, duration = 5000) {
  initToastContainer();
  
  const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.id = toastId;
  
  toast.innerHTML = `
    <button class="toast-close" aria-label="Close">×</button>
    <div class="toast-header ${config.headerClass}">
      <img src="${NFG_LOGO_URL}" alt="NFG" class="toast-logo" />
    </div>
    <div class="toast-body">
      <h5 class="toast-title">${title || config.title}</h5>
      <p class="toast-message">${message}</p>
    </div>
    ${duration > 0 ? '<div class="toast-progress"></div>' : ''}
  `;
  
  // Add to container
  const container = document.getElementById('toast-container');
  container.appendChild(toast);
  
  // Close button handler
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    removeToast(toastId);
  });
  
  // Click anywhere to dismiss
  toast.addEventListener('click', () => {
    removeToast(toastId);
  });
  
  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toastId);
    }, duration);
  }
  
  return toastId;
}

/**
 * Remove a toast notification
 */
function removeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add('removing');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}

/**
 * Show a confirmation dialog
 * @param {string} message - The confirmation message
 * @param {string} title - Optional title
 * @param {string} type - Type for styling ('info', 'warning', 'error')
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled
 */
export function showConfirm(message, title = 'Confirm', type = 'info') {
  return new Promise((resolve) => {
    const config = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.default;
    const modalId = `modal-${Date.now()}`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-modal-overlay';
    overlay.id = modalId;
    
    overlay.innerHTML = `
      <div class="notification-modal">
        <div class="toast-header ${config.headerClass}">
          <img src="${NFG_LOGO_URL}" alt="NFG" class="toast-logo" />
        </div>
        <div class="toast-body">
          <h5 class="toast-title">${title}</h5>
          <p class="toast-message">${message}</p>
        </div>
        <div class="notification-modal-actions">
          <button class="notification-modal-btn secondary" data-action="cancel">Cancel</button>
          <button class="notification-modal-btn primary" data-action="confirm">Confirm</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Handle buttons
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const confirmBtn = overlay.querySelector('[data-action="confirm"]');
    
    const cleanup = () => {
      overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
      setTimeout(() => overlay.remove(), 200);
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });
    
    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });
    
    // Click outside to cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });
    
    // ESC key to cancel
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  });
}

/**
 * Show a prompt dialog
 * @param {string} message - The prompt message
 * @param {string} title - Optional title
 * @param {string} defaultValue - Default input value
 * @returns {Promise<string|null>} - Resolves to input value or null if cancelled
 */
export function showPrompt(message, title = 'Input Required', defaultValue = '') {
  return new Promise((resolve) => {
    const modalId = `modal-${Date.now()}`;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'notification-modal-overlay';
    overlay.id = modalId;
    
    overlay.innerHTML = `
      <div class="notification-modal">
        <div class="toast-header default">
          <img src="${NFG_LOGO_URL}" alt="NFG" class="toast-logo" />
        </div>
        <div class="toast-body">
          <h5 class="toast-title">${title}</h5>
          <p class="toast-message">${message}</p>
          <input type="text" class="notification-modal-input" value="${defaultValue}" placeholder="Enter value..." />
        </div>
        <div class="notification-modal-actions">
          <button class="notification-modal-btn secondary" data-action="cancel">Cancel</button>
          <button class="notification-modal-btn primary" data-action="submit">Submit</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const input = overlay.querySelector('.notification-modal-input');
    const cancelBtn = overlay.querySelector('[data-action="cancel"]');
    const submitBtn = overlay.querySelector('[data-action="submit"]');
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    const cleanup = () => {
      overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
      setTimeout(() => overlay.remove(), 200);
    };
    
    const submit = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };
    
    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(null);
    });
    
    submitBtn.addEventListener('click', submit);
    
    // Enter key to submit
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    });
    
    // Click outside to cancel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    });
  });
}

// Convenience methods
export const toast = {
  success: (message, title) => showNotification(message, 'success', title),
  error: (message, title) => showNotification(message, 'error', title),
  warning: (message, title) => showNotification(message, 'warning', title),
  info: (message, title) => showNotification(message, 'info', title),
  show: (message, title) => showNotification(message, 'default', title)
};

export const notify = {
  success: (message) => showNotification(message, 'success'),
  error: (message) => showNotification(message, 'error'),
  warning: (message) => showNotification(message, 'warning'),
  info: (message) => showNotification(message, 'info')
};

// Alias for backward compatibility
export const showToast = showNotification;

// Make it available globally
if (typeof window !== 'undefined') {
  window.showNotification = showNotification;
  window.showToast = showNotification;
  window.showConfirm = showConfirm;
  window.showPrompt = showPrompt;
  window.toast = toast;
  window.notify = notify;
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToastContainer);
} else {
  initToastContainer();
}

