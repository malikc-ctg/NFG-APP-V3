/**
 * Client Portal - Jobs Viewing Logic
 */

import { supabase } from './supabase.js';
import { requireClient, getClientSites } from './client-auth.js';
import { toast } from './notifications.js';

let currentClient = null;
let clientSites = [];
let allJobs = [];
let currentStatusFilter = 'all';
let currentSiteFilter = 'all';
let currentJobPhotos = [];
let currentPhotoIndex = 0;

// Initialize
async function init() {
  console.log('[ClientJobs] Initializing jobs page...');
  
  // Check authentication
  const authResult = await requireClient();
  if (!authResult) return;
  
  currentClient = authResult.profile;
  
  // Load data
  await loadClientSites();
  await loadJobs();
  
  // Check for job ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  if (jobId) {
    await viewJob(jobId);
  }
  
  // Attach event listeners
  attachEventListeners();
  
  console.log('[ClientJobs] Initialization complete');
}

// Load client sites for filter
async function loadClientSites() {
  try {
    clientSites = await getClientSites();
    
    const siteSelect = document.getElementById('filter-site');
    if (siteSelect) {
      siteSelect.innerHTML = '<option value="all">All Sites</option>' +
        clientSites.map(site => 
          `<option value="${site.id}">${escapeHtml(site.name || 'Unnamed Site')}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('[ClientJobs] Error loading sites:', error);
  }
}

// Load jobs
async function loadJobs() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (clientSites.length === 0) {
      document.getElementById('jobs-list').innerHTML = `
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
          <i data-lucide="map-pin" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
          <p>No sites assigned. Contact your facility manager.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    let query = supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        job_type,
        scheduled_date,
        created_at,
        description,
        sites:site_id(id, name),
        assigned_worker:assigned_worker_id(id, full_name, email)
      `)
      .in('site_id', clientSites.map(s => s.id));
    
    // Apply status filter
    if (currentStatusFilter !== 'all') {
      query = query.eq('status', currentStatusFilter);
    }
    
    // Apply site filter
    if (currentSiteFilter !== 'all') {
      query = query.eq('site_id', parseInt(currentSiteFilter));
    }
    
    const { data: jobs, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    allJobs = jobs || [];
    renderJobs();
    
  } catch (error) {
    console.error('[ClientJobs] Error loading jobs:', error);
    toast.error('Failed to load jobs', 'Error');
    document.getElementById('jobs-list').innerHTML = `
      <div class="text-center py-12 text-red-500">Error loading jobs. Please try again.</div>
    `;
  }
}

// Render jobs
function renderJobs() {
  const jobsList = document.getElementById('jobs-list');
  if (!jobsList) return;
  
  if (allJobs.length === 0) {
    jobsList.innerHTML = `
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <i data-lucide="clipboard-check" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
        <p>No jobs found</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  jobsList.innerHTML = allJobs.map(job => {
    const statusBadge = getJobStatusBadge(job.status);
    const siteName = job.sites?.name || 'Unknown Site';
    const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) : 'Not scheduled';
    const workerName = job.assigned_worker?.full_name || 'Unassigned';
    
    return `
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg p-4 hover:shadow-md transition cursor-pointer" onclick="viewJob('${job.id}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h3 class="font-semibold text-nfgblue dark:text-blue-400 text-lg mb-1">${escapeHtml(job.title || 'Untitled Job')}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${escapeHtml(siteName)}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              <i data-lucide="user" class="w-3 h-3 inline"></i> ${escapeHtml(workerName)}
            </p>
          </div>
          ${statusBadge}
        </div>
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-nfgray">
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <i data-lucide="calendar" class="w-4 h-4"></i>
            <span>${scheduledDate}</span>
          </div>
          <button onclick="event.stopPropagation(); viewJob('${job.id}')" class="text-sm text-nfgblue dark:text-blue-400 hover:underline">
            View Details →
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// View job details
window.viewJob = async function(jobId) {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .select(`
        *,
        sites:site_id(id, name, address),
        assigned_worker:assigned_worker_id(id, full_name, email, phone),
        job_tasks(id, title, description, completed, completed_at, photo_url, photo_required)
      `)
      .eq('id', jobId)
      .single();
    
    if (error) throw error;
    
    // Verify client owns this job's site
    const siteOwned = clientSites.some(s => s.id === job.site_id);
    if (!siteOwned) {
      toast.error('You do not have access to this job', 'Access Denied');
      return;
    }
    
    // Populate modal
    populateJobDetailModal(job);
    
    // Open modal
    document.getElementById('jobDetailModal').classList.remove('hidden');
    document.getElementById('jobDetailModal').classList.add('flex');
    
    // Load materials if available
    await loadJobMaterials(jobId);
    
    // Load photos
    await loadJobPhotos(jobId);
    
  } catch (error) {
    console.error('[ClientJobs] Error loading job details:', error);
    toast.error('Failed to load job details', 'Error');
  }
};

// Populate job detail modal
function populateJobDetailModal(job) {
  document.getElementById('job-detail-title').textContent = job.title || 'Untitled Job';
  document.getElementById('job-detail-site').textContent = job.sites?.name || 'Unknown Site';
  document.getElementById('job-detail-status').textContent = job.status || 'Unknown';
  document.getElementById('job-detail-type').textContent = job.job_type || '—';
  document.getElementById('job-detail-date').textContent = job.scheduled_date 
    ? new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Not scheduled';
  document.getElementById('job-detail-description').textContent = job.description || 'No description provided';
  
  // Assigned worker
  const workerDiv = document.getElementById('job-assigned-worker');
  if (job.assigned_worker) {
    workerDiv.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-nfglight dark:bg-gray-700 flex items-center justify-center">
          <span class="text-nfgblue dark:text-blue-400 font-medium">${getInitials(job.assigned_worker.full_name || job.assigned_worker.email)}</span>
        </div>
        <div>
          <p class="font-medium">${escapeHtml(job.assigned_worker.full_name || 'Unknown')}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(job.assigned_worker.email || '')}</p>
        </div>
      </div>
    `;
  } else {
    workerDiv.innerHTML = '<p class="text-gray-500 text-sm">No worker assigned yet.</p>';
  }
  
  // Tasks
  const tasksDiv = document.getElementById('job-tasks-list');
  if (job.job_tasks && job.job_tasks.length > 0) {
    tasksDiv.innerHTML = job.job_tasks.map(task => `
      <div class="flex items-start gap-3 p-3 border border-nfgray rounded-lg ${task.completed ? 'bg-green-50 dark:bg-green-900/20' : ''}">
        <div class="mt-0.5">
          ${task.completed 
            ? '<i data-lucide="check-circle" class="w-5 h-5 text-green-600 dark:text-green-400"></i>' 
            : '<i data-lucide="circle" class="w-5 h-5 text-gray-400"></i>'
          }
        </div>
        <div class="flex-1">
          <p class="font-medium ${task.completed ? 'line-through text-gray-500' : ''}">${escapeHtml(task.title || 'Untitled Task')}</p>
          ${task.description ? `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${escapeHtml(task.description)}</p>` : ''}
          ${task.completed_at ? `<p class="text-xs text-gray-400 mt-1">Completed: ${new Date(task.completed_at).toLocaleString()}</p>` : ''}
          ${task.photo_url ? `
            <button onclick="viewPhoto('${task.photo_url}', 0)" class="mt-2 text-sm text-nfgblue dark:text-blue-400 hover:underline">
              View Photo
            </button>
          ` : ''}
        </div>
      </div>
    `).join('');
  } else {
    tasksDiv.innerHTML = '<p class="text-gray-500 text-sm">No tasks added yet.</p>';
  }
  
  if (window.lucide) lucide.createIcons();
}

// Load job materials
async function loadJobMaterials(jobId) {
  try {
    const { data: materials } = await supabase
      .from('inventory_transactions')
      .select(`
        quantity_change,
        notes,
        created_at,
        inventory_items:item_id(name, unit)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });
    
    const materialsSection = document.getElementById('job-materials-section');
    const materialsList = document.getElementById('job-materials-list');
    
    if (!materials || materials.length === 0) {
      if (materialsSection) materialsSection.classList.add('hidden');
      return;
    }
    
    if (materialsSection) materialsSection.classList.remove('hidden');
    
    if (materialsList) {
      materialsList.innerHTML = materials.map(material => {
        const itemName = material.inventory_items?.name || 'Unknown Item';
        const quantity = Math.abs(material.quantity_change || 0);
        const unit = material.inventory_items?.unit || '';
        const date = new Date(material.created_at).toLocaleDateString();
        
        return `
          <div class="flex items-center justify-between p-3 border border-nfgray rounded-lg">
            <div>
              <p class="font-medium">${escapeHtml(itemName)}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">${date}</p>
            </div>
            <p class="font-semibold text-nfgblue dark:text-blue-400">${quantity} ${unit}</p>
          </div>
        `;
      }).join('');
    }
  } catch (error) {
    console.warn('[ClientJobs] Error loading job materials:', error);
    document.getElementById('job-materials-section')?.classList.add('hidden');
  }
}

// Load job photos
async function loadJobPhotos(jobId) {
  try {
    // Get photos from tasks
    const { data: tasks } = await supabase
      .from('job_tasks')
      .select('photo_url')
      .eq('job_id', jobId)
      .not('photo_url', 'is', null);
    
    const photoUrls = tasks?.filter(t => t.photo_url).map(t => t.photo_url) || [];
    
    if (photoUrls.length === 0) {
      document.getElementById('job-photos-section')?.classList.add('hidden');
      return;
    }
    
    currentJobPhotos = photoUrls;
    currentPhotoIndex = 0;
    
    const photosSection = document.getElementById('job-photos-section');
    const photosGrid = document.getElementById('job-photos-grid');
    
    if (photosSection) photosSection.classList.remove('hidden');
    
    if (photosGrid) {
      photosGrid.innerHTML = photoUrls.map((url, index) => `
        <div class="aspect-square rounded-lg overflow-hidden border border-nfgray cursor-pointer hover:opacity-80 transition" onclick="viewPhoto('${url}', ${index})">
          <img src="${url}" alt="Job photo ${index + 1}" class="w-full h-full object-cover">
        </div>
      `).join('');
    }
  } catch (error) {
    console.warn('[ClientJobs] Error loading job photos:', error);
    document.getElementById('job-photos-section')?.classList.add('hidden');
  }
}

// View photo in modal
window.viewPhoto = function(photoUrl, index) {
  currentPhotoIndex = index;
  const modal = document.getElementById('photoViewModal');
  const img = document.getElementById('photo-view-image');
  
  if (img) img.src = photoUrl;
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  
  updatePhotoNavButtons();
};

// Update photo navigation buttons
function updatePhotoNavButtons() {
  const prevBtn = document.getElementById('photo-prev');
  const nextBtn = document.getElementById('photo-next');
  
  if (prevBtn) prevBtn.style.display = currentPhotoIndex > 0 ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = currentPhotoIndex < currentJobPhotos.length - 1 ? 'block' : 'none';
}

// Navigate photos
document.getElementById('photo-prev')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentPhotoIndex > 0) {
    currentPhotoIndex--;
    document.getElementById('photo-view-image').src = currentJobPhotos[currentPhotoIndex];
    updatePhotoNavButtons();
  }
});

document.getElementById('photo-next')?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (currentPhotoIndex < currentJobPhotos.length - 1) {
    currentPhotoIndex++;
    document.getElementById('photo-view-image').src = currentJobPhotos[currentPhotoIndex];
    updatePhotoNavButtons();
  }
});

// Download service report
document.getElementById('download-report-btn')?.addEventListener('click', async () => {
  toast.info('Generating service report...', 'Processing');
  // TODO: Implement PDF generation
  toast.warning('PDF generation coming soon', 'Feature');
});

// Get job status badge
function getJobStatusBadge(status) {
  const badges = {
    'pending': '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>',
    'in-progress': '<span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">In Progress</span>',
    'completed': '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</span>',
    'cancelled': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Cancelled</span>'
  };
  return badges[status] || badges['pending'];
}

// Get initials
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
  // Status tabs
  document.querySelectorAll('.job-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.job-status-tab').forEach(t => {
        t.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
        t.classList.add('text-gray-500', 'border-transparent');
      });
      tab.classList.remove('text-gray-500', 'border-transparent');
      tab.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
      
      currentStatusFilter = tab.dataset.status;
      loadJobs();
    });
  });
  
  // Site filter
  const siteFilter = document.getElementById('filter-site');
  if (siteFilter) {
    siteFilter.addEventListener('change', () => {
      currentSiteFilter = siteFilter.value;
      loadJobs();
    });
  }
  
  // Status filter
  const statusFilter = document.getElementById('filter-status');
  if (statusFilter) {
    statusFilter.addEventListener('change', () => {
      currentStatusFilter = statusFilter.value;
      loadJobs();
    });
  }
  
  // Clear filters
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    currentSiteFilter = 'all';
    currentStatusFilter = 'all';
    if (siteFilter) siteFilter.value = 'all';
    if (statusFilter) statusFilter.value = 'all';
    loadJobs();
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

