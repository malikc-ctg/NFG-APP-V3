// Process Recurring Billing Edge Function
// Called automatically to charge all due subscriptions
// Can be triggered by cron job, webhook, or manually

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // This function can be called by cron or admin
    // Check for admin authorization if not from cron
    const authHeader = req.headers.get('Authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')
    const cronHeader = req.headers.get('X-Cron-Secret')
    
    // Allow if cron secret matches OR if admin authorized
    if (!cronSecret || cronHeader !== cronSecret) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Verify admin access
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      // Check if admin
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (profile?.role !== 'admin' && profile?.role !== 'super_admin') {
        return new Response(
          JSON.stringify({ error: 'Admin access required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Call the charge-subscription function for all due subscriptions
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const chargeResponse = await fetch(`${supabaseUrl}/functions/v1/charge-subscription`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}) // Empty body = charge all due subscriptions
    })

    if (!chargeResponse.ok) {
      const error = await chargeResponse.json()
      throw new Error(error.error || 'Failed to charge subscriptions')
    }

    const result = await chargeResponse.json()

    // Also retry failed payments within grace period
    await retryFailedPayments()

    return new Response(
      JSON.stringify({
        message: 'Recurring billing processed',
        ...result,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process recurring billing error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Retry failed payments within grace period
 */
async function retryFailedPayments() {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find past_due subscriptions within grace period
  const now = new Date().toISOString()
  const { data: subscriptions, error } = await supabaseAdmin
    .from('platform_subscriptions')
    .select('*, company_profiles(*)')
    .eq('status', 'past_due')
    .lte('metadata->>next_retry_date', now)
    .gte('metadata->>grace_period_end', now) // Still in grace period
    .lt('metadata->>payment_failure_count', '3') // Less than 3 failures

  if (error || !subscriptions || subscriptions.length === 0) {
    return { retried: 0 }
  }

  // Retry charging each subscription
  const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
  if (!stripeSecretKey) {
    return { retried: 0, error: 'Stripe not configured' }
  }

  let retried = 0
  for (const subscription of subscriptions) {
    try {
      // Import charge function logic (simplified retry)
      const chargeResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/charge-subscription`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscription_id: subscription.id
          })
        }
      )

      if (chargeResponse.ok) {
        retried++
      }
    } catch (error) {
      console.error(`Error retrying subscription ${subscription.id}:`, error)
    }
  }

  return { retried, total: subscriptions.length }
}

