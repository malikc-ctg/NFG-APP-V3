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
    
    if (!supabaseUrl) {
      console.error('❌ SUPABASE_URL environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_URL not configured. Check Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!serviceRoleKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is not set')
      return new Response(
        JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Check Edge Function secrets.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    console.log('🔍 Querying subscriptions for user_id:', user_id)
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (error) {
      console.error('❌ Failed to load subscriptions:', JSON.stringify(error, null, 2))
      return new Response(
        JSON.stringify({ error: 'Failed to load subscriptions', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log(`✅ Found ${subscriptions?.length || 0} subscriptions for user`)

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
        console.log(`✅ Push sent successfully to endpoint: ${subscription.endpoint.substring(0, 50)}...`)
      } catch (err: any) {
        console.error('❌ Push delivery failed:', err.message || err)
        const statusCode = err.statusCode || err?.status || (err?.response?.statusCode)
        
        // 404 = Not Found, 410 = Gone (expired/unsubscribed)
        if (statusCode === 404 || statusCode === 410) {
          console.log(`🗑️ Marking subscription ${subscription.id} for deletion (status: ${statusCode})`)
          toRemove.push(subscription.id)
        } else {
          console.error(`⚠️ Unexpected error code ${statusCode} for subscription ${subscription.id}`)
        }
      }
    }

    if (toRemove.length > 0) {
      console.log(`🗑️ Deleting ${toRemove.length} expired/invalid subscription(s)`)
      const { error: deleteError } = await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', toRemove)
      
      if (deleteError) {
        console.error('❌ Failed to delete expired subscriptions:', deleteError)
      } else {
        console.log(`✅ Successfully deleted ${toRemove.length} expired subscription(s)`)
      }
    }

    const successCount = subscriptions.length - toRemove.length
    if (successCount > 0) {
      console.log(`✅ Successfully sent ${successCount} push notification(s)`)
    } else if (toRemove.length > 0) {
      console.log(`⚠️ All subscriptions were expired/invalid and have been removed`)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successCount,
      removed: toRemove.length 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('Failed to send push notification:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

