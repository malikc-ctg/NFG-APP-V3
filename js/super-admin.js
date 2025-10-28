// Super Admin & Impersonation System
import { supabase } from './supabase.js'
import { toast } from './notifications.js'

let currentUser = null
let isSuperAdmin = false
let isImpersonating = false
let impersonatedUser = null

// Initialize super admin features
export async function initSuperAdmin() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Get user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (error || !profile) {
      console.error('[SuperAdmin] Error fetching profile:', error)
      return
    }
    
    currentUser = profile
    isSuperAdmin = profile.role === 'super_admin'
    
    if (!isSuperAdmin) {
      console.log('[SuperAdmin] User is not a super admin')
      return
    }
    
    console.log('[SuperAdmin] 🔑 Super Admin detected!', profile.email)
    
    // Check if currently impersonating
    await checkImpersonationStatus()
    
    // Show super admin badge
    showSuperAdminBadge()
    
    // Add impersonation banner if active
    if (isImpersonating) {
      showImpersonationBanner()
    }
    
  } catch (error) {
    console.error('[SuperAdmin] Init error:', error)
  }
}

// Check if currently impersonating someone
async function checkImpersonationStatus() {
  try {
    const { data, error } = await supabase
      .from('user_impersonation')
      .select(`
        *,
        impersonated:user_profiles!user_impersonation_impersonated_user_id_fkey(*)
      `)
      .eq('super_admin_id', currentUser.user_id)
      .is('ended_at', null)
      .single()
    
    if (data && !error) {
      isImpersonating = true
      impersonatedUser = data.impersonated
      console.log('[SuperAdmin] 👤 Currently impersonating:', impersonatedUser?.email)
    }
  } catch (error) {
    // No active impersonation
    isImpersonating = false
  }
}

// Show super admin badge
function showSuperAdminBadge() {
  // Add badge to user email in header (if exists)
  const userEmailEl = document.getElementById('user-email')
  if (userEmailEl && userEmailEl.value) {
    const badge = document.createElement('span')
    badge.className = 'ml-2 px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full'
    badge.textContent = 'SUPER ADMIN 🔑'
    badge.id = 'super-admin-badge'
    
    // Add after email input if in settings
    if (userEmailEl.parentElement && !document.getElementById('super-admin-badge')) {
      const container = document.createElement('div')
      container.className = 'mt-2'
      container.appendChild(badge)
      userEmailEl.parentElement.appendChild(container)
    }
  }
}

// Show impersonation banner
function showImpersonationBanner() {
  if (!impersonatedUser || document.getElementById('impersonation-banner')) return
  
  const banner = document.createElement('div')
  banner.id = 'impersonation-banner'
  banner.className = 'fixed top-0 left-0 right-0 z-50 bg-yellow-500 dark:bg-yellow-600 text-white py-2 px-4 shadow-lg'
  banner.innerHTML = `
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <i data-lucide="user-check" class="w-5 h-5"></i>
        <span class="font-medium">
          Viewing as: ${impersonatedUser.full_name || impersonatedUser.email}
        </span>
        <span class="text-xs opacity-90">(${impersonatedUser.role})</span>
      </div>
      <button 
        onclick="window.SuperAdmin.exitImpersonation()" 
        class="px-4 py-1.5 bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2">
        <i data-lucide="log-out" class="w-4 h-4"></i>
        Exit Impersonation
      </button>
    </div>
  `
  
  document.body.insertBefore(banner, document.body.firstChild)
  
  // Add padding to body to account for banner
  document.body.style.paddingTop = '48px'
  
  // Initialize icons
  if (window.lucide) lucide.createIcons()
}

// Start impersonating a user
export async function startImpersonation(userId, reason = 'Support/debugging') {
  if (!isSuperAdmin) {
    toast.error('Only super admins can impersonate users', 'Access Denied')
    return
  }
  
  try {
    console.log('[SuperAdmin] Starting impersonation for user:', userId)
    
    // Get user profile
    const { data: targetUser, error: userError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (userError || !targetUser) {
      throw new Error('User not found')
    }
    
    // Don't allow impersonating another super admin
    if (targetUser.role === 'super_admin') {
      toast.error('Cannot impersonate another super admin', 'Access Denied')
      return
    }
    
    // Create impersonation record
    const { error: impError } = await supabase
      .from('user_impersonation')
      .insert({
        super_admin_id: currentUser.user_id,
        impersonated_user_id: userId,
        reason: reason
      })
    
    if (impError) {
      console.error('[SuperAdmin] Impersonation error:', impError)
      throw impError
    }
    
    console.log('[SuperAdmin] ✅ Impersonation started')
    toast.success(`Now viewing as ${targetUser.full_name || targetUser.email}`, 'Impersonation Active')
    
    // Reload to apply impersonation
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    
  } catch (error) {
    console.error('[SuperAdmin] Error starting impersonation:', error)
    toast.error('Failed to start impersonation', 'Error')
  }
}

// Exit impersonation
export async function exitImpersonation() {
  if (!isImpersonating) return
  
  try {
    console.log('[SuperAdmin] Exiting impersonation...')
    
    // End the impersonation session
    const { error } = await supabase
      .from('user_impersonation')
      .update({ ended_at: new Date().toISOString() })
      .eq('super_admin_id', currentUser.user_id)
      .is('ended_at', null)
    
    if (error) {
      console.error('[SuperAdmin] Exit error:', error)
      throw error
    }
    
    console.log('[SuperAdmin] ✅ Impersonation ended')
    toast.success('Returned to your account', 'Impersonation Ended')
    
    // Reload to restore normal view
    setTimeout(() => {
      window.location.reload()
    }, 800)
    
  } catch (error) {
    console.error('[SuperAdmin] Error exiting impersonation:', error)
    toast.error('Failed to exit impersonation', 'Error')
  }
}

// Check if user is super admin
export function isSuperAdminUser() {
  return isSuperAdmin
}

// Check if currently impersonating
export function isCurrentlyImpersonating() {
  return isImpersonating
}

// Get impersonated user
export function getImpersonatedUser() {
  return impersonatedUser
}

// Export functions to window for easy access
if (typeof window !== 'undefined') {
  window.SuperAdmin = {
    startImpersonation,
    exitImpersonation,
    isSuperAdmin: isSuperAdminUser,
    isImpersonating: isCurrentlyImpersonating
  }
}

// Auto-initialize on import
initSuperAdmin()

