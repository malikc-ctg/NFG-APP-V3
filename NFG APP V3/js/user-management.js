/**
 * User Management Module for NFG App
 * Handles user invitations, role management, and site assignments
 */

import { supabase } from './supabase.js'
import { NFGDropdown } from './custom-dropdown.js'

let currentUser = null;
let currentUserProfile = null;
let selectedUserId = null;

// Get current user and profile
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  currentUser = user;
  
  // Get user profile
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user profile:', error);
      // Create default profile if doesn't exist
      currentUserProfile = { 
        id: user.id, 
        email: user.email, 
        full_name: user.user_metadata?.full_name || null,
        role: 'staff', 
        status: 'active' 
      };
    } else {
      currentUserProfile = profile;
    }
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
            currentUserProfile = { 
              id: user.id, 
              email: user.email, 
              role: 'staff', 
              status: 'active' 
            };
  }
  
  return { user, profile: currentUserProfile };
}

// Check if current user is admin or client
export function canManageUsers() {
  return currentUserProfile && ['admin', 'client'].includes(currentUserProfile.role);
}

// Fetch all users
export async function fetchUsers() {
  try {
    console.log('fetchUsers: Starting query...');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('fetchUsers: Error from Supabase:', error);
      return [];
    }
    console.log('fetchUsers: Successfully fetched data:', data);
    return data || [];
  } catch (error) {
    console.error('fetchUsers: Exception caught:', error);
    return [];
  }
}

// Fetch pending invitations
export async function fetchPendingInvitations() {
  try {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error in fetchPendingInvitations:', error);
    return [];
  }
}

