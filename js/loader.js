/**
 * NFG Page Loader Manager
 * Shows full-page loader on initial load, hides when content is ready
 */

// Show loader
export function showLoader(message = 'Loading...') {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.remove('hidden');
    
    // Update message if provided
    const loaderText = loader.querySelector('.loader-text');
    if (loaderText && message) {
      loaderText.textContent = message;
    }
  }
}

// Hide loader with smooth fade-out
export function hideLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('hidden');
    console.log('✅ Loader hidden');
  }
}

// Auto-hide loader after a maximum time (fail-safe)
window.addEventListener('load', () => {
  setTimeout(() => {
    hideLoader();
  }, 500);
});

// Initialize loader on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    showLoader();
  });
} else {
  showLoader();
}

