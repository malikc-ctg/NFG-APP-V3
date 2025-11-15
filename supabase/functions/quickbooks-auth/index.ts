import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS'
}

const QUICKBOOKS_AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const url = new URL(req.url)
    const accessToken = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!accessToken) {
      return jsonResponse({ error: 'Missing access token' }, 401)
    }

    const supabaseAdmin = getServiceClient()

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid or expired session' }, 401)
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile?.organization_id) {
      return jsonResponse({ error: 'User is not associated with an organization' }, 400)
    }

    const orgId = url.searchParams.get('org_id') ?? profile.organization_id
    const redirectTo = url.searchParams.get('redirect_to') || ''

    const stateToken = crypto.randomUUID().replace(/-/g, '')
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    const { error: stateError } = await supabaseAdmin
      .from('integration_states')
      .insert({
        organization_id: orgId,
        user_id: user.id,
        provider: 'quickbooks',
        state_token: stateToken,
        redirect_to: redirectTo,
        expires_at: expiresAt
      })

    if (stateError) {
      console.error('Failed to create integration state', stateError)
      return jsonResponse({ error: 'Failed to initiate QuickBooks connection' }, 500)
    }

    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
    const redirectUri = Deno.env.get('QUICKBOOKS_REDIRECT_URI')
    const scopes =
      Deno.env.get('QUICKBOOKS_SCOPES') ||
      'com.intuit.quickbooks.accounting openid profile email'

    if (!clientId || !redirectUri) {
      return jsonResponse({ error: 'QuickBooks environment variables are not configured' }, 500)
    }

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      scope: scopes,
      redirect_uri: redirectUri,
      state: stateToken
    })

    const authorizeUrl = `${QUICKBOOKS_AUTHORIZE_URL}?${params.toString()}`

    return jsonResponse({ authorizeUrl, state: stateToken })
  } catch (error) {
    console.error('quickbooks-auth error', error)
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500)
  }
})

function getServiceClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  })
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

