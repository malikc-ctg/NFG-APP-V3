import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

const QUICKBOOKS_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  const requestUrl = new URL(req.url)
  const stateToken = requestUrl.searchParams.get('state')
  const authCode = requestUrl.searchParams.get('code')
  const realmId = requestUrl.searchParams.get('realmId')
  const errorParam = requestUrl.searchParams.get('error')

  const supabaseAdmin = getServiceClient()

  if (!stateToken) {
    return redirectWithStatus('missing_state')
  }

  if (errorParam) {
    await markStateError(supabaseAdmin, stateToken, errorParam)
    return redirectWithStatus('denied', stateToken, errorParam)
  }

  if (!authCode || !realmId) {
    await markStateError(supabaseAdmin, stateToken, 'missing_code_or_realm')
    return redirectWithStatus('error', stateToken, 'Missing code or realmId')
  }

  try {
    const { data: stateRow, error: stateError } = await supabaseAdmin
      .from('integration_states')
      .select('*')
      .eq('state_token', stateToken)
      .eq('provider', 'quickbooks')
      .maybeSingle()

    if (stateError || !stateRow) {
      return redirectWithStatus('invalid_state')
    }

    if (stateRow.used || (stateRow.used_at && new Date(stateRow.used_at) < new Date())) {
      return redirectWithStatus('state_already_used', stateToken, undefined, stateRow.redirect_to)
    }

    if (new Date(stateRow.expires_at) < new Date()) {
      await markStateError(supabaseAdmin, stateToken, 'state_expired')
      return redirectWithStatus('state_expired', stateToken, undefined, stateRow.redirect_to)
    }

    const tokens = await exchangeCodeForTokens(authCode)

    if (!tokens) {
      await markStateError(supabaseAdmin, stateToken, 'token_exchange_failed')
      return redirectWithStatus('error', stateToken, 'Failed to exchange authorization code', stateRow.redirect_to)
    }

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()
    const scopes = typeof tokens.scope === 'string'
      ? tokens.scope.split(' ').filter(Boolean)
      : []

    const connectionPayload = {
      organization_id: stateRow.organization_id,
      created_by: stateRow.user_id,
      realm_id: realmId,
      token_type: tokens.token_type || 'bearer',
      scope: scopes,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
      disconnected_at: null,
      status: 'connected',
      last_error: null,
      last_error_at: null,
      metadata: {
        x_refresh_token_expires_in: tokens.x_refresh_token_expires_in,
        id_token: tokens.id_token ? 'stored' : null
      },
      updated_at: new Date().toISOString()
    }

    const existingConnection = await supabaseAdmin
      .from('quickbooks_connections')
      .select('id')
      .eq('organization_id', stateRow.organization_id)
      .maybeSingle()

    if (existingConnection.data) {
      const { error: updateError } = await supabaseAdmin
        .from('quickbooks_connections')
        .update(connectionPayload)
        .eq('id', existingConnection.data.id)

      if (updateError) {
        console.error('Failed to update existing QuickBooks connection', updateError)
        await markStateError(supabaseAdmin, stateToken, 'connection_update_failed')
        return redirectWithStatus('error', stateToken, 'Failed to update QuickBooks connection', stateRow.redirect_to)
      }
    } else {
      const { error: insertError } = await supabaseAdmin
        .from('quickbooks_connections')
        .insert(connectionPayload)

      if (insertError) {
        console.error('Failed to insert QuickBooks connection', insertError)
        await markStateError(supabaseAdmin, stateToken, 'connection_insert_failed')
        return redirectWithStatus('error', stateToken, 'Failed to save QuickBooks connection', stateRow.redirect_to)
      }
    }

    await supabaseAdmin
      .from('quickbooks_sync_state')
      .upsert(
        { organization_id: stateRow.organization_id },
        { onConflict: 'organization_id' }
      )

    await supabaseAdmin
      .from('integration_states')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', stateRow.id)

    return redirectWithStatus('success', stateToken, undefined, stateRow.redirect_to)
  } catch (error) {
    console.error('quickbooks-callback error', error)
    await markStateError(supabaseAdmin, stateToken, 'callback_exception')
    return redirectWithStatus('error', stateToken, 'Unexpected error occurred')
  }
})

async function exchangeCodeForTokens(code: string) {
  const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
  const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')
  const redirectUri = Deno.env.get('QUICKBOOKS_REDIRECT_URI')

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('QuickBooks env vars are missing')
    return null
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`)
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  })

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('QuickBooks token exchange failed', errorText)
    return null
  }

  return await response.json()
}

async function markStateError(
  supabaseAdmin: ReturnType<typeof getServiceClient>,
  state: string,
  message: string
) {
  await supabaseAdmin
    .from('integration_states')
    .update({ used: true, used_at: new Date().toISOString() })
    .eq('state_token', state)
}

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
}

function redirectWithStatus(
  status: string,
  state?: string | null,
  message?: string | null,
  redirectOverride?: string | null
) {
  const baseRedirect =
    redirectOverride ||
    Deno.env.get('APP_BASE_URL') ||
    'https://nfgone.ca/settings.html'

  const url = new URL(baseRedirect)
  url.searchParams.set('provider', 'quickbooks')
  url.searchParams.set('status', status)
  if (state) url.searchParams.set('state', state)
  if (message) url.searchParams.set('message', message)

  return new Response(null, {
    status: 302,
    headers: { Location: url.toString(), ...corsHeaders }
  })
}

