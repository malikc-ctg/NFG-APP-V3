// ============================================
// Skeleton Loader Utilities
// ============================================
// Provides loading skeleton UI components
// ============================================

/**
 * Create skeleton table rows
 * @param {number} rows - Number of rows to create
 * @param {number} cols - Number of columns per row
 * @returns {string} HTML string for skeleton rows
 */
export function createSkeletonTableRows(rows = 5, cols = 5) {
  let html = '';
  for (let i = 0; i < rows; i++) {
    html += '<tr class="animate-pulse">';
    for (let j = 0; j < cols; j++) {
      html += `<td class="px-4 py-3">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </td>`;
    }
    html += '</tr>';
  }
  return html;
}

/**
 * Show skeleton loader in container
 * @param {HTMLElement} container - Container element
 * @param {string} skeletonHTML - HTML string for skeleton
 */
export function showSkeleton(container, skeletonHTML) {
  if (!container) return;
  
  // Store original content if not already stored
  if (!container.dataset.originalContent) {
    container.dataset.originalContent = container.innerHTML;
  }
  
  // Show skeleton
  container.innerHTML = skeletonHTML;
  container.classList.add('skeleton-loading');
}

/**
 * Hide skeleton loader and restore original content
 * @param {HTMLElement} container - Container element
 */
export function hideSkeleton(container) {
  if (!container) return;
  
  container.classList.remove('skeleton-loading');
  
  // Restore original content if stored
  if (container.dataset.originalContent) {
    container.innerHTML = container.dataset.originalContent;
    delete container.dataset.originalContent;
  }
}

/**
 * Create skeleton card
 * @param {number} count - Number of skeleton cards
 * @returns {string} HTML string for skeleton cards
 */
export function createSkeletonCards(count = 3) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
        <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    `;
  }
  return html;
}

// Export for use in console/testing
window.createSkeletonTableRows = createSkeletonTableRows;
window.showSkeleton = showSkeleton;
window.hideSkeleton = hideSkeleton;
window.createSkeletonCards = createSkeletonCards;

