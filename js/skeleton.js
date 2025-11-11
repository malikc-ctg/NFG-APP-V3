/**
 * Skeleton Loading Components
 * Provides skeleton loading states for better UX
 */

/**
 * Create a skeleton job card
 */
export function createSkeletonJobCard() {
  return `
    <div class="skeleton-job-card">
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width: 70%;"></div>
      <div class="flex items-center justify-between mt-4">
        <div class="skeleton skeleton-badge"></div>
        <div class="skeleton skeleton-button"></div>
      </div>
    </div>
  `;
}

/**
 * Create a skeleton site card
 */
export function createSkeletonSiteCard() {
  return `
    <div class="skeleton-site-card">
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <div class="skeleton skeleton-title"></div>
          <div class="skeleton skeleton-text" style="width: 60%; margin-top: 8px;"></div>
        </div>
        <div class="skeleton skeleton-badge"></div>
      </div>
      <div class="grid grid-cols-2 gap-2 pt-3 border-t border-nfgray">
        <div class="text-center">
          <div class="skeleton skeleton-title" style="width: 40px; height: 24px; margin: 0 auto 4px;"></div>
          <div class="skeleton skeleton-text" style="width: 50px; margin: 0 auto;"></div>
        </div>
        <div class="text-center">
          <div class="skeleton skeleton-title" style="width: 40px; height: 24px; margin: 0 auto 4px;"></div>
          <div class="skeleton skeleton-text" style="width: 50px; margin: 0 auto;"></div>
        </div>
      </div>
      <div class="skeleton skeleton-button mt-4" style="width: 100%;"></div>
    </div>
  `;
}

/**
 * Create a skeleton table row
 */
export function createSkeletonTableRow(columns = 5) {
  const cells = Array(columns).fill(0).map(() => 
    '<td><div class="skeleton skeleton-text"></div></td>'
  ).join('');
  
  return `
    <tr class="skeleton-table-row">
      ${cells}
    </tr>
  `;
}

/**
 * Create multiple skeleton table rows
 */
export function createSkeletonTableRows(count = 5, columns = 5) {
  return Array(count).fill(0).map(() => createSkeletonTableRow(columns)).join('');
}

/**
 * Create a skeleton stats card
 */
export function createSkeletonStatsCard() {
  return `
    <div class="skeleton-stats-card">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-title"></div>
        </div>
        <div class="skeleton skeleton-avatar"></div>
      </div>
    </div>
  `;
}

/**
 * Create a skeleton list item
 */
export function createSkeletonListItem() {
  return `
    <div class="skeleton-list-item">
      <div class="skeleton skeleton-avatar"></div>
      <div class="flex-1">
        <div class="skeleton skeleton-title" style="width: 60%;"></div>
        <div class="skeleton skeleton-text" style="width: 40%; margin-top: 8px;"></div>
      </div>
      <div class="skeleton skeleton-badge"></div>
    </div>
  `;
}

/**
 * Create multiple skeleton list items
 */
export function createSkeletonListItems(count = 5) {
  return Array(count).fill(0).map(() => createSkeletonListItem()).join('');
}

/**
 * Create a skeleton grid
 */
export function createSkeletonGrid(itemCount = 6, itemCreator = createSkeletonSiteCard) {
  return `
    <div class="skeleton-grid">
      ${Array(itemCount).fill(0).map(() => itemCreator()).join('')}
    </div>
  `;
}

/**
 * Show skeleton loading in an element
 */
export function showSkeleton(element, skeletonHTML) {
  if (!element) return;
  
  element.innerHTML = skeletonHTML;
  element.classList.add('skeleton-container');
}

/**
 * Hide skeleton and show content
 */
export function hideSkeleton(element, contentHTML) {
  if (!element) return;
  
  element.classList.remove('skeleton-container');
  element.innerHTML = contentHTML;
}

/**
 * Create a progress indicator
 */
export function createProgressIndicator(text = 'Loading...', showSpinner = true) {
  return `
    <div class="progress-indicator">
      ${showSpinner ? '<div class="spinner"></div>' : ''}
      <span>${text}</span>
    </div>
  `;
}

/**
 * Create a progress bar
 */
export function createProgressBar(percentage = 0) {
  return `
    <div class="progress-bar">
      <div class="progress-bar-fill" style="width: ${percentage}%;"></div>
    </div>
  `;
}

/**
 * Create an inline loader
 */
export function createInlineLoader(text = 'Loading...') {
  return `
    <div class="inline-loader">
      <div class="spinner"></div>
      <span>${text}</span>
    </div>
  `;
}