// Send invitation with automatic email
export async function sendInvitation(email, role) {
  try {
    // Check if user already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existingProfile) {
      throw new Error('A user with this email already exists');
    }
    
    // Check if there's already a pending invitation
    const { data: existingInvitation } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();
    
    if (existingInvitation) {
      throw new Error('This email already has a pending invitation');
    }
    
    // Generate invitation token
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    
    // Create invitation in database
    const { data, error } = await supabase
      .from('user_invitations')
      .insert({
        email,
        role,
        invited_by: currentUser.id,
        invitation_token: token,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Generate invitation link
    const invitationLink = `${window.location.origin}/accept-invitation.html?token=${token}`;
    
    console.log('Invitation created:', data);
    console.log('Invitation link:', invitationLink);
    
    // Open email client with pre-filled invitation (manual mode)
    const subject = encodeURIComponent('Invitation to join NFG Facilities Management');
    const body = encodeURIComponent(
      `Hello,\n\n` +
      `You've been invited to join the NFG Facilities Management system as a ${role}.\n\n` +
      `Click the link below to accept the invitation and set up your account:\n\n` +
      `${invitationLink}\n\n` +
      `This invitation expires in 7 days.\n\n` +
      `If you have any questions, please contact your administrator.\n\n` +
      `Best regards,\n` +
      `Northern Facilities Group`
    );
    
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
    
    // Show success and offer to open email client
    const openEmail = confirm(
      `✅ Invitation created successfully!\n\n` +
      `📧 Ready to send to: ${email}\n\n` +
      `Click OK to open your email client with a pre-filled message,\n` +
      `or Cancel to copy the invitation link instead.`
    );
    
    if (openEmail) {
      // Open default email client
      window.open(mailtoLink, '_blank');
      
      // Also copy link as backup
      await navigator.clipboard.writeText(invitationLink);
      alert('✓ Email client opened!\n\nPlease review and send the invitation.\n\n(Link also copied to clipboard as backup)');
    } else {
      // Just copy link to clipboard
      await navigator.clipboard.writeText(invitationLink);
      alert(`✓ Link copied to clipboard!\n\nPlease email this link to ${email}:\n\n${invitationLink}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
}

// Cancel invitation
export async function cancelInvitation(invitationId) {
  const { error } = await supabase
    .from('user_invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId);
  
  if (error) {
    console.error('Error cancelling invitation:', error);
    throw error;
  }
}

// Update user role and status
export async function updateUserRole(userId, role, status) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      role, 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Get user's site assignments
export async function getUserSiteAssignments(userId) {
  const { data, error } = await supabase
    .from('worker_site_assignments')
    .select('*')
    .eq('worker_id', userId);
  
  if (error) {
    console.error('Error fetching site assignments:', error);
    return [];
  }
  return data || [];
}

// Assign user to site
export async function assignUserToSite(userId, siteId, canManage = false) {
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('worker_site_assignments')
    .select('*')
    .eq('worker_id', userId)
    .eq('site_id', siteId)
    .single();
  
  if (existing) {
    throw new Error('Worker is already assigned to this site');
  }
  
  const { error } = await supabase
    .from('worker_site_assignments')
    .insert({
      worker_id: userId,
      site_id: siteId,
      can_manage: canManage,
      assigned_by: currentUser.id
    });
  
  if (error) {
    console.error('Error assigning user to site:', error);
    throw error;
  }
}

// Remove user from site
export async function removeUserFromSite(assignmentId) {
  const { error } = await supabase
    .from('worker_site_assignments')
    .delete()
    .eq('id', assignmentId);
  
  if (error) {
    console.error('Error removing site assignment:', error);
    throw error;
  }
}

// Get user job stats
export async function getUserJobStats(userId) {
  try {
    const { data: allJobs } = await supabase
      .from('jobs')
      .select('status')
      .eq('assigned_worker_id', userId);
    
    const total = allJobs?.length || 0;
    const completed = allJobs?.filter(j => j.status === 'completed').length || 0;
    
    const { data: assignments } = await supabase
      .from('worker_site_assignments')
      .select('site_id')
      .eq('worker_id', userId);
    
    const sites = new Set(assignments?.map(a => a.site_id)).size || 0;
    
    return { total, completed, sites };
  } catch (error) {
    console.error('Error fetching job stats:', error);
    return { total: 0, completed: 0, sites: 0 };
  }
}

// Remove user (set to inactive)
export async function removeUser(userId) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ 
      status: 'inactive', 
      updated_at: new Date().toISOString() 
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error removing user:', error);
    throw error;
  }
}

// Render users list
export async function renderUsersList() {
  console.log('renderUsersList called');
  const list = document.getElementById('users-list');
  
  if (!list) {
    console.error('users-list element not found!');
    return;
  }
  
  console.log('Fetching users...');
  const users = await fetchUsers();
  console.log('Users fetched:', users);
  
  if (!users || users.length === 0) {
    console.warn('No users found, showing setup message');
    list.innerHTML = `
      <div class="text-center py-12 text-gray-500">
        <i data-lucide="alert-circle" class="w-16 h-16 mx-auto mb-4 opacity-30"></i>
        <h3 class="text-xl font-semibold text-nfgblue mb-2">User Management Not Set Up</h3>
        <p class="text-sm mb-4">To enable user management, you need to:</p>
        <ol class="text-left max-w-md mx-auto space-y-2 text-sm bg-nfglight/50 border border-nfgblue/20 rounded-xl p-4">
          <li>✅ 1. Run the SQL schema in Supabase</li>
          <li>✅ 2. Set your account to admin role</li>
          <li>✅ 3. Refresh this page</li>
        </ol>
        <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl max-w-md mx-auto text-sm text-left">
          <p class="font-semibold text-blue-900 mb-2">📝 Quick Setup:</p>
          <p class="text-blue-800">Open <code class="bg-white px-2 py-0.5 rounded">supabase_user_management_schema.sql</code></p>
          <p class="text-blue-800 mt-1">Copy the SQL and run in Supabase SQL Editor</p>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  console.log(`Rendering ${users.length} users`);
  
  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    client: 'bg-blue-100 text-blue-700',
    staff: 'bg-gray-100 text-gray-700'
  };
  
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700'
  };
  
  list.innerHTML = users.map(user => {
    const displayName = user.full_name || user.email.split('@')[0];
    const initials = displayName.charAt(0).toUpperCase();
    
    // Only show View button for admin/client users
    const viewButton = canManageUsers() ? `
      <button onclick="openUserDetails('${user.id}')" class="px-4 py-2 rounded-xl border border-nfgblue text-nfgblue hover:bg-nfglight transition flex items-center gap-2">
        <i data-lucide="eye" class="w-4 h-4"></i>
        View
      </button>
    ` : '';
    
    return `
      <div class="flex items-center justify-between p-4 bg-white border border-nfgray rounded-xl hover:shadow-md transition-shadow">
        <div class="flex items-center gap-3 flex-1">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-nfgblue to-nfgdark text-white flex items-center justify-center font-semibold text-lg">
            ${initials}
          </div>
          <div class="flex-1">
            <h5 class="font-semibold text-nfgblue">${displayName}</h5>
            <p class="text-sm text-gray-500">${user.email}</p>
            <div class="flex items-center gap-2 mt-1">
              <span class="px-2 py-0.5 rounded-lg text-xs font-medium ${roleColors[user.role]}">${user.role.toUpperCase()}</span>
              <span class="px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[user.status]}">${user.status}</span>
            </div>
          </div>
        </div>
        ${viewButton}
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Render pending invitations
export async function renderPendingInvitations() {
  const invitations = await fetchPendingInvitations();
  const container = document.getElementById('pending-invitations-container');
  const list = document.getElementById('pending-invitations-list');
  
  if (!container || !list) return;
  
  if (invitations.length === 0) {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  
  list.innerHTML = invitations.map(inv => {
    const expiresAt = new Date(inv.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
    const expired = daysLeft < 0;
    
    return `
      <div class="flex items-center justify-between p-3 ${expired ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'} border rounded-xl">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <i data-lucide="mail" class="w-4 h-4 text-nfgblue"></i>
            <p class="font-medium text-nfgblue">${inv.email}</p>
          </div>
          <p class="text-xs text-gray-600 mt-1">
            Role: <span class="font-medium">${inv.role}</span> • 
            ${expired ? '<span class="text-red-600 font-semibold">EXPIRED</span>' : `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button 
            onclick="copyInvitationLink('${inv.invitation_token}')" 
            class="p-2 rounded-lg hover:bg-yellow-100 text-nfgblue"
            title="Copy invitation link">
            <i data-lucide="copy" class="w-4 h-4"></i>
          </button>
          <button 
            onclick="cancelInvite('${inv.id}')" 
            class="p-2 rounded-lg hover:bg-red-100 text-red-600"
            title="Cancel invitation">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Open user details modal
window.openUserDetails = async function(userId) {
  selectedUserId = userId;
  
  const users = await fetchUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  const displayName = user.full_name || user.email.split('@')[0];
  const initials = displayName.charAt(0).toUpperCase();
  
  // Populate user info
  document.getElementById('user-detail-avatar').textContent = initials;
  document.getElementById('user-detail-name').textContent = displayName;
  document.getElementById('user-detail-email').textContent = user.email;
  
  // Update badges
  const roleBadge = document.getElementById('user-detail-role-badge');
  const roleColors = {
    admin: 'bg-purple-100 text-purple-700',
    client: 'bg-blue-100 text-blue-700',
    staff: 'bg-gray-100 text-gray-700'
  };
  roleBadge.className = `px-2 py-0.5 rounded-lg text-xs font-medium ${roleColors[user.role]}`;
  roleBadge.textContent = user.role.toUpperCase();
  
  const statusBadge = document.getElementById('user-detail-status-badge');
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    inactive: 'bg-gray-100 text-gray-700',
    suspended: 'bg-red-100 text-red-700'
  };
  statusBadge.className = `px-2 py-0.5 rounded-lg text-xs font-medium ${statusColors[user.status]}`;
  statusBadge.textContent = user.status;
  
  // Set role and status selects
  const roleSelect = document.querySelector('#user-detail-role-select');
  const statusSelect = document.querySelector('#user-detail-status-select');
  if (roleSelect) roleSelect.value = user.role;
  if (statusSelect) statusSelect.value = user.status;
  
  // Reinitialize dropdowns
  initializeUserDetailsDropdowns(user.role, user.status);
  
  // Load site assignments
  await loadUserSiteAssignments(userId);
  
  // Load job stats
  const stats = await getUserJobStats(userId);
  document.getElementById('user-jobs-count').textContent = stats.total;
  document.getElementById('user-jobs-completed').textContent = stats.completed;
  document.getElementById('user-sites-count').textContent = stats.sites;
  
  // Show modal
  const modal = document.getElementById('userDetailsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  
  if (window.lucide) lucide.createIcons();
};

// Load user site assignments
async function loadUserSiteAssignments(userId) {
  const assignments = await getUserSiteAssignments(userId);
  const list = document.getElementById('user-site-assignments-list');
  
  if (!list) return;
  
  if (assignments.length === 0) {
    list.innerHTML = '<p class="text-gray-500 text-sm">No sites assigned</p>';
    return;
  }
  
  // Get site details
  const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]');
  
  list.innerHTML = assignments.map(assignment => {
    const site = sites.find(s => s.id == assignment.site_id);
    const siteName = site ? site.name : `Site #${assignment.site_id}`;
    
    return `
      <div class="flex items-center justify-between p-3 bg-nfglight/30 border border-nfgblue/20 rounded-xl">
        <div class="flex items-center gap-2">
          <i data-lucide="map-pin" class="w-4 h-4 text-nfgblue"></i>
          <div>
            <p class="font-medium text-nfgblue">${siteName}</p>
            <p class="text-xs text-gray-500">${assignment.can_manage ? '🔧 Can manage' : '👁️ View only'}</p>
          </div>
        </div>
        <button 
          onclick="removeSiteAssignment('${assignment.id}')"
          class="p-1.5 rounded-lg hover:bg-red-100 text-red-600"
          title="Remove assignment">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Make loadUserSiteAssignments available globally
window.loadUserSiteAssignments = loadUserSiteAssignments;

// Generate random token
function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Copy invitation link
window.copyInvitationLink = function(token) {
  const link = `${window.location.origin}/accept-invitation.html?token=${token}`;
  navigator.clipboard.writeText(link).then(() => {
    alert('✓ Invitation link copied to clipboard!');
  }).catch(() => {
    prompt('Copy this invitation link:', link);
  });
};

// Cancel invitation
window.cancelInvite = async function(invitationId) {
  if (!confirm('Cancel this invitation?')) return;
  
  try {
    await cancelInvitation(invitationId);
    await renderPendingInvitations();
    alert('✓ Invitation cancelled');
  } catch (error) {
    alert('Failed to cancel invitation. Please try again.');
  }
};

// Remove site assignment
window.removeSiteAssignment = async function(assignmentId) {
  if (!confirm('Remove this site assignment?')) return;
  
  try {
    await removeUserFromSite(assignmentId);
    await loadUserSiteAssignments(selectedUserId);
    alert('✓ Site assignment removed');
  } catch (error) {
    alert('Failed to remove assignment: ' + error.message);
  }
};

// Initialize user details dropdowns
function initializeUserDetailsDropdowns(currentRole, currentStatus) {
  // Role dropdown
  const roleSelect = document.getElementById('user-detail-role-select');
  if (roleSelect) {
    const roleWrapper = roleSelect.previousElementSibling;
    if (roleWrapper && roleWrapper.classList.contains('nfg-select-wrapper')) {
      roleWrapper.remove();
    }
    roleSelect.style.display = '';
    roleSelect.value = currentRole;
    new NFGDropdown(roleSelect);
  }
  
  // Status dropdown
  const statusSelect = document.getElementById('user-detail-status-select');
  if (statusSelect) {
    const statusWrapper = statusSelect.previousElementSibling;
    if (statusWrapper && statusWrapper.classList.contains('nfg-select-wrapper')) {
      statusWrapper.remove();
    }
    statusSelect.style.display = '';
    statusSelect.value = currentStatus;
    new NFGDropdown(statusSelect);
  }
}

export { selectedUserId };
