// Debug: Push Notifications Not Appearing
// Copy and paste this into your browser's Developer Tools Console

async function debugPushNotifications() {
  console.log('🔍 Debugging Push Notifications...\n');
  
  // 1. Check subscription
  console.log('1️⃣ Checking push subscription...');
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (!subscription) {
    console.error('❌ No push subscription found!');
    console.log('💡 Enable push notifications in Settings → Push Notifications');
    return;
  }
  
  console.log('✅ Push subscription exists');
  console.log('   Endpoint:', subscription.endpoint.substring(0, 60) + '...');
  
  // 2. Check notification permission
  console.log('\n2️⃣ Checking notification permission...');
  const permission = Notification.permission;
  console.log('   Permission:', permission);
  
  if (permission !== 'granted') {
    console.error('❌ Notification permission is not granted!');
    console.log('💡 Request permission by clicking "Enable Push" in Settings');
    return;
  }
  
  // 3. Test showing a notification directly
  console.log('\n3️⃣ Testing notification display...');
  try {
    await registration.showNotification('Test Notification', {
      body: 'If you see this, notifications are working!',
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      tag: 'test-notification',
      requireInteraction: true,
      data: { url: '/dashboard.html' }
    });
    console.log('✅ Test notification displayed successfully');
    console.log('   👀 Did you see a notification popup?');
  } catch (error) {
    console.error('❌ Failed to display test notification:', error);
    console.log('   This means notifications are blocked or not working');
    return;
  }
  
  // 4. Check service worker status
  console.log('\n4️⃣ Checking service worker status...');
  const swRegistration = await navigator.serviceWorker.getRegistration();
  if (swRegistration) {
    console.log('✅ Service worker is registered');
    console.log('   Scope:', swRegistration.scope);
    console.log('   Active:', swRegistration.active ? 'Yes' : 'No');
    
    if (swRegistration.active) {
      console.log('   State:', swRegistration.active.state);
    }
  } else {
    console.error('❌ Service worker is not registered!');
    return;
  }
  
  // 5. Listen for push events in console
  console.log('\n5️⃣ Setting up push event listener...');
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('📨 Message from service worker:', event.data);
  });
  
  console.log('✅ Listening for service worker messages');
  console.log('\n📝 Next Steps:');
  console.log('   1. Send a test push notification (run the curl command)');
  console.log('   2. Watch this console for service worker logs');
  console.log('   3. Check if you see "[SW] Push event received!" in console');
  console.log('   4. Check if a notification appears');
  
  // 6. Check browser/OS notification settings
  console.log('\n6️⃣ Checking browser notification settings...');
  console.log('   💡 Make sure:');
  console.log('      - Browser notifications are allowed for this site');
  console.log('      - OS notifications are enabled');
  console.log('      - Do Not Disturb mode is OFF');
  console.log('      - Focus mode is OFF (if on macOS)');
  
  // 7. Check if subscription is in database
  console.log('\n7️⃣ Checking subscription in database...');
  console.log('   Run this SQL in Supabase to verify:');
  console.log('   SELECT * FROM push_subscriptions WHERE user_id = \'b6c70905-828b-45f8-8cd8-b5c1d281a21b\';');
  
  return {
    subscription: subscription ? 'exists' : 'missing',
    permission: permission,
    serviceWorker: swRegistration ? 'registered' : 'not registered',
    testNotification: 'displayed'
  };
}

// Run the debug
debugPushNotifications().then(result => {
  console.log('\n📊 Debug Summary:', result);
}).catch(error => {
  console.error('❌ Debug error:', error);
});

