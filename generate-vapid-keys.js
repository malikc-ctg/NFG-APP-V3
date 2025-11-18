// Quick script to generate VAPID keys for push notifications
// Run with: node generate-vapid-keys.js

// Install web-push first: npm install web-push
// Or use npx: npx web-push generate-vapid-keys

console.log('\n🔑 Generating VAPID keys...\n')

// You can run this command instead:
console.log('Run this command to generate VAPID keys:\n')
console.log('npx web-push generate-vapid-keys\n')
console.log('This will output:\n')
console.log('Public Key: <your-public-key>')
console.log('Private Key: <your-private-key>\n')
console.log('Then:')
console.log('1. Copy the Public Key and update js/pwa.js FALLBACK_VAPID_PUBLIC_KEY')
console.log('2. Use both keys with: supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..."\n')

