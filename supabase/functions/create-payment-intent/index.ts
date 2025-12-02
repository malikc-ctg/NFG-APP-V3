// Create Payment Intent Edge Function
// Creates a Stripe payment intent for client invoice payment

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const { invoice_id, invoice_number } = await req.json()

    if (!invoice_id && !invoice_number) {
      return new Response(
        JSON.stringify({ error: 'invoice_id or invoice_number required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get invoice
    let invoiceQuery = supabaseAdmin
      .from('invoices')
      .select(`
        *,
        sites:site_id(name),
        company_profiles!invoices_created_by_fkey(*)
      `)

    if (invoice_id) {
      invoiceQuery = invoiceQuery.eq('id', invoice_id).single()
    } else {
      invoiceQuery = invoiceQuery.eq('invoice_number', invoice_number).single()
    }

    const { data: invoice, error: invoiceError } = await invoiceQuery

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already paid
    if (invoice.status === 'paid' || invoice.balance_due <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invoice already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company's payment gateway
    const { data: company } = await supabaseAdmin
      .from('company_profiles')
      .select('payment_gateway, payment_gateway_account_id, payment_gateway_connected')
      .eq('id', invoice.created_by)
      .single()

    if (!company?.payment_gateway_connected || company?.payment_gateway !== 'stripe') {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate amount (balance due or total amount)
    const amount = parseFloat(invoice.balance_due || invoice.total_amount)
    const amountInCents = Math.round(amount * 100)

    // Determine payment method types based on amount
    // Cards for < $500, ACH for >= $500
    const paymentMethodTypes = amount >= 500
      ? ['us_bank_account', 'card'] // ACH first, then card
      : ['card', 'us_bank_account'] // Card first, then ACH

    // Create payment intent via Stripe
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Stripe-Account': company.payment_gateway_account_id,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amountInCents.toString(),
        currency: 'usd',
        payment_method_types: paymentMethodTypes.join(','),
        description: `Payment for invoice ${invoice.invoice_number}`,
        metadata: JSON.stringify({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          type: 'invoice_payment'
        })
      })
    })

    const stripeData = await stripeResponse.json()

    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({ error: stripeData.error?.message || 'Failed to create payment intent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store payment intent in database
    const { data: paymentIntent, error: dbError } = await supabaseAdmin
      .from('payment_intents')
      .insert({
        invoice_id: invoice.id,
        gateway: 'stripe',
        gateway_payment_id: stripeData.id,
        gateway_account_id: company.payment_gateway_account_id,
        amount: amount,
        currency: 'usd',
        status: stripeData.status,
        client_secret: stripeData.client_secret,
        payment_method_types: paymentMethodTypes,
        metadata: {
          invoice_number: invoice.invoice_number,
          balance_due: invoice.balance_due
        }
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving payment intent:', dbError)
    }

    return new Response(
      JSON.stringify({
        client_secret: stripeData.client_secret,
        payment_intent_id: stripeData.id,
        amount: amount,
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          balance_due: invoice.balance_due,
          total_amount: invoice.total_amount
        },
        payment_method_types: paymentMethodTypes,
        recommended_method: amount >= 500 ? 'ach' : 'card'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Create payment intent error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

