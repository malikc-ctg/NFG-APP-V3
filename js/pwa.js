import { supabase } from './supabase.js';

const GET_VAPID_KEY_ENDPOINT = '/functions/v1/get-vapid-key';
const SAVE_SUBSCRIPTION_ENDPOINT = '/functions/v1/save-subscription';

// Fallback public key (exposed value from user-provided VAPID pair)
const FALLBACK_VAPID_PUBLIC_KEY = 'BNRzgf5fJSbUfBsaFvCPUWPqvnd1qqKPu8C3tUQp_RoILsvczmd1oZNA-bpHq5q0VnLLjWzcm2U1vYxEbZ_kH4I';

const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

let serviceWorkerRegistration = null;
let currentSubscription = null;
let cachedVapidKey = null;

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
        src="/assets/icons/icon-192.png" 
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
export function isPWA() {
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

// --- Service worker registration & push setup ---

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(async (registration) => {
        console.log('✅ Service Worker registered:', registration.scope);
        serviceWorkerRegistration = registration;

        // Check for updates every hour
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        await refreshSubscriptionState();
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });

  navigator.serviceWorker.ready.then(async (registration) => {
    if (!serviceWorkerRegistration) {
      serviceWorkerRegistration = registration;
      await refreshSubscriptionState();
    }
  });
}

export function getPushStatus() {
  return {
    supported: pushSupported,
    permission: pushSupported ? Notification.permission : 'denied',
    subscribed: !!currentSubscription
  };
}

export async function enablePushNotifications() {
  if (!pushSupported) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const registration = await ensureServiceWorkerRegistration();

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    dispatchPushStatus();
    throw new Error('Notification permission was not granted.');
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    currentSubscription = existing;
    await syncSubscriptionWithServer(existing, { requireAuth: true });
    dispatchPushStatus();
    return existing;
  }

  const vapidKey = await getVapidPublicKey();
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey)
  });

  currentSubscription = subscription;
  await syncSubscriptionWithServer(subscription, { requireAuth: true });
  dispatchPushStatus();
  return subscription;
}

export async function disablePushNotifications() {
  if (!pushSupported) {
    return;
  }

  const registration = await ensureServiceWorkerRegistration();
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    currentSubscription = null;
    dispatchPushStatus();
    return;
  }

  try {
    await deleteSubscriptionFromServer(subscription.endpoint);
  } catch (error) {
    console.warn('[Push] Failed to remove subscription from server:', error);
  }

  await subscription.unsubscribe();
  currentSubscription = null;
  dispatchPushStatus();
}

async function refreshSubscriptionState() {
  if (!pushSupported) {
    dispatchPushStatus();
    return;
  }

  try {
    const registration = await ensureServiceWorkerRegistration();
    currentSubscription = await registration.pushManager.getSubscription();

    if (currentSubscription) {
      await syncSubscriptionWithServer(currentSubscription, { requireAuth: false });
    }
  } catch (error) {
    console.warn('[Push] Unable to refresh subscription state:', error);
  }

  dispatchPushStatus();
}

async function ensureServiceWorkerRegistration() {
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  serviceWorkerRegistration = await navigator.serviceWorker.ready;
  return serviceWorkerRegistration;
}

async function getVapidPublicKey() {
  if (cachedVapidKey) {
    return cachedVapidKey;
  }

  try {
    const response = await fetch(GET_VAPID_KEY_ENDPOINT, { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      if (data?.publicKey) {
        cachedVapidKey = data.publicKey;
        return cachedVapidKey;
      }
    }
  } catch (error) {
    console.warn('[Push] Failed to fetch VAPID key from edge function, falling back to embedded key.', error);
  }

  cachedVapidKey = window.ENV?.VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;
  return cachedVapidKey;
}

async function syncSubscriptionWithServer(subscription, { requireAuth } = { requireAuth: true }) {
  const token = await getAccessToken();
  if (!token) {
    if (requireAuth) {
      throw new Error('You must be logged in to manage push notifications.');
    }
    return;
  }

  await saveSubscriptionToServer(subscription, token);
}

async function saveSubscriptionToServer(subscription, accessToken) {
  const payload = subscription.toJSON();

  const response = await fetch(SAVE_SUBSCRIPTION_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save subscription: ${errorText}`);
  }
}

async function deleteSubscriptionFromServer(endpoint) {
  const token = await getAccessToken();
  if (!token) return;

  const response = await fetch(SAVE_SUBSCRIPTION_ENDPOINT, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ endpoint })
  });

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(`Failed to delete subscription: ${errorText}`);
  }
}

async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch (error) {
    console.warn('[Push] Unable to retrieve Supabase session:', error);
    return null;
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function dispatchPushStatus() {
  const detail = getPushStatus();
  window.dispatchEvent(new CustomEvent('nfg:push-status-changed', { detail }));
}

dispatchPushStatus();