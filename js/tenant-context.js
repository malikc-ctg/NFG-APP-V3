// Tenant Context System
// Manages multi-tenant isolation and company context

import { supabase } from './supabase.js'
import { getCompanyId } from './branding.js'

let currentTenant = null
let tenantId = null

/**
 * Load tenant context for current user
 */
export async function loadTenantContext() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.warn('[Tenant] No authenticated user')
      return null
    }

    // Get user's company/tenant
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select(`
        company_id,
        company_profiles(
          id,
          company_name,
          company_display_name,
          platform_name,
          white_label_enabled,
          subscription_tier
        )
      `)
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      console.error('[Tenant] Error loading tenant context:', error)
      return null
    }

    currentTenant = profile.company_profiles
    tenantId = profile.company_id

    console.log('[Tenant] Context loaded:', {
      tenantId,
      companyName: currentTenant?.company_display_name,
      whiteLabel: currentTenant?.white_label_enabled
    })

    return currentTenant

  } catch (error) {
    console.error('[Tenant] Error loading tenant context:', error)
    return null
  }
}

/**
 * Get current tenant ID
 */
export async function getTenantId() {
  if (tenantId) {
    return tenantId
  }

  tenantId = await getCompanyId()
  return tenantId
}

/**
 * Get current tenant data
 */
export function getCurrentTenant() {
  return currentTenant
}

/**
 * Add tenant filter to Supabase query
 * Use this helper to ensure tenant isolation
 */
export function addTenantFilter(query, tableName) {
  // Different tables link to company differently
  // This helper adds the appropriate filter based on table structure

  if (!query) return query

  // Tables that have direct company_id column
  const directCompanyTables = [
    'user_profiles',
    'platform_subscriptions'
  ]

  // Tables that link via created_by → user_profiles → company_id
  const viaCreatedByTables = [
    'sites',
    'jobs',
    'invoices',
    'expenses',
    'bookings' // via client_id
  ]

  if (directCompanyTables.includes(tableName)) {
    // Filter by company_id directly
    return query.eq('company_id', tenantId)
  } else if (viaCreatedByTables.includes(tableName)) {
    // For now, we'll handle this in the application layer
    // RLS policies should handle tenant isolation
    return query
  }

  return query
}

/**
 * Check if user has access to a resource (tenant isolation check)
 */
export async function hasAccess(resourceType, resourceId) {
  const tid = await getTenantId()
  if (!tid) return false

  // This is a helper for explicit access checks
  // RLS policies are the primary security mechanism
  
  switch (resourceType) {
    case 'site':
      // Check if site belongs to user's tenant
      const { data: site } = await supabase
        .from('sites')
        .select('created_by, user_profiles!sites_created_by_fkey(company_id)')
        .eq('id', resourceId)
        .single()
      
      return site?.user_profiles?.company_id === tid

    case 'invoice':
      // Check if invoice belongs to user's tenant
      const { data: invoice } = await supabase
        .from('invoices')
        .select('created_by, user_profiles!invoices_created_by_fkey(company_id)')
        .eq('id', resourceId)
        .single()
      
      return invoice?.user_profiles?.company_id === tid

    default:
      console.warn('[Tenant] Unknown resource type:', resourceType)
      return false
  }
}

/**
 * Initialize tenant context
 * Call this on app initialization
 */
export async function initializeTenant() {
  await loadTenantContext()
  return currentTenant
}

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Only auto-initialize if user is authenticated
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      loadTenantContext()
    } else if (event === 'SIGNED_OUT') {
      currentTenant = null
      tenantId = null
    }
  })

  // Initialize if already authenticated
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      loadTenantContext()
    }
  })
}

