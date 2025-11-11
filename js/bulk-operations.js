/**
 * Bulk Operations Manager
 * Handles bulk selection and operations on multiple items
 */

import { supabase } from './supabase.js';
import { toast, showConfirm } from './notifications.js';
import { handleError } from './notifications.js';

// Selected items storage
const selectedItems = new Set();

// Flag to prevent event loops during programmatic updates
let isUpdatingProgrammatically = false;

/**
 * Initialize bulk operations for a page
 */
export function initBulkOperations(tableId, options = {}) {
  const {
    onSelectionChange,
    onBulkAction,
    selectable = true,
    bulkActions = []
  } = options;
  
  // Store options
  window.bulkOperationsConfig = {
    tableId,
    onSelectionChange,
    onBulkAction,
    selectable,
    bulkActions
  };
  
  // Clear selection
  selectedItems.clear();
  
  // Update UI
  updateBulkOperationsUI();
}

// Set up event delegation for checkboxes (do this once, not on every init)
let eventDelegationSetup = false;
if (typeof window !== 'undefined' && !eventDelegationSetup) {
  eventDelegationSetup = true;
  
  // Handle individual checkbox changes
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('bulk-select-checkbox') && e.target.id !== 'bulk-select-all') {
      const itemId = e.target.dataset.itemId;
      if (itemId && !isUpdatingProgrammatically) {
        toggleItemSelection(itemId);
      }
    }
  });
  
  // Handle select-all checkbox
  document.addEventListener('change', (e) => {
    if (e.target.id === 'bulk-select-all') {
      if (isUpdatingProgrammatically) return;
      
      const checkboxes = document.querySelectorAll('.bulk-select-checkbox:not(#bulk-select-all)');
      const allItemIds = Array.from(checkboxes).map(cb => cb.dataset.itemId).filter(id => id);
      
      if (e.target.checked) {
        selectAllItems(allItemIds);
      } else {
        deselectAllItems();
      }
    }
  });
}

/**
 * Toggle item selection
 */
export function toggleItemSelection(itemId) {
  // Skip if we're updating programmatically (to prevent event loops)
  if (isUpdatingProgrammatically) {
    return;
  }
  
  if (selectedItems.has(itemId)) {
    selectedItems.delete(itemId);
  } else {
    selectedItems.add(itemId);
  }
  
  updateBulkOperationsUI();
  
  // Call callback if provided
  if (window.bulkOperationsConfig?.onSelectionChange) {
    window.bulkOperationsConfig.onSelectionChange(Array.from(selectedItems));
  }
}

/**
 * Select all items
 */
export function selectAllItems(itemIds) {
  if (!itemIds || itemIds.length === 0) {
    // If no itemIds provided, select all visible checkboxes
    const checkboxes = document.querySelectorAll('.bulk-select-checkbox');
    checkboxes.forEach(checkbox => {
      const itemId = checkbox.dataset.itemId;
      if (itemId) {
        selectedItems.add(itemId);
      }
    });
  } else {
    // Select specific items
    itemIds.forEach(id => {
      selectedItems.add(id);
    });
  }
  
  // Update UI (this will check all selected checkboxes)
  updateBulkOperationsUI();
  
  if (window.bulkOperationsConfig?.onSelectionChange) {
    window.bulkOperationsConfig.onSelectionChange(Array.from(selectedItems));
  }
}

/**
 * Deselect all items
 */
export function deselectAllItems() {
  // Clear the selected items set first
  selectedItems.clear();
  
  // Update UI (this will uncheck all checkboxes)
  updateBulkOperationsUI();
  
  // Call callback if provided
  if (window.bulkOperationsConfig?.onSelectionChange) {
    window.bulkOperationsConfig.onSelectionChange([]);
  }
}

/**
 * Get selected items
 */
export function getSelectedItems() {
  return Array.from(selectedItems);
}

/**
 * Get selected count
 */
export function getSelectedCount() {
  return selectedItems.size;
}

/**
 * Check if item is selected
 */
export function isItemSelected(itemId) {
  return selectedItems.has(itemId);
}

/**
 * Update bulk operations UI
 */
