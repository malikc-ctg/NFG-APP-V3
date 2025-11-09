import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@nfgapp.com',
    vapidPublicKey,
    vapidPrivateKey
  )
} else {
  console.error('⚠️ VAPID keys are not configured. Push notifications will fail.')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { user_id, title, body, url } = payload ?? {}

    if (!user_id) {
      return new Response('Missing user_id', { status: 400, headers: corsHeaders })
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response('VAPID keys not configured', { status: 500, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (error) {
      console.error('Failed to load subscriptions:', error)
      return new Response('Failed to load subscriptions', { status: 500, headers: corsHeaders })
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response('No subscriptions found', { status: 200, headers: corsHeaders })
    }

    const notificationPayload = JSON.stringify({
      title: title || 'NFG App',
      body: body || 'You have a new notification.',
      url: url || '/dashboard.html'
    })

    const toRemove: string[] = []

    for (const subscription of subscriptions) {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      }

      try {
        await webpush.sendNotification(pushSubscription, notificationPayload)
      } catch (err) {
        console.error('Push delivery failed:', err)
        const statusCode = err.statusCode || err.status
        if (statusCode === 404 || statusCode === 410) {
          toRemove.push(subscription.id)
        }
      }
    }

    if (toRemove.length > 0) {
      await supabaseAdmin.from('push_subscriptions').delete().in('id', toRemove)
    }

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

