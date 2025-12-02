/**
 * Client Portal Authentication & Routing
 * Handles role-based redirects and client authentication
 */

import { supabase } from './supabase.js';

/**
 * Check user role and redirect accordingly
 */
export async function checkUserRoleAndRedirect() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Not logged in - redirect to login
      if (!window.location.pathname.includes('index.html')) {
        window.location.href = './index.html';
      }
      return null;
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('[ClientAuth] Error fetching profile:', error);
      return null;
    }
    
    if (!profile) {
      console.error('[ClientAuth] No profile found');
      return null;
    }
    
    const currentPath = window.location.pathname;
    const isClientPortal = currentPath.includes('client-');
    const isAdminArea = !isClientPortal && !currentPath.includes('index.html') && !currentPath.includes('signup.html');
    
    // Client users should only access client portal
    if (profile.role === 'client') {
      if (!isClientPortal) {
        console.log('[ClientAuth] Client user - redirecting to portal');
        window.location.href = './client-portal.html';
        return { role: 'client', profile };
      }
    } 
    // Admin/Staff users should not access client portal
    else if (profile.role === 'admin' || profile.role === 'staff' || profile.role === 'super_admin') {
      if (isClientPortal) {
        console.log('[ClientAuth] Admin/Staff user - redirecting to dashboard');
        window.location.href = './dashboard.html';
        return { role: profile.role, profile };
      }
    }
    
    return { role: profile.role, profile };
  } catch (error) {
    console.error('[ClientAuth] Error in checkUserRoleAndRedirect:', error);
    return null;
  }
}

/**
 * Ensure user is a client
 */
export async function requireClient() {
  const result = await checkUserRoleAndRedirect();
  if (!result || result.role !== 'client') {
    return null;
  }
  return result;
}

/**
 * Get current client's sites
 */
export async function getClientSites() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('client_id', user.id)
    .order('name');
  
  if (error) {
    console.error('[ClientAuth] Error fetching client sites:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Check if user can view a specific site
 */
export async function canViewSite(siteId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  // Admins and staff can view all sites
  if (profile?.role === 'admin' || profile?.role === 'staff' || profile?.role === 'super_admin') {
    return true;
  }
  
  // Clients can only view their own sites
  if (profile?.role === 'client') {
    const { data: site } = await supabase
      .from('sites')
      .select('client_id')
      .eq('id', siteId)
      .single();
    
    return site?.client_id === user.id;
  }
  
  return false;
}

/**
 * Check user authentication and redirect based on role
 * Called after login to route users to appropriate dashboard
 */
export async function checkClientAuth() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Not logged in - stay on login page
      return null;
    }
    
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();
    
    if (error || !profile) {
      console.error('[ClientAuth] Error fetching profile:', error);
      // Default to dashboard if profile not found
      window.location.href = './dashboard.html';
      return null;
    }
    
    // Route based on role
    if (profile.role === 'client') {
      window.location.href = './client-portal.html';
    } else {
      window.location.href = './dashboard.html';
    }
    
    return { role: profile.role, profile };
  } catch (error) {
    console.error('[ClientAuth] Error in checkClientAuth:', error);
    // Default to dashboard on error
    window.location.href = './dashboard.html';
    return null;
  }
}
