/**
 * NFG Page Loader Manager
 * Shows full-page loader on initial load, hides when content is ready
 */

// Show loader immediately (called inline in HTML)
window.showLoader = function() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.remove('hidden');
  }
};

// Hide loader with smooth fade-out
window.hideLoader = function() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('hidden');
    console.log('✅ Page loaded - loader hidden');
  }
};

// Auto-hide loader after a maximum time (fail-safe)
window.addEventListener('load', () => {
  setTimeout(() => {
    window.hideLoader();
  }, 500);
});

// Initialize loader on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.showLoader();
  });
} else {
  window.showLoader();
}

export { showLoader, hideLoader };