function updateBulkOperationsUI() {
  const count = selectedItems.size;
  const toolbar = document.getElementById('bulk-operations-toolbar');
  const selectAllCheckbox = document.getElementById('bulk-select-all');
  
  // Set flag to prevent event loops during programmatic updates
  isUpdatingProgrammatically = true;
  
  // Update all checkboxes to match selection state
  const checkboxes = document.querySelectorAll('.bulk-select-checkbox');
  
  checkboxes.forEach(checkbox => {
    const itemId = checkbox.dataset.itemId;
    if (itemId) {
      // Update checkbox state to match selection
      const shouldBeChecked = selectedItems.has(itemId);
      checkbox.checked = shouldBeChecked;
    }
  });
  
  // Reset flag after a microtask to allow any pending events to be processed
  // but before user interactions
  Promise.resolve().then(() => {
    isUpdatingProgrammatically = false;
  });
  
  if (toolbar) {
    if (count > 0) {
      toolbar.classList.remove('hidden');
      const countEl = document.getElementById('bulk-selected-count');
      if (countEl) {
        countEl.textContent = count;
      }
    } else {
      toolbar.classList.add('hidden');
    }
  }
  
  if (selectAllCheckbox) {
    // Update select-all checkbox based on current selection
    const totalCheckboxes = checkboxes.length;
    if (count === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (count === totalCheckboxes && totalCheckboxes > 0) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }
}

/**
 * Execute bulk action
 */
export async function executeBulkAction(action, itemIds = null) {
  const ids = itemIds || Array.from(selectedItems);
  
  if (ids.length === 0) {
    toast.warning('No items selected', 'Bulk Action');
    return;
  }
  
  // Call custom handler if provided
  if (window.bulkOperationsConfig?.onBulkAction) {
    const result = await window.bulkOperationsConfig.onBulkAction(action, ids);
    if (result) {
      // Clear selection after successful action
      deselectAllItems();
      return result;
    }
  }
  
  // Default handlers
  switch (action) {
    case 'delete':
      return await bulkDelete(ids);
    case 'archive':
      return await bulkArchive(ids);
    case 'update_status':
      return await bulkUpdateStatus(ids);
    default:
      console.warn('Unknown bulk action:', action);
      return { success: false, error: 'Unknown action' };
  }
}

/**
 * Bulk delete items
 */
async function bulkDelete(itemIds) {
  const confirmed = await showConfirm(
    `Are you sure you want to delete ${itemIds.length} item(s)? This action cannot be undone.`,
    'Delete Items',
    'warning'
  );
  
  if (!confirmed) {
    return { success: false, cancelled: true };
  }
  
  try {
    const config = window.bulkOperationsConfig;
    if (!config) {
      throw new Error('Bulk operations not initialized');
    }
    
    // This would need to be customized per table
    // For now, return error
    throw new Error('Bulk delete not implemented for this table');
  } catch (error) {
    handleError(error, 'Bulk delete');
    return { success: false, error };
  }
}

/**
 * Bulk archive items
 */
async function bulkArchive(itemIds) {
  try {
    const config = window.bulkOperationsConfig;
    if (!config) {
      throw new Error('Bulk operations not initialized');
    }
    
    // This would need to be customized per table
    throw new Error('Bulk archive not implemented for this table');
  } catch (error) {
    handleError(error, 'Bulk archive');
    return { success: false, error };
  }
}

/**
 * Bulk update status
 */
async function bulkUpdateStatus(itemIds, newStatus) {
  try {
    const config = window.bulkOperationsConfig;
    if (!config) {
      throw new Error('Bulk operations not initialized');
    }
    
    // This would need to be customized per table
    throw new Error('Bulk update status not implemented for this table');
  } catch (error) {
    handleError(error, 'Bulk update status');
    return { success: false, error };
  }
}

/**
 * Create bulk operations toolbar HTML
 */
export function createBulkOperationsToolbar(actions = []) {
  return `
    <div id="bulk-operations-toolbar" class="hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-2 border-nfgblue p-4 max-w-[90vw]">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-nfgblue dark:text-blue-400">
            <span id="bulk-selected-count">0</span> selected
          </span>
        </div>
        <div class="flex items-center gap-2 border-l border-nfgray dark:border-gray-700 pl-4 flex-wrap">
          ${actions.map(action => `
            <button 
              class="px-3 py-1.5 bg-nfgblue hover:bg-nfgdark text-white rounded-lg text-sm font-medium transition flex items-center gap-1"
              data-bulk-action="${action.id}"
              title="${action.label}">
              ${action.icon ? `<i data-lucide="${action.icon}" class="w-4 h-4"></i>` : ''}
              <span>${action.label}</span>
            </button>
          `).join('')}
          <button 
            class="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition"
            onclick="window.deselectAllBulkItems && window.deselectAllBulkItems()"
            title="Clear selection">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Create checkbox for item selection
 */
export function createSelectionCheckbox(itemId, checked = false) {
  return `
    <input 
      type="checkbox" 
      class="bulk-select-checkbox w-4 h-4 text-nfgblue border-nfgray rounded focus:ring-nfgblue"
      data-item-id="${itemId}"
      ${checked ? 'checked' : ''}
      onchange="window.toggleBulkSelection && window.toggleBulkSelection('${itemId}')"
    >
  `;
}

// Make functions globally available
if (typeof window !== 'undefined') {
  window.toggleBulkSelection = toggleItemSelection;
  window.selectAllBulkItems = selectAllItems;
  window.deselectAllBulkItems = deselectAllItems;
  window.executeBulkAction = executeBulkAction;
  window.getSelectedItems = getSelectedItems;
  window.getSelectedCount = getSelectedCount;
}

