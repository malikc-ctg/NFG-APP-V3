// Charge Subscription Edge Function
// Handles charging companies for their platform subscriptions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ChargeRequest {
  subscription_id?: string
  company_id?: string
  manual?: boolean // If true, manually trigger charge (admin)
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    // Require authorization for manual charges
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get Stripe secrets
    const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ChargeRequest = await req.json().catch(() => ({}))
    const { subscription_id, company_id, manual } = body

    // If manual charge, verify user is admin
    if (manual) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if user is admin
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

    // Get subscription(s) to charge
    let subscriptions = []

    if (subscription_id) {
      // Charge specific subscription
      const { data, error } = await supabaseAdmin
        .from('platform_subscriptions')
        .select('*, company_profiles(*)')
        .eq('id', subscription_id)
        .single()

      if (error || !data) {
        return new Response(
          JSON.stringify({ error: 'Subscription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      subscriptions = [data]
    } else if (company_id) {
      // Charge all active subscriptions for company
      const { data, error } = await supabaseAdmin
        .from('platform_subscriptions')
        .select('*, company_profiles(*)')
        .eq('company_id', company_id)
        .eq('status', 'active')
        .is('cancel_at_period_end', false)

      if (error) throw error
      subscriptions = data || []
    } else {
      // Auto-charge: Find all subscriptions due for payment
      const now = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('platform_subscriptions')
        .select('*, company_profiles(*)')
        .eq('status', 'active')
        .is('cancel_at_period_end', false)
        .lte('current_period_end', now)

      if (error) throw error
      subscriptions = data || []
    }

    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions to charge', charged: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process each subscription
    const results = []
    for (const subscription of subscriptions) {
      try {
        const result = await processSubscriptionCharge(
          supabaseAdmin,
          subscription,
          stripeSecretKey
        )
        results.push(result)
      } catch (error) {
        console.error(`Error charging subscription ${subscription.id}:`, error)
        results.push({
          subscription_id: subscription.id,
          success: false,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        message: `Processed ${subscriptions.length} subscriptions`,
        successful,
        failed,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Charge subscription error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Process charge for a single subscription
 */
async function processSubscriptionCharge(
  supabaseAdmin: any,
  subscription: any,
  stripeSecretKey: string
): Promise<{ subscription_id: string; success: boolean; payment_id?: string; error?: string }> {
  try {
    const company = subscription.company_profiles
    if (!company) {
      throw new Error('Company not found')
    }

    // Check if subscription is due
    const periodEnd = new Date(subscription.current_period_end)
    const now = new Date()
    
    // If not due yet and not manual, skip
    if (periodEnd > now && !subscription.manual) {
      return {
        subscription_id: subscription.id,
        success: false,
        error: 'Subscription not due yet'
      }
    }

    // Check payment gateway
    const gateway = company.payment_gateway
    if (!gateway || gateway === 'manual') {
      // Manual payment - just update status
      await supabaseAdmin
        .from('platform_subscriptions')
        .update({ status: 'unpaid' })
        .eq('id', subscription.id)

      return {
        subscription_id: subscription.id,
        success: true,
        payment_id: null,
        error: 'Manual payment required'
      }
    }

    if (gateway !== 'stripe') {
      throw new Error(`Gateway ${gateway} not yet supported`)
    }

    // Get Stripe account ID
    const stripeAccountId = company.payment_gateway_account_id
    if (!stripeAccountId) {
      throw new Error('Stripe account not connected')
    }

    // Calculate amount (handle proration if plan changed)
    let amount = subscription.amount
    if (subscription.metadata?.proration) {
      const proration = subscription.metadata.proration
      amount = proration.new_charge || amount
    }

    // Try ACH first (if available)
    let paymentResult = null
    try {
      paymentResult = await chargeWithACH(
        stripeSecretKey,
        stripeAccountId,
        amount,
        subscription,
        company
      )
    } catch (achError) {
      console.log('ACH charge failed, trying card:', achError.message)
      // Fallback to card
      paymentResult = await chargeWithCard(
        stripeSecretKey,
        stripeAccountId,
        amount,
        subscription,
        company
      )
    }

    if (!paymentResult.success) {
      // Payment failed - handle failure with retry logic
      const failureCount = (subscription.metadata?.payment_failure_count as number) || 0
      const newFailureCount = failureCount + 1
      
      // Calculate grace period end (7 days from now)
      const gracePeriodEnd = new Date()
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7)
      
      // Determine status based on failure count
      let newStatus = 'past_due'
      if (newFailureCount >= 3) {
        newStatus = 'unpaid' // After 3 failures, suspend
      }
      
      await supabaseAdmin
        .from('platform_subscriptions')
        .update({
          status: newStatus,
          metadata: {
            ...(subscription.metadata || {}),
            last_payment_attempt: new Date().toISOString(),
            last_payment_error: paymentResult.error || 'Payment failed',
            payment_failure_count: newFailureCount,
            grace_period_end: gracePeriodEnd.toISOString(),
            next_retry_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // Retry in 3 days
          }
        })
        .eq('id', subscription.id)
      
      // Create failed payment record
      await supabaseAdmin
        .from('platform_payments')
        .insert({
          company_id: subscription.company_id,
          subscription_id: subscription.id,
          amount: amount,
          currency: subscription.currency || 'usd',
          gateway: 'stripe',
          gateway_account_id: stripeAccountId,
          status: 'failed',
          payment_type: 'subscription',
          failure_reason: paymentResult.error || 'Payment failed',
          gateway_metadata: {
            failure_count: newFailureCount
          }
        })

      return {
        subscription_id: subscription.id,
        success: false,
        error: paymentResult.error || 'Payment failed',
        failure_count: newFailureCount
      }
    }

    // Payment succeeded - update subscription
    const newPeriodStart = new Date(subscription.current_period_end)
    const newPeriodEnd = new Date(newPeriodStart)
    if (subscription.billing_cycle === 'yearly') {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
    } else {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
    }

    await supabaseAdmin
      .from('platform_subscriptions')
      .update({
        status: 'active',
        current_period_start: newPeriodStart.toISOString(),
        current_period_end: newPeriodEnd.toISOString(),
        cancel_at_period_end: false, // Reset if was set
        metadata: {
          ...(subscription.metadata || {}),
          last_payment_success: new Date().toISOString(),
          payment_failure_count: 0, // Reset failure count on success
          last_payment_error: null,
          grace_period_end: null,
          next_retry_date: null
        }
      })
      .eq('id', subscription.id)

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('platform_payments')
      .insert({
        company_id: subscription.company_id,
        subscription_id: subscription.id,
        amount: amount,
        currency: subscription.currency || 'usd',
        gateway: 'stripe',
        gateway_payment_id: paymentResult.payment_id,
        gateway_account_id: stripeAccountId,
        status: 'succeeded',
        payment_type: 'subscription',
        gateway_metadata: {
          payment_method: paymentResult.payment_method,
          receipt_url: paymentResult.receipt_url
        },
        paid_at: new Date().toISOString()
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
    }

    return {
      subscription_id: subscription.id,
      success: true,
      payment_id: payment?.id || paymentResult.payment_id
    }

  } catch (error) {
    console.error('Error processing subscription charge:', error)
    return {
      subscription_id: subscription.id,
      success: false,
      error: error.message
    }
  }
}

/**
 * Charge using ACH (bank transfer)
 */
async function chargeWithACH(
  stripeSecretKey: string,
  stripeAccountId: string,
  amount: number,
  subscription: any,
  company: any
): Promise<{ success: boolean; payment_id?: string; payment_method?: string; receipt_url?: string; error?: string }> {
  // Check if company has bank account linked
  const bankAccount = company.payment_gateway_metadata?.bank_account
  if (!bankAccount) {
    throw new Error('No bank account linked')
  }

  // Create payment intent with ACH
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Stripe-Account': stripeAccountId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: Math.round(amount * 100), // Convert to cents
      currency: subscription.currency || 'usd',
      payment_method_types: 'us_bank_account',
      payment_method: bankAccount.payment_method_id,
      confirm: 'true',
      description: `Subscription payment for ${subscription.plan_name} plan`,
      metadata: {
        subscription_id: subscription.id,
        company_id: subscription.company_id,
        type: 'subscription'
      }
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'ACH charge failed')
  }

  if (data.status === 'succeeded') {
    return {
      success: true,
      payment_id: data.id,
      payment_method: 'ach',
      receipt_url: data.charges?.data[0]?.receipt_url
    }
  }

  // ACH is asynchronous - will be processed in 3-5 business days
  return {
    success: true,
    payment_id: data.id,
    payment_method: 'ach',
    error: 'ACH payment processing (3-5 business days)'
  }
}

/**
 * Charge using credit card
 */
async function chargeWithCard(
  stripeSecretKey: string,
  stripeAccountId: string,
  amount: number,
  subscription: any,
  company: any
): Promise<{ success: boolean; payment_id?: string; payment_method?: string; receipt_url?: string; error?: string }> {
  // Get default payment method from company
  const paymentMethodId = company.payment_gateway_metadata?.default_payment_method
  if (!paymentMethodId) {
    throw new Error('No payment method available')
  }

  // Create payment intent with card
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Stripe-Account': stripeAccountId,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: Math.round(amount * 100), // Convert to cents
      currency: subscription.currency || 'usd',
      payment_method: paymentMethodId,
      confirm: 'true',
      description: `Subscription payment for ${subscription.plan_name} plan`,
      metadata: {
        subscription_id: subscription.id,
        company_id: subscription.company_id,
        type: 'subscription'
      }
    })
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || 'Card charge failed')
  }

  if (data.status === 'succeeded') {
    return {
      success: true,
      payment_id: data.id,
      payment_method: 'card',
      receipt_url: data.charges?.data[0]?.receipt_url
    }
  }

  return {
    success: false,
    error: `Payment status: ${data.status}`
  }
}

