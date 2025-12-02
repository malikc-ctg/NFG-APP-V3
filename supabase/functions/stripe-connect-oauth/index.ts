// Stripe Connect OAuth Edge Function
// Handles Stripe Connect OAuth flow for companies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OAuthRequest {
  company_id?: string
  action?: 'initiate' | 'callback'
  code?: string
  state?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const action = url.searchParams.get('action')

    // Handle OAuth callback (GET request from Stripe redirect)
    if (req.method === 'GET' && (code || action === 'callback')) {
      return await handleOAuthCallbackGET(url)
    }

    // For POST requests, require authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader && req.method !== 'GET') {
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

    // Get the user from the JWT token
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile to find company
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Company not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const companyId = userProfile.company_id

    // Get Stripe secrets
    const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
    const stripeClientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID')

    if (!stripeSecretKey || !stripeClientId) {
      console.error('Stripe secrets not configured')
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: OAuthRequest = await req.json().catch(() => ({}))
    const action = body.action || 'initiate'
    const url = new URL(req.url)
    const code = url.searchParams.get('code') || body.code
    const state = url.searchParams.get('state') || body.state

    // Handle OAuth callback
    if (action === 'callback' || code) {
      return await handleOAuthCallback(
        supabaseAdmin,
        companyId,
        code!,
        state!,
        stripeSecretKey,
        stripeClientId
      )
    }

    // Handle OAuth initiation
    return await initiateOAuth(
      supabaseAdmin,
      companyId,
      user.id,
      stripeClientId
    )

  } catch (error) {
    console.error('Stripe Connect OAuth error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Initiate Stripe Connect OAuth flow
 */
async function initiateOAuth(
  supabaseAdmin: any,
  companyId: string,
  userId: string,
  stripeClientId: string
) {
  try {
    // Generate state token
    const stateToken = crypto.randomUUID()

    // Get redirect URL (OAuth callback URL)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const redirectUri = `${supabaseUrl}/functions/v1/stripe-connect-oauth?action=callback`

    // Store OAuth session
    const { error: sessionError } = await supabaseAdmin
      .from('gateway_oauth_sessions')
      .insert({
        company_id: companyId,
        gateway: 'stripe',
        state_token: stateToken,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
      })

    if (sessionError) {
      console.error('Error creating OAuth session:', sessionError)
      throw new Error('Failed to create OAuth session')
    }

    // Build Stripe OAuth URL
    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize')
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('client_id', stripeClientId)
    oauthUrl.searchParams.set('redirect_uri', redirectUri)
    oauthUrl.searchParams.set('scope', 'read_write')
    oauthUrl.searchParams.set('state', stateToken)

    return new Response(
      JSON.stringify({
        url: oauthUrl.toString(),
        state: stateToken,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error initiating OAuth:', error)
    throw error
  }
}

/**
 * Handle OAuth callback from GET request (Stripe redirect)
 */
async function handleOAuthCallbackGET(url: URL) {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    return new Response(
      JSON.stringify({ error: 'Missing code or state parameter' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create Supabase admin client
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Find OAuth session by state token to get company_id
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('gateway_oauth_sessions')
    .select('company_id')
    .eq('state_token', state)
    .eq('status', 'pending')
    .single()

  if (sessionError || !session) {
    // Return HTML redirect to settings page with error
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Stripe Connection Failed</title>
        <meta http-equiv="refresh" content="3;url=/settings.html?oauth_error=invalid_session">
      </head>
      <body>
        <h1>Connection Failed</h1>
        <p>Invalid or expired OAuth session. Redirecting...</p>
      </body>
      </html>`,
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )
  }

  const companyId = session.company_id

  const stripeSecretKey = Deno.env.get('STRIPE_PLATFORM_SECRET_KEY')
  const stripeClientId = Deno.env.get('STRIPE_CONNECT_CLIENT_ID')

  if (!stripeSecretKey || !stripeClientId) {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Configuration Error</title>
        <meta http-equiv="refresh" content="3;url=/settings.html?oauth_error=config_error">
      </head>
      <body>
        <h1>Configuration Error</h1>
        <p>Payment gateway not configured. Redirecting...</p>
      </body>
      </html>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )
  }

  // Process callback
  const result = await handleOAuthCallback(
    supabaseAdmin,
    companyId,
    code,
    state,
    stripeSecretKey,
    stripeClientId
  )

  // If successful, redirect to settings page
  if (result.ok) {
    const data = await result.json()
    if (data.success) {
      // Redirect to settings page with success
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Stripe Connected</title>
          <meta http-equiv="refresh" content="2;url=/settings.html?oauth_success=true">
        </head>
        <body>
          <h1>Successfully Connected!</h1>
          <p>Your Stripe account has been connected. Redirecting to settings...</p>
        </body>
        </html>`,
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }
  }

  // Error occurred, redirect with error
  return new Response(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>Connection Failed</title>
      <meta http-equiv="refresh" content="3;url=/settings.html?oauth_error=failed">
    </head>
    <body>
      <h1>Connection Failed</h1>
      <p>An error occurred while connecting your Stripe account. Redirecting...</p>
    </body>
    </html>`,
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
  )
}

/**
 * Handle Stripe Connect OAuth callback
 */
async function handleOAuthCallback(
  supabaseAdmin: any,
  companyId: string,
  code: string,
  state: string,
  stripeSecretKey: string,
  stripeClientId: string
) {
  try {
    // Verify state token
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('gateway_oauth_sessions')
      .select('*')
      .eq('state_token', state)
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OAuth session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      await supabaseAdmin
        .from('gateway_oauth_sessions')
        .update({ status: 'expired' })
        .eq('id', session.id)

      return new Response(
        JSON.stringify({ error: 'OAuth session expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Exchange code for access token with Stripe
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/stripe-connect-oauth?action=callback`

    const tokenResponse = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: stripeClientId,
        code: code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Stripe OAuth token error:', errorData)

      await supabaseAdmin
        .from('gateway_oauth_sessions')
        .update({ status: 'failed' })
        .eq('id', session.id)

      return new Response(
        JSON.stringify({ error: 'Failed to exchange OAuth code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const tokenData = await tokenResponse.json()
    const { access_token, stripe_user_id, stripe_publishable_key } = tokenData

    if (!access_token || !stripe_user_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid OAuth response from Stripe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Stripe account details
    const accountResponse = await fetch('https://api.stripe.com/v1/account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    let accountData = null
    if (accountResponse.ok) {
      accountData = await accountResponse.json()
    }

    // Get account dashboard link
    const loginLinkResponse = await fetch(
      `https://api.stripe.com/v1/accounts/${stripe_user_id}/login_links`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${stripeSecretKey}`,
          'Stripe-Account': stripe_user_id,
        },
      }
    )

    let dashboardLink = null
    if (loginLinkResponse.ok) {
      const loginLinkData = await loginLinkResponse.json()
      dashboardLink = loginLinkData.url
    }

    // Update company profile
    const { error: updateError } = await supabaseAdmin
      .from('company_profiles')
      .update({
        payment_gateway: 'stripe',
        payment_gateway_connected: true,
        payment_gateway_account_id: stripe_user_id,
        payment_gateway_account_status: accountData?.charges_enabled ? 'active' : 'pending',
        payment_gateway_dashboard_link: dashboardLink,
        payment_gateway_metadata: {
          access_token: access_token, // Store securely - should be encrypted in production
          publishable_key: stripe_publishable_key,
          account_type: accountData?.type || 'standard',
          charges_enabled: accountData?.charges_enabled || false,
          payouts_enabled: accountData?.payouts_enabled || false,
          country: accountData?.country || 'us',
          email: accountData?.email || null,
          business_type: accountData?.business_type || null,
        },
      })
      .eq('id', companyId)

    if (updateError) {
      console.error('Error updating company profile:', updateError)
      throw new Error('Failed to update company profile')
    }

    // Update or create gateway connection record
    const { error: connectionError } = await supabaseAdmin
      .from('payment_gateway_connections')
      .upsert({
        company_id: companyId,
        gateway: 'stripe',
        gateway_account_id: stripe_user_id,
        connection_status: accountData?.charges_enabled ? 'active' : 'pending',
        connection_data: {
          access_token: access_token,
          publishable_key: stripe_publishable_key,
          account_type: accountData?.type || 'standard',
          country: accountData?.country || 'us',
        },
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,gateway',
      })

    if (connectionError) {
      console.error('Error creating gateway connection:', connectionError)
      // Non-fatal, continue
    }

    // Update OAuth session
    await supabaseAdmin
      .from('gateway_oauth_sessions')
      .update({
        status: 'completed',
        gateway_account_id: stripe_user_id,
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)

    // Return success response (will redirect in frontend)
    return new Response(
      JSON.stringify({
        success: true,
        account_id: stripe_user_id,
        status: accountData?.charges_enabled ? 'active' : 'pending',
        dashboard_link: dashboardLink,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error handling OAuth callback:', error)
    throw error
  }
}
