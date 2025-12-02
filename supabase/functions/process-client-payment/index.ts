// Process Client Payment Edge Function
// Confirms and processes a client payment for an invoice

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
    const { payment_intent_id, invoice_id } = await req.json()

    if (!payment_intent_id || !invoice_id) {
      return new Response(
        JSON.stringify({ error: 'payment_intent_id and invoice_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', invoice_id)
      .single()

    if (invoiceError || !invoice) {
      return new Response(
        JSON.stringify({ error: 'Invoice not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company's payment gateway
    const { data: company } = await supabaseAdmin
      .from('company_profiles')
      .select('payment_gateway_account_id')
      .eq('id', invoice.created_by)
      .single()

    if (!company?.payment_gateway_account_id) {
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

    // Retrieve payment intent from Stripe
    const stripeResponse = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Stripe-Account': company.payment_gateway_account_id,
      }
    })

    const paymentIntent = await stripeResponse.json()

    if (!stripeResponse.ok) {
      return new Response(
        JSON.stringify({ error: paymentIntent.error?.message || 'Failed to retrieve payment intent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check payment status
    if (paymentIntent.status !== 'succeeded') {
      return new Response(
        JSON.stringify({
          success: false,
          status: paymentIntent.status,
          message: paymentIntent.status === 'requires_payment_method' 
            ? 'Payment method required' 
            : paymentIntent.status === 'requires_confirmation'
            ? 'Payment requires confirmation'
            : 'Payment not yet completed'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Payment succeeded - update invoice and create payment record
    const paymentAmount = paymentIntent.amount / 100
    const newPaidAmount = parseFloat(invoice.paid_amount || 0) + paymentAmount
    const newBalance = parseFloat(invoice.total_amount) - newPaidAmount

    // Update invoice
    const invoiceUpdate: any = {
      paid_amount: newPaidAmount,
      balance_due: Math.max(0, newBalance),
      updated_at: new Date().toISOString()
    }

    // Mark as paid if balance is zero
    if (newBalance <= 0) {
      invoiceUpdate.status = 'paid'
      invoiceUpdate.paid_at = new Date().toISOString()
    } else if (invoice.status === 'overdue') {
      invoiceUpdate.status = 'sent' // Reset from overdue if partial payment
    }

    await supabaseAdmin
      .from('invoices')
      .update(invoiceUpdate)
      .eq('id', invoice_id)

    // Create payment record
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        invoice_id: invoice_id,
        amount: paymentAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentIntent.payment_method_types?.[0] === 'us_bank_account' ? 'bank_transfer' : 'credit_card',
        reference_number: paymentIntent.id,
        payment_status: 'succeeded',
        gateway: 'stripe',
        gateway_payment_id: paymentIntent.id,
        gateway_account_id: company.payment_gateway_account_id,
        receipt_url: paymentIntent.charges?.data?.[0]?.receipt_url,
        gateway_metadata: {
          payment_method: paymentIntent.payment_method_types,
          charge_id: paymentIntent.latest_charge
        }
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Error creating payment record:', paymentError)
    }

    // Get charge details for receipt URL
    let receiptUrl = null
    if (paymentIntent.latest_charge) {
      const chargeResponse = await fetch(`https://api.stripe.com/v1/charges/${paymentIntent.latest_charge}`, {
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Stripe-Account': company.payment_gateway_account_id,
        }
      })
      const charge = await chargeResponse.json()
      receiptUrl = charge.receipt_url
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          id: payment?.id,
          amount: paymentAmount,
          status: 'succeeded',
          receipt_url: receiptUrl || paymentIntent.charges?.data?.[0]?.receipt_url
        },
        invoice: {
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          balance_due: Math.max(0, newBalance),
          status: newBalance <= 0 ? 'paid' : invoice.status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Process payment error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

