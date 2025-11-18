// Edge Function to send push notifications for new messages
// This can be called via webhook or directly from the database trigger

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
  console.log('🔔 [Push Notification] Function called');
  console.log('🔔 [Push Notification] Method:', req.method);
  console.log('🔔 [Push Notification] URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    console.log('🔔 [Push Notification] Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('🔔 [Push Notification] Service Role Key:', serviceRoleKey ? 'Set' : 'Missing');
    console.log('🔔 [Push Notification] VAPID Public Key:', vapidPublicKey ? 'Set' : 'Missing');
    console.log('🔔 [Push Notification] VAPID Private Key:', vapidPrivateKey ? 'Set' : 'Missing');
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ [Push Notification] Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // Parse webhook payload (from Supabase webhook) or direct call
    let payload: any
    try {
      payload = await req.json()
      console.log('🔔 [Push Notification] Payload received:', JSON.stringify(payload).substring(0, 200));
    } catch (error) {
      console.error('❌ [Push Notification] Invalid JSON payload:', error);
      return new Response('Invalid JSON payload', { status: 400, headers: corsHeaders })
    }

    // Handle webhook format (Supabase sends { type, table, record, old_record })
    let message = payload.record || payload
    
    console.log('🔔 [Push Notification] Message extracted:', {
      hasRecord: !!payload.record,
      messageId: message.id || payload.message_id,
      conversationId: message.conversation_id || payload.conversation_id,
      senderId: message.sender_id || payload.sender_id
    });
    
    // If called directly, expect: { message_id, conversation_id, sender_id, content }
    const messageId = message.id || payload.message_id
    const conversationId = message.conversation_id || payload.conversation_id
    const senderId = message.sender_id || payload.sender_id
    const content = message.content || payload.content

    if (!messageId || !conversationId || !senderId || !content) {
      console.error('❌ [Push Notification] Missing required fields:', {
        messageId: !!messageId,
        conversationId: !!conversationId,
        senderId: !!senderId,
        content: !!content
      });
      return new Response(
        JSON.stringify({ error: 'Missing required message fields', details: { messageId, conversationId, senderId, hasContent: !!content } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔔 [Push Notification] Processing message:', messageId);

    // Get sender profile
    const { data: senderProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', senderId)
      .single()

    // Get conversation participants (excluding sender)
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId)

    if (participantsError) {
      console.error('❌ [Push Notification] Error fetching participants:', participantsError);
    }

    console.log('🔔 [Push Notification] Participants found:', participants?.length || 0);

    if (!participants || participants.length === 0) {
      console.log('⚠️ [Push Notification] No recipients to notify');
      return new Response(
        JSON.stringify({ success: true, message: 'No recipients to notify' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Build notification content
    const senderName = senderProfile?.full_name || senderProfile?.email || 'Someone'
    const notificationTitle = senderName
    const notificationBody = content.length > 100 ? content.substring(0, 100) + '...' : content
    const notificationUrl = '/messages.html'

    const notificationPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      url: notificationUrl,
      tag: `message-${messageId}`,
      data: { 
        url: notificationUrl,
        messageId,
        conversationId
      }
    })

    // Send push notifications to all recipients
    const userIds = participants.map(p => p.user_id)
    console.log('🔔 [Push Notification] User IDs to notify:', userIds);
    
    const { data: subscriptions, error: subscriptionsError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (subscriptionsError) {
      console.error('❌ [Push Notification] Error fetching subscriptions:', subscriptionsError);
    }

    console.log('🔔 [Push Notification] Subscriptions found:', subscriptions?.length || 0);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ [Push Notification] No push subscriptions found for users:', userIds);
      return new Response(
        JSON.stringify({ success: true, message: 'No push subscriptions found', userIds }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const toRemove: string[] = []
    let successCount = 0

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
        console.log(`✅ Push sent to user ${subscription.user_id}`)
        successCount++
      } catch (err: any) {
        console.error(`❌ Push delivery failed for user ${subscription.user_id}:`, err.message)
        const statusCode = err.statusCode || err?.status || (err?.response?.statusCode)
        
        // 404 = Not Found, 410 = Gone (expired/unsubscribed)
        if (statusCode === 404 || statusCode === 410) {
          toRemove.push(subscription.id)
        }
      }
    }

    // Remove expired subscriptions
    if (toRemove.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('id', toRemove)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount,
        removed: toRemove.length 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Failed to send message push notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

