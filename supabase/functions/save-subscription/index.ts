import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,DELETE,OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!accessToken) {
      return new Response('Missing access token', { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (userError || !user) {
      return new Response('Invalid user', { status: 401, headers: corsHeaders })
    }

    const payload = await req.json()
    const action = payload?.action ?? 'save'

    if (action === 'delete') {
      const endpoint = payload?.endpoint
      if (!endpoint) {
        return new Response('Missing endpoint', { status: 400, headers: corsHeaders })
      }

      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', endpoint)

      return new Response('deleted', { status: 200, headers: corsHeaders })
    }

    const subscription = payload?.subscription
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return new Response('Invalid subscription payload', { status: 400, headers: corsHeaders })
    }

    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }, { onConflict: 'endpoint' })

    if (error) {
      return new Response(error.message, { status: 400, headers: corsHeaders })
    }

    return new Response('saved', { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Failed to save subscription:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

