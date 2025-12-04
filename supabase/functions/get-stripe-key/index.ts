// Get Stripe Publishable Key for Connected Account
// Returns the publishable key for a company's Stripe Connect account

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
    const { invoice_id, company_id } = await req.json()

    if (!invoice_id && !company_id) {
      return new Response(
        JSON.stringify({ error: 'invoice_id or company_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get company ID from invoice if needed
    let companyId = company_id
    if (!companyId && invoice_id) {
      const { data: invoice } = await supabaseAdmin
        .from('invoices')
        .select('created_by')
        .eq('id', invoice_id)
        .single()
      
      if (invoice) {
        companyId = invoice.created_by
      }
    }

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get company's Stripe account ID
    const { data: company } = await supabaseAdmin
      .from('company_profiles')
      .select('payment_gateway_account_id')
      .eq('id', companyId)
      .single()

    if (!company?.payment_gateway_account_id) {
      return new Response(
        JSON.stringify({ error: 'Payment gateway not connected' }),
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

    // Get account details from Stripe to get publishable key
    const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${company.payment_gateway_account_id}`, {
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`
      }
    })

    if (!accountResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Stripe account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const account = await accountResponse.json()

    // For connected accounts, we use the platform's publishable key
    // The account_id is used when creating payment intents
    const platformPublishableKey = Deno.env.get('STRIPE_PLATFORM_PUBLISHABLE_KEY') || 'pk_live_placeholder'

    return new Response(
      JSON.stringify({
        publishable_key: platformPublishableKey,
        account_id: company.payment_gateway_account_id,
        account_type: account.type || 'standard'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Get Stripe key error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

