/**
 * Client Portal - Service Requests Logic
 */

import { supabase } from './supabase.js';
import { requireClient, getClientSites } from './client-auth.js';
import { toast } from './notifications.js';

let currentClient = null;
let clientSites = [];
let allRequests = [];
let currentStatusFilter = 'all';

// Initialize
async function init() {
  console.log('[ClientRequests] Initializing requests page...');
  
  // Check authentication
  const authResult = await requireClient();
  if (!authResult) return;
  
  currentClient = authResult.profile;
  
  // Load data
  await loadClientSites();
  await loadRequests();
  
  // Attach event listeners
  attachEventListeners();
  
  console.log('[ClientRequests] Initialization complete');
}

// Load client sites for filter
async function loadClientSites() {
  try {
    clientSites = await getClientSites();
    
    const siteSelect = document.getElementById('request-site');
    if (siteSelect) {
      siteSelect.innerHTML = '<option value="">Select a site</option>' +
        clientSites.map(site => 
          `<option value="${site.id}">${escapeHtml(site.name || 'Unnamed Site')}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('[ClientRequests] Error loading sites:', error);
  }
}

// Load requests
async function loadRequests() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    let query = supabase
      .from('service_requests')
      .select(`
        *,
        sites:site_id(id, name),
        jobs:linked_job_id(id, title, status)
      `)
      .eq('client_id', user.id);
    
    // Apply status filter
    if (currentStatusFilter !== 'all') {
      query = query.eq('status', currentStatusFilter);
    }
    
    const { data: requests, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allRequests = requests || [];
    renderRequests();
    
  } catch (error) {
    console.error('[ClientRequests] Error loading requests:', error);
    toast.error('Failed to load requests', 'Error');
    document.getElementById('requests-list').innerHTML = `
      <div class="text-center py-12 text-red-500">Error loading requests. Please try again.</div>
    `;
  }
}

// Render requests
function renderRequests() {
  const requestsList = document.getElementById('requests-list');
  if (!requestsList) return;
  
  if (allRequests.length === 0) {
    requestsList.innerHTML = `
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <i data-lucide="wrench" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
        <p>No service requests found</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  requestsList.innerHTML = allRequests.map(request => {
    const statusBadge = getRequestStatusBadge(request.status);
    const priorityBadge = getPriorityBadge(request.priority);
    const siteName = request.sites?.name || 'Unknown Site';
    const createdDate = request.created_at ? new Date(request.created_at).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) : '—';
    
    return `
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg p-4 hover:shadow-md transition cursor-pointer" onclick="viewRequest('${request.id}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h3 class="font-semibold text-nfgblue dark:text-blue-400 text-lg mb-1">${escapeHtml(request.title || 'Untitled Request')}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${escapeHtml(siteName)}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              <i data-lucide="calendar" class="w-3 h-3 inline"></i> ${createdDate}
            </p>
          </div>
          <div class="text-right flex flex-col gap-2">
            ${priorityBadge}
            ${statusBadge}
          </div>
        </div>
        ${request.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${escapeHtml(request.description)}</p>` : ''}
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-nfgray">
          ${request.linked_job_id ? `
            <div class="text-sm text-gray-500 dark:text-gray-400">
              <i data-lucide="clipboard-check" class="w-3 h-3 inline"></i> Converted to Job
            </div>
          ` : ''}
          <button onclick="event.stopPropagation(); viewRequest('${request.id}')" class="text-sm text-nfgblue dark:text-blue-400 hover:underline ml-auto">
            View Details →
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// View request details
window.viewRequest = async function(requestId) {
  try {
    const { data: request, error } = await supabase
      .from('service_requests')
      .select(`
        *,
        sites:site_id(id, name, address),
        jobs:linked_job_id(id, title, status),
        acknowledged_by_profile:acknowledged_by(id, full_name, email)
      `)
      .eq('id', requestId)
      .single();
    
    if (error) throw error;
    
    // Verify client owns this request
    const { data: { user } } = await supabase.auth.getUser();
    if (request.client_id !== user.id) {
      toast.error('You do not have access to this request', 'Access Denied');
      return;
    }
    
    // Populate modal
    populateRequestDetailModal(request);
    
    // Open modal
    document.getElementById('requestDetailModal').classList.remove('hidden');
    document.getElementById('requestDetailModal').classList.add('flex');
    
  } catch (error) {
    console.error('[ClientRequests] Error loading request details:', error);
    toast.error('Failed to load request details', 'Error');
  }
};

// Populate request detail modal
function populateRequestDetailModal(request) {
  document.getElementById('request-detail-title').textContent = request.title || 'Service Request';
  
  const contentDiv = document.getElementById('request-detail-content');
  contentDiv.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <div class="bg-nfglight/30 border border-nfgblue/20 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="tag" class="w-4 h-4 text-nfgblue dark:text-blue-400"></i>
          <span class="text-sm font-medium">Status</span>
        </div>
        <p class="text-xl font-semibold text-nfgblue dark:text-blue-400 capitalize">${escapeHtml(request.status || 'pending')}</p>
      </div>
      <div class="bg-nfglight/30 border border-nfgblue/20 rounded-xl p-4">
        <div class="flex items-center gap-2 mb-2">
          <i data-lucide="alert-circle" class="w-4 h-4 text-nfgblue dark:text-blue-400"></i>
          <span class="text-sm font-medium">Priority</span>
        </div>
        <p class="text-xl font-semibold text-nfgblue dark:text-blue-400 capitalize">${escapeHtml(request.priority || 'normal')}</p>
      </div>
    </div>
    
    <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 mb-6">
      <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-3">Request Details</h5>
      <div class="space-y-2">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Site:</span>
          <span>${escapeHtml(request.sites?.name || 'Unknown Site')}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">Created:</span>
          <span>${request.created_at ? new Date(request.created_at).toLocaleString() : '—'}</span>
        </div>
        ${request.requested_date ? `
          <div class="flex justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Requested Date:</span>
            <span>${new Date(request.requested_date).toLocaleDateString()}</span>
          </div>
        ` : ''}
      </div>
      ${request.description ? `
        <div class="mt-4 pt-4 border-t border-nfgray">
          <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Description:</p>
          <p class="text-nftext">${escapeHtml(request.description)}</p>
        </div>
      ` : ''}
    </div>
    
    ${request.response_notes ? `
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
        <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-2">Response</h5>
        <p class="text-sm">${escapeHtml(request.response_notes)}</p>
        ${request.acknowledged_by_profile ? `
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
            — ${escapeHtml(request.acknowledged_by_profile.full_name || 'Staff')}
            ${request.acknowledged_at ? ` on ${new Date(request.acknowledged_at).toLocaleDateString()}` : ''}
          </p>
        ` : ''}
      </div>
    ` : ''}
    
    ${request.linked_job_id ? `
      <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
        <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-2">Linked Job</h5>
        <p class="text-sm">This request has been converted to a job.</p>
        <a href="client-jobs.html?id=${request.linked_job_id}" class="text-sm text-nfgblue dark:text-blue-400 hover:underline mt-2 inline-block">
          View Job →
        </a>
      </div>
    ` : ''}
  `;
  
  if (window.lucide) lucide.createIcons();
}

// Submit new request
document.getElementById('new-request-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in', 'Authentication Error');
      return;
    }
    
    const siteId = document.getElementById('request-site').value;
    const type = document.getElementById('request-type').value;
    const priority = document.getElementById('request-priority').value;
    const description = document.getElementById('request-description').value;
    const photoFiles = document.getElementById('request-photos').files;
    
    if (!siteId || !type || !description) {
      toast.error('Please fill in all required fields', 'Validation Error');
      return;
    }
    
    // Upload photos if any
    let attachmentUrls = [];
    if (photoFiles && photoFiles.length > 0) {
      toast.info('Uploading photos...', 'Processing');
      
      for (let file of Array.from(photoFiles).slice(0, 5)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('service-requests')
          .upload(fileName, file);
        
        if (!error) {
          const { data: { publicUrl } } = supabase.storage
            .from('service-requests')
            .getPublicUrl(fileName);
          
          attachmentUrls.push(publicUrl);
        }
      }
    }
    
    // Create request
    const { data: request, error } = await supabase
      .from('service_requests')
      .insert({
        client_id: user.id,
        site_id: parseInt(siteId),
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Request - ${document.getElementById('request-site').selectedOptions[0].text}`,
        description: description,
        priority: priority,
        status: 'pending',
        attachments: attachmentUrls.length > 0 ? attachmentUrls : null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success('Service request submitted successfully!', 'Success');
    
    // Close modal and reset form
    document.getElementById('newRequestModal').classList.add('hidden');
    document.getElementById('new-request-form').reset();
    
    // Reload requests
    await loadRequests();
    
  } catch (error) {
    console.error('[ClientRequests] Error submitting request:', error);
    toast.error('Failed to submit request', 'Error');
  }
});

// Get request status badge
function getRequestStatusBadge(status) {
  const badges = {
    'pending': '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>',
    'acknowledged': '<span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Acknowledged</span>',
    'scheduled': '<span class="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Scheduled</span>',
    'in-progress': '<span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">In Progress</span>',
    'completed': '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</span>',
    'cancelled': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Cancelled</span>'
  };
  return badges[status] || badges['pending'];
}

// Get priority badge
function getPriorityBadge(priority) {
  const badges = {
    'normal': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Normal</span>',
    'urgent': '<span class="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Urgent</span>',
    'emergency': '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Emergency</span>'
  };
  return badges[priority] || badges['normal'];
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Attach event listeners
function attachEventListeners() {
  // New request button
  document.getElementById('new-request-btn')?.addEventListener('click', () => {
    document.getElementById('newRequestModal').classList.remove('hidden');
    document.getElementById('newRequestModal').classList.add('flex');
  });
  
  // Status tabs
  document.querySelectorAll('.request-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.request-status-tab').forEach(t => {
        t.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
        t.classList.add('text-gray-500', 'border-transparent');
      });
      tab.classList.remove('text-gray-500', 'border-transparent');
      tab.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
      
      currentStatusFilter = tab.dataset.status;
      loadRequests();
    });
  });
  
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = './index.html';
  };
  
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

