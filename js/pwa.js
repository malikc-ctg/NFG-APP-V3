// PWA Installation and Service Worker Registration
// Add this to all main pages

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        
        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Install prompt
let deferredPrompt;
const installBanner = document.createElement('div');

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  deferredPrompt = e;
  
  // Show custom install banner
  showInstallBanner();
});

function showInstallBanner() {
  installBanner.id = 'pwa-install-banner';
  installBanner.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 z-50 border-2 border-nfgblue animate-slide-up';
  installBanner.innerHTML = `
    <div class="flex items-start gap-3">
      <img 
        src="https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/Banner%20Logo%20-%20NFG.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzL0Jhbm5lciBMb2dvIC0gTkZHLnBuZyIsImlhdCI6MTc2MTQwODAwNywiZXhwIjo0ODgzNDcyMDA3fQ.ioiCAXNeXFBkHluCdCLF25y527mxnjBDcLPtDMV1Jds" 
        alt="NFG" 
        class="w-12 h-12 rounded-lg"
      >
      <div class="flex-1">
        <h3 class="font-bold text-gray-900 dark:text-white mb-1">Install NFG App</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">Add to your home screen for quick access and offline use!</p>
        <div class="flex gap-2">
          <button 
            id="pwa-install-btn" 
            class="px-4 py-2 bg-nfgblue text-white rounded-lg text-sm font-medium hover:bg-nfgdark transition"
          >
            Install
          </button>
          <button 
            id="pwa-dismiss-btn" 
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Not Now
          </button>
        </div>
      </div>
      <button 
        id="pwa-close-btn" 
        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // Install button
  document.getElementById('pwa-install-btn').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
    }
    
    deferredPrompt = null;
    installBanner.remove();
  });
  
  // Dismiss buttons
  document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
    installBanner.remove();
    // Show again in 7 days
    localStorage.setItem('pwa-dismissed', Date.now() + (7 * 24 * 60 * 60 * 1000));
  });
  
  document.getElementById('pwa-close-btn').addEventListener('click', () => {
    installBanner.remove();
  });
}

// Track installation
window.addEventListener('appinstalled', () => {
  console.log('✅ NFG App installed successfully!');
  deferredPrompt = null;
  
  // Show success notification
  if (typeof toast !== 'undefined') {
    toast.success('App installed! You can now use NFG offline.');
  }
});

// Check if running as PWA
function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
}

// Add PWA badge to UI if installed
if (isPWA()) {
  console.log('✅ Running as PWA');
  document.documentElement.classList.add('pwa-mode');
}

// Online/Offline status
window.addEventListener('online', () => {
  console.log('✅ Back online');
  if (typeof toast !== 'undefined') {
    toast.success('Connection restored!');
  }
});

window.addEventListener('offline', () => {
  console.log('🔴 Offline');
  if (typeof toast !== 'undefined') {
    toast.warning('You are offline. Some features may be limited.');
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isPWA };
}

