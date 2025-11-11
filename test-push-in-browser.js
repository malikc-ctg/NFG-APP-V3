// Test Push Notification Setup in Browser Console
// Copy and paste this into your browser's Developer Tools Console

async function testPushSetup() {
  console.log('🧪 Testing Push Notification Setup...\n');
  
  // 1. Check if push is supported
  console.log('1️⃣ Checking browser support...');
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  console.log('   Push supported:', pushSupported ? '✅ Yes' : '❌ No');
  
  if (!pushSupported) {
    console.error('❌ Push notifications are not supported in this browser');
    return;
  }
  
  // 2. Check notification permission
  console.log('\n2️⃣ Checking notification permission...');
  const permission = Notification.permission;
  console.log('   Permission:', permission);
  if (permission === 'granted') {
    console.log('   ✅ Notifications are allowed');
  } else if (permission === 'denied') {
    console.error('   ❌ Notifications are blocked. Enable them in browser settings.');
    return;
  } else {
    console.warn('   ⚠️ Permission not granted. Requesting permission...');
    const newPermission = await Notification.requestPermission();
    console.log('   New permission:', newPermission);
    if (newPermission !== 'granted') {
      console.error('   ❌ Permission was not granted');
      return;
    }
  }
  
  // 3. Check service worker
  console.log('\n3️⃣ Checking service worker...');
  if (!('serviceWorker' in navigator)) {
    console.error('   ❌ Service workers are not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('   ✅ Service worker is ready');
    console.log('   Scope:', registration.scope);
    
    // 4. Check push subscription
    console.log('\n4️⃣ Checking push subscription...');
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('   ✅ Push subscription exists');
      console.log('   Endpoint:', subscription.endpoint.substring(0, 50) + '...');
      
      const keys = subscription.getKey ? {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
        auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth'))))
      } : null;
      
      if (keys) {
        console.log('   Keys:', {
          p256dh: keys.p256dh.substring(0, 20) + '...',
          auth: keys.auth.substring(0, 20) + '...'
        });
      }
    } else {
      console.error('   ❌ No push subscription found');
      console.log('   💡 Enable push notifications in Settings → Push Notifications');
      return;
    }
    
    // 5. Test notification display
    console.log('\n5️⃣ Testing notification display...');
    try {
      await registration.showNotification('Test Notification', {
        body: 'If you see this, notifications are working!',
        icon: '/assets/icons/icon-192.png',
        badge: '/assets/icons/icon-192.png',
        tag: 'test-notification',
        data: { url: '/dashboard.html' }
      });
      console.log('   ✅ Test notification displayed successfully');
    } catch (error) {
      console.error('   ❌ Failed to display test notification:', error);
    }
    
    // 6. Summary
    console.log('\n📊 Summary:');
    console.log('   ✅ Browser supports push:', pushSupported);
    console.log('   ✅ Permission granted:', permission === 'granted');
    console.log('   ✅ Service worker ready:', !!registration);
    console.log('   ✅ Push subscription exists:', !!subscription);
    console.log('\n✅ All checks passed! Push notifications should work.');
    console.log('\n💡 If you still don\'t receive push notifications:');
    console.log('   1. Check browser notification settings');
    console.log('   2. Check OS notification settings');
    console.log('   3. Make sure the app/service worker is running');
    console.log('   4. Check the browser console for service worker logs');
    
  } catch (error) {
    console.error('❌ Error checking service worker:', error);
  }
}

// Run the test
testPushSetup().catch(console.error);

