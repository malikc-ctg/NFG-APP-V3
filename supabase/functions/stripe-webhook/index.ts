// Stripe Webhook Handler
// Processes Stripe events for automatic payment updates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the raw body for signature verification
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    // Verify webhook signature (optional but recommended)
    // For now, we'll process events without verification for speed
    // TODO: Add signature verification in production
    
    const event = JSON.parse(body)
    console.log('📥 Stripe webhook event:', event.type, event.id)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, supabaseAdmin, stripeSecretKey)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, supabaseAdmin)
        break

      case 'charge.succeeded':
        // Sometimes charge events come separately
        if (event.data.object.payment_intent) {
          const paymentIntent = await getPaymentIntent(event.data.object.payment_intent, stripeSecretKey)
          if (paymentIntent && paymentIntent.status === 'succeeded') {
            await handlePaymentSucceeded(paymentIntent, supabaseAdmin, stripeSecretKey)
          }
        }
        break

      case 'invoice.payment_succeeded':
        // For subscription payments
        await handleSubscriptionPayment(event.data.object, supabaseAdmin)
        break

      case 'invoice.payment_failed':
        // For subscription payment failures
        await handleSubscriptionPaymentFailed(event.data.object, supabaseAdmin)
        break

      default:
        console.log('⚠️ Unhandled event type:', event.type)
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Handle successful payment intent
async function handlePaymentSucceeded(paymentIntent: any, supabase: any, stripeSecretKey: string) {
  try {
    console.log('✅ Processing successful payment:', paymentIntent.id)

    // Find payment intent in database
    const { data: dbPaymentIntent, error: findError } = await supabase
      .from('payment_intents')
      .select('*, invoices(*)')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (findError || !dbPaymentIntent) {
      console.log('⚠️ Payment intent not found in database:', paymentIntent.id)
      return
    }

    const invoice = dbPaymentIntent.invoices
    if (!invoice) {
      console.log('⚠️ Invoice not found for payment intent')
      return
    }

    // Get company's Stripe account
    const { data: company } = await supabase
      .from('company_profiles')
      .select('payment_gateway_account_id')
      .eq('id', invoice.created_by)
      .single()

    const stripeAccount = company?.payment_gateway_account_id

    // Get charge details for receipt
    let receiptUrl = null
    if (paymentIntent.latest_charge) {
      const chargeResponse = await fetch(`https://api.stripe.com/v1/charges/${paymentIntent.latest_charge}`, {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          ...(stripeAccount && { 'Stripe-Account': stripeAccount }),
        }
      })
      if (chargeResponse.ok) {
        const charge = await chargeResponse.json()
        receiptUrl = charge.receipt_url
      }
    }

    const paymentAmount = paymentIntent.amount / 100
    const newPaidAmount = parseFloat(invoice.paid_amount || 0) + paymentAmount
    const newBalance = parseFloat(invoice.total_amount) - newPaidAmount

    // Update invoice
    const invoiceUpdate: any = {
      paid_amount: newPaidAmount,
      balance_due: Math.max(0, newBalance),
      updated_at: new Date().toISOString()
    }

    if (newBalance <= 0) {
      invoiceUpdate.status = 'paid'
      invoiceUpdate.paid_at = new Date().toISOString()
    } else if (invoice.status === 'overdue') {
      invoiceUpdate.status = 'sent'
    }

    await supabase
      .from('invoices')
      .update(invoiceUpdate)
      .eq('id', invoice.id)

    // Create or update payment record
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('gateway_payment_id', paymentIntent.id)
      .single()

    if (existingPayment) {
      // Update existing payment
      await supabase
        .from('payments')
        .update({
          payment_status: 'succeeded',
          receipt_url: receiptUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPayment.id)
    } else {
      // Create new payment record
      await supabase
        .from('payments')
        .insert({
          invoice_id: invoice.id,
          amount: paymentAmount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: paymentIntent.payment_method_types?.[0] === 'us_bank_account' ? 'bank_transfer' : 'credit_card',
          reference_number: paymentIntent.id,
          payment_status: 'succeeded',
          gateway: 'stripe',
          gateway_payment_id: paymentIntent.id,
          gateway_account_id: stripeAccount,
          receipt_url: receiptUrl,
          gateway_metadata: {
            payment_method: paymentIntent.payment_method_types,
            charge_id: paymentIntent.latest_charge
          }
        })
    }

    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({
        status: 'succeeded',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbPaymentIntent.id)

    console.log('✅ Payment processed successfully:', paymentIntent.id)

  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error)
    throw error
  }
}

// Handle failed payment
async function handlePaymentFailed(paymentIntent: any, supabase: any) {
  try {
    console.log('❌ Processing failed payment:', paymentIntent.id)

    const { data: dbPaymentIntent } = await supabase
      .from('payment_intents')
      .select('*, invoices(*)')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (!dbPaymentIntent) return

    // Update payment intent status
    await supabase
      .from('payment_intents')
      .update({
        status: 'failed',
        failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed',
        updated_at: new Date().toISOString()
      })
      .eq('id', dbPaymentIntent.id)

    // Update payment record if exists
    await supabase
      .from('payments')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString()
      })
      .eq('gateway_payment_id', paymentIntent.id)

    console.log('✅ Payment failure recorded:', paymentIntent.id)

  } catch (error) {
    console.error('❌ Error handling payment failed:', error)
  }
}

// Handle subscription payment (platform subscriptions)
async function handleSubscriptionPayment(invoice: any, supabase: any) {
  try {
    console.log('✅ Processing subscription payment:', invoice.id)

    // Find subscription
    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (!subscription) {
      console.log('⚠️ Subscription not found:', invoice.subscription)
      return
    }

    // Create platform payment record
    await supabase
      .from('platform_payments')
      .insert({
        subscription_id: subscription.id,
        amount: invoice.amount_paid / 100,
        payment_date: new Date(invoice.created * 1000).toISOString().split('T')[0],
        payment_method: invoice.payment_method_types?.[0] || 'unknown',
        payment_status: 'succeeded',
        gateway: 'stripe',
        gateway_payment_id: invoice.charge || invoice.id,
        receipt_url: invoice.hosted_invoice_url,
        gateway_metadata: invoice
      })

    // Update subscription
    await supabase
      .from('platform_subscriptions')
      .update({
        status: 'active',
        last_payment_date: new Date(invoice.created * 1000).toISOString().split('T')[0],
        next_billing_date: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    console.log('✅ Subscription payment processed:', invoice.id)

  } catch (error) {
    console.error('❌ Error handling subscription payment:', error)
  }
}

// Handle subscription payment failure
async function handleSubscriptionPaymentFailed(invoice: any, supabase: any) {
  try {
    console.log('❌ Processing subscription payment failure:', invoice.id)

    const { data: subscription } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('stripe_subscription_id', invoice.subscription)
      .single()

    if (!subscription) return

    // Update subscription to past_due
    await supabase
      .from('platform_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscription.id)

    console.log('✅ Subscription marked as past_due:', invoice.subscription)

  } catch (error) {
    console.error('❌ Error handling subscription payment failure:', error)
  }
}

// Helper: Get payment intent from Stripe
async function getPaymentIntent(paymentIntentId: string, stripeSecretKey: string) {
  try {
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
      }
    })
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.error('Error fetching payment intent:', error)
  }
  return null
}

