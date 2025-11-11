/**
 * NFG Toast Notification System
 * Beautiful card-style notifications with NFG logo
 */

// NFG Logo URL
const NFG_LOGO_URL = '/assets/icons/icon-192.png';

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

// Error message mappings for user-friendly errors
const ERROR_MESSAGES = {
  // Network errors
  'Failed to fetch': 'Unable to connect to the server. Please check your internet connection and try again.',
  'NetworkError': 'Network error. Please check your connection and try again.',
  'Network request failed': 'Network request failed. Please check your internet connection.',
  
  // Authentication errors
  'Invalid JWT': 'Your session has expired. Please log in again.',
  'JWT expired': 'Your session has expired. Please log in again.',
  'Not authenticated': 'You are not logged in. Please log in to continue.',
  'Unauthorized': 'You do not have permission to perform this action.',
  
  // Database errors
  'permission denied': 'You do not have permission to perform this action.',
  'relation does not exist': 'Database error. Please contact support if this persists.',
  'duplicate key value': 'This record already exists. Please check your input.',
  'foreign key constraint': 'Cannot delete this item because it is being used elsewhere.',
  'violates check constraint': 'Invalid data. Please check your input and try again.',
  'null value in column': 'Required field is missing. Please fill in all required fields.',
  
  // Common Supabase errors
  'PGRST116': 'Item not found.',
  'PGRST204': 'Database schema error. Please contact support.',
  '42P01': 'Database table not found. Please contact support.',
  '23505': 'This record already exists.',
  '23503': 'Cannot perform this action because related data exists.',
  '23514': 'Invalid data. Please check your input.',
  
  // Storage errors
  'The resource already exists': 'A file with this name already exists.',
  'The resource was not found': 'File not found.',
  'Payload too large': 'File is too large. Please use a smaller file.',
  
  // Generic errors
  'Internal Server Error': 'An error occurred on the server. Please try again later.',
  'Bad Request': 'Invalid request. Please check your input and try again.',
  'Not Found': 'The requested resource was not found.',
  'Forbidden': 'You do not have permission to access this resource.',
};

/**
 * Get user-friendly error message from error object
 * @param {Error|string|object} error - Error object, message string, or error with message/code
 * @returns {string} - User-friendly error message
 */
function getUserFriendlyErrorMessage(error) {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }
  
  // Extract error message
  let errorMessage = '';
  let errorCode = '';
  
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error.message) {
    errorMessage = error.message;
  } else if (error.error && error.error.message) {
    errorMessage = error.error.message;
  }
  
  if (error.code) {
    errorCode = error.code;
  } else if (error.error && error.error.code) {
    errorCode = error.error.code;
  }
  
  // Check for mapped error messages
  for (const [key, message] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage.includes(key) || errorCode === key) {
      return message;
    }
  }
  
  // Return original message if no mapping found, but clean it up
  if (errorMessage) {
    // Remove technical details that users don't need to see
    const cleaned = errorMessage
      .replace(/PGRST\d+/g, '') // Remove PGRST codes
      .replace(/ERROR:\s*\d+:\s*/g, '') // Remove PostgreSQL error codes
      .replace(/CONTEXT:.*/g, '') // Remove context
      .trim();
    
    return cleaned || 'An error occurred. Please try again.';
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Handle error with user-friendly message
 * @param {Error|string|object} error - Error to handle
 * @param {string} context - Context where error occurred (e.g., 'Creating job', 'Loading sites')
 * @param {boolean} showDialog - Whether to show error dialog instead of toast
 * @returns {string} - User-friendly error message
 */
export function handleError(error, context = '', showDialog = false) {
  const friendlyMessage = getUserFriendlyErrorMessage(error);
  const displayMessage = context ? `${context}: ${friendlyMessage}` : friendlyMessage;
  
  console.error('[Error Handler]', context || 'Error', error);
  
  if (showDialog) {
    // Show error dialog for critical errors
    showConfirm(
      friendlyMessage,
      context || 'Error',
      'error'
    ).catch(() => {
      // Fallback to toast if dialog fails
      toast.error(friendlyMessage, context || 'Error');
    });
  } else {
    // Show toast notification
    toast.error(friendlyMessage, context || 'Error');
  }
  
  return friendlyMessage;
}

/**
 * Show error dialog for critical errors
 * @param {Error|string|object} error - Error to display
 * @param {string} title - Dialog title
 * @param {string} message - Optional custom message (overrides error message)
 */
export function showErrorDialog(error, title = 'Error', message = null) {
  const errorMessage = message || getUserFriendlyErrorMessage(error);
  
  return showConfirm(
    errorMessage,
    title,
    'error'
  );
}

// Convenience methods
export const toast = {
  success: (message, title) => showNotification(message, 'success', title),
  error: (message, title) => showNotification(message, 'error', title, 7000), // Longer duration for errors
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

