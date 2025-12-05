// Branding System for Multi-Tenancy
// Handles white-label (premium) vs platform branding (default)

import { supabase } from './supabase.js'

let currentBranding = null
let currentCompany = null

/**
 * Load company branding from database
 * Returns platform branding if white-label not enabled (default)
 */
export async function loadCompanyBranding() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return getPlatformBranding() // Default to platform branding
    }

    // Get user's company
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('company_id, company_profiles(*)')
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      console.warn('[Branding] No company profile found, using platform branding')
      return getPlatformBranding()
    }

    currentCompany = profile.company_profiles

    // Check if white-label is enabled (premium feature)
    if (!currentCompany?.white_label_enabled) {
      // Use platform branding (default)
      currentBranding = getPlatformBranding()
      return currentBranding
    }

    // Use white-label branding (premium)
    currentBranding = {
      isWhiteLabel: true,
      platformName: currentCompany.platform_name || 'handl.it',
      companyName: currentCompany.company_display_name || currentCompany.company_name || 'Company',
      logo: currentCompany.logo_url || getPlatformBranding().logo,
      primaryColor: currentCompany.primary_color || '#0D47A1',
      secondaryColor: currentCompany.secondary_color || '#0A3A84',
      showPlatformBranding: false, // Premium = minimal platform branding
      subscriptionTier: currentCompany.subscription_tier || 'basic'
    }

    return currentBranding

  } catch (error) {
    console.error('[Branding] Error loading branding:', error)
    return getPlatformBranding() // Fallback to platform
  }
}

/**
 * Get platform branding (default for non-white-label companies)
 */
export function getPlatformBranding() {
  return {
    isWhiteLabel: false,
    platformName: 'handl.it',
    companyName: 'handl.it',
    logo: 'https://zqcbldgheimqrnqmbbed.supabase.co/storage/v1/object/sign/app-images/Untitled%20design.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8xN2RmNDhlMi0xNGJlLTQ5NzMtODZlNy0zZTc0MjgzMWIzOTQiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJhcHAtaW1hZ2VzL1VudGl0bGVkIGRlc2lnbi5wbmciLCJpYXQiOjE3NjQ5NzExMTUsImV4cCI6NDg4NzAzNTExNX0.gLGPNDBFahGt3_dmWSFIny3YZbuU3eWBA86Gnu2Umpw', // handl.it platform logo
    primaryColor: '#0D47A1',
    secondaryColor: '#0A3A84',
    showPlatformBranding: true, // Show "Powered by handl.it" prominently
    subscriptionTier: 'basic'
  }
}

/**
 * Apply branding to the current page
 */
export async function applyBranding() {
  const branding = await loadCompanyBranding()
  
  if (!branding) return

  // Update logo images
  document.querySelectorAll('.company-logo, [data-branding="logo"]').forEach(el => {
    el.src = branding.logo
    el.alt = branding.companyName
  })

  // Update company name text
  document.querySelectorAll('.company-name, [data-branding="name"]').forEach(el => {
    el.textContent = branding.companyName
  })

  // Update platform name
  document.querySelectorAll('.platform-name, [data-branding="platform"]').forEach(el => {
    el.textContent = branding.platformName
  })

  // Update CSS variables for colors
  document.documentElement.style.setProperty('--primary-color', branding.primaryColor)
  document.documentElement.style.setProperty('--secondary-color', branding.secondaryColor)

  // Update page title
  updatePageTitle(branding)

  // Update favicon if white-label
  if (branding.isWhiteLabel && branding.logo) {
    updateFavicon(branding.logo)
  }

  // Show/hide platform branding
  document.querySelectorAll('[data-platform-branding]').forEach(el => {
    el.style.display = branding.showPlatformBranding ? 'block' : 'none'
  })

  // Update footer
  updateFooter(branding)

  console.log('[Branding] Applied:', branding.isWhiteLabel ? 'White-Label' : 'Platform', branding.companyName)
}

/**
 * Update page title with branding
 */
function updatePageTitle(branding) {
  const currentTitle = document.title
  const pageName = currentTitle.split('—')[1]?.trim() || currentTitle.split('—')[0]?.trim() || 'Dashboard'
  
  if (branding.isWhiteLabel) {
    document.title = `${pageName} — ${branding.companyName}`
  } else {
    document.title = `${pageName} — ${branding.platformName}`
  }
}

/**
 * Update favicon
 */
function updateFavicon(logoUrl) {
  let link = document.querySelector("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = logoUrl
}

/**
 * Update footer with platform attribution
 */
function updateFooter(branding) {
  const footerElements = document.querySelectorAll('[data-branding="footer"]')
  
  footerElements.forEach(footer => {
    if (branding.isWhiteLabel) {
      // Premium: Minimal platform branding
      footer.innerHTML = `
        <p class="text-sm text-gray-500 dark:text-gray-400">
          © ${new Date().getFullYear()} ${branding.companyName}. 
          <span class="text-gray-400">Powered by ${branding.platformName}</span>
        </p>
      `
    } else {
      // Basic: Full platform branding
      footer.innerHTML = `
        <p class="text-sm text-gray-500 dark:text-gray-400">
          © ${new Date().getFullYear()} ${branding.platformName}. All rights reserved.
        </p>
      `
    }
  })
}

/**
 * Get current branding (cached)
 */
export function getCurrentBranding() {
  return currentBranding || getPlatformBranding()
}

/**
 * Check if current company has white-label
 */
export function hasWhiteLabel() {
  return currentBranding?.isWhiteLabel || false
}

/**
 * Get company ID for tenant isolation
 */
export async function getCompanyId() {
  if (currentCompany?.id) {
    return currentCompany.id
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    return profile?.company_id || null
  } catch (error) {
    console.error('[Branding] Error getting company ID:', error)
    return null
  }
}

// Auto-apply branding when module loads (for pages that import it)
if (typeof window !== 'undefined') {
  // Apply branding after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBranding)
  } else {
    applyBranding()
  }
}

