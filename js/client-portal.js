/**
 * Client Portal - Main Dashboard Logic
 */

import { supabase } from './supabase.js';
import { requireClient, getClientSites } from './client-auth.js';
import { toast } from './notifications.js';

let currentClient = null;
let clientSites = [];
let clientJobs = [];
let clientInvoices = [];

// Initialize
async function init() {
  console.log('[ClientPortal] Initializing client portal...');
  
  // Check authentication and role
  const authResult = await requireClient();
  if (!authResult) {
    return;
  }
  
  currentClient = authResult.profile;
  
  // Set welcome name
  const welcomeName = document.getElementById('welcome-name');
  const clientName = document.getElementById('client-name');
  const name = currentClient.full_name || currentClient.email || 'Client';
  
  if (welcomeName) welcomeName.textContent = name;
  if (clientName) clientName.textContent = name;
  
  // Load dashboard data
  await loadDashboardData();
  
  // Attach event listeners
  attachEventListeners();
  
  console.log('[ClientPortal] Initialization complete');
}

// Load all dashboard data
async function loadDashboardData() {
  try {
    await Promise.all([
      loadSummaryCards(),
      loadSites(),
      loadRecentJobs(),
      loadUpcomingWork(),
      loadPendingInvoices()
    ]);
  } catch (error) {
    console.error('[ClientPortal] Error loading dashboard data:', error);
    toast.error('Failed to load dashboard data', 'Error');
  }
}

// Load summary cards
async function loadSummaryCards() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Get client sites
    const sites = await getClientSites();
    const activeSites = sites.filter(s => s.status === 'Active' || !s.status).length;
    
    // Get pending jobs
    const { data: jobs } = await supabase
      .from('jobs')
      .select('id, status')
      .in('site_id', sites.map(s => s.id))
      .in('status', ['pending', 'in-progress']);
    
    const pendingJobs = jobs?.length || 0;
    
    // Get total invoices (if invoices table exists)
    let totalInvoices = 0;
    let pendingPayment = 0;
    
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, status, balance_due, total_amount')
        .eq('client_id', user.id);
      
      if (invoices) {
        totalInvoices = invoices.length;
        pendingPayment = invoices
          .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
          .reduce((sum, inv) => sum + parseFloat(inv.balance_due || inv.total_amount || 0), 0);
      }
    } catch (invoiceError) {
      console.warn('[ClientPortal] Invoices table may not exist yet:', invoiceError);
    }
    
    // Update summary cards
    const activeSitesEl = document.getElementById('summary-active-sites');
    const pendingJobsEl = document.getElementById('summary-pending-jobs');
    const totalInvoicesEl = document.getElementById('summary-total-invoices');
    const pendingPaymentEl = document.getElementById('summary-pending-payment');
    
    if (activeSitesEl) activeSitesEl.textContent = activeSites;
    if (pendingJobsEl) pendingJobsEl.textContent = pendingJobs;
    if (totalInvoicesEl) totalInvoicesEl.textContent = totalInvoices;
    if (pendingPaymentEl) pendingPaymentEl.textContent = `$${pendingPayment.toFixed(2)}`;
    
  } catch (error) {
    console.error('[ClientPortal] Error loading summary cards:', error);
  }
}

// Load sites
async function loadSites() {
  try {
    clientSites = await getClientSites();
    const sitesList = document.getElementById('sites-list');
    
    if (!sitesList) return;
    
    if (clientSites.length === 0) {
      sitesList.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
          <i data-lucide="map-pin" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
          <p>No sites assigned</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    sitesList.innerHTML = clientSites.slice(0, 6).map(site => `
      <div class="border border-nfgray rounded-xl p-4 hover:shadow-md transition">
        <div class="flex items-start justify-between mb-2">
          <h4 class="font-semibold text-nfgblue dark:text-blue-400">${escapeHtml(site.name || 'Unnamed Site')}</h4>
          <span class="text-xs px-2 py-1 rounded-full ${site.status === 'Active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'}">${site.status || 'Active'}</span>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${escapeHtml(site.address || 'No address')}</p>
        <a href="client-jobs.html?site=${site.id}" class="text-sm text-nfgblue dark:text-blue-400 hover:underline">View Jobs →</a>
      </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
    
  } catch (error) {
    console.error('[ClientPortal] Error loading sites:', error);
  }
}

// Load recent jobs
async function loadRecentJobs() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const sites = await getClientSites();
    if (sites.length === 0) {
      document.getElementById('recent-jobs-list').innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">No jobs found</div>
      `;
      return;
    }
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        status,
        scheduled_date,
        created_at,
        sites:site_id(name)
      `)
      .in('site_id', sites.map(s => s.id))
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    const jobsList = document.getElementById('recent-jobs-list');
    if (!jobsList) return;
    
    if (!jobs || jobs.length === 0) {
      jobsList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">No jobs found</div>
      `;
      return;
    }
    
    clientJobs = jobs || [];
    
    jobsList.innerHTML = jobs.map(job => {
      const statusBadge = getJobStatusBadge(job.status);
      const siteName = job.sites?.name || 'Unknown Site';
      const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'Not scheduled';
      
      return `
        <div class="border border-nfgray rounded-xl p-4 hover:shadow-md transition">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1">
              <h4 class="font-semibold text-nfgblue dark:text-blue-400">${escapeHtml(job.title || 'Untitled Job')}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(siteName)}</p>
            </div>
            ${statusBadge}
          </div>
          <div class="flex items-center justify-between mt-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${scheduledDate}</span>
            <button onclick="viewJob('${job.id}')" class="text-sm text-nfgblue dark:text-blue-400 hover:underline">View Details →</button>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('[ClientPortal] Error loading recent jobs:', error);
    document.getElementById('recent-jobs-list').innerHTML = `
      <div class="text-center py-8 text-red-500">Error loading jobs</div>
    `;
  }
}

// Load upcoming work
async function loadUpcomingWork() {
  try {
    const sites = await getClientSites();
    if (sites.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        scheduled_date,
        sites:site_id(name)
      `)
      .in('site_id', sites.map(s => s.id))
      .in('status', ['pending', 'in-progress'])
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(5);
    
    if (error) throw error;
    
    const upcomingList = document.getElementById('upcoming-work-list');
    if (!upcomingList) return;
    
    if (!jobs || jobs.length === 0) {
      upcomingList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">No upcoming work scheduled</div>
      `;
      return;
    }
    
    upcomingList.innerHTML = jobs.map(job => {
      const siteName = job.sites?.name || 'Unknown Site';
      const scheduledDate = job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not scheduled';
      
      return `
        <div class="border border-nfgray rounded-xl p-4 hover:shadow-md transition">
          <div class="flex items-center justify-between">
            <div>
              <h4 class="font-semibold text-nfgblue dark:text-blue-400">${escapeHtml(job.title || 'Untitled Job')}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(siteName)}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-nfgblue dark:text-blue-400">${scheduledDate}</p>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('[ClientPortal] Error loading upcoming work:', error);
  }
}

// Load pending invoices
async function loadPendingInvoices() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    let invoices = [];
    
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_number, total_amount, balance_due, due_date, status')
        .eq('client_id', user.id)
        .in('status', ['sent', 'overdue'])
        .order('due_date', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      invoices = data || [];
    } catch (invoiceError) {
      console.warn('[ClientPortal] Invoices table may not exist:', invoiceError);
    }
    
    const invoicesList = document.getElementById('pending-invoices-list');
    if (!invoicesList) return;
    
    if (invoices.length === 0) {
      invoicesList.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">No pending invoices</div>
      `;
      return;
    }
    
    clientInvoices = invoices;
    
    invoicesList.innerHTML = invoices.map(invoice => {
      const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'No due date';
      const amount = parseFloat(invoice.balance_due || invoice.total_amount || 0);
      const isOverdue = invoice.status === 'overdue';
      
      return `
        <div class="border ${isOverdue ? 'border-red-300 dark:border-red-700' : 'border-nfgray'} rounded-xl p-4 hover:shadow-md transition">
          <div class="flex items-start justify-between mb-2">
            <div>
              <h4 class="font-semibold text-nfgblue dark:text-blue-400">Invoice #${escapeHtml(invoice.invoice_number || invoice.id.slice(0, 8))}</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400">Due: ${dueDate}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-nfgblue dark:text-blue-400'}">$${amount.toFixed(2)}</p>
              ${isOverdue ? '<span class="text-xs text-red-600 dark:text-red-400">Overdue</span>' : ''}
            </div>
          </div>
          <div class="flex items-center justify-end mt-3">
            <a href="client-invoices.html?id=${invoice.id}" class="text-sm text-nfgblue dark:text-blue-400 hover:underline">View Invoice →</a>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('[ClientPortal] Error loading pending invoices:', error);
  }
}

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

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// View job details
window.viewJob = function(jobId) {
  window.location.href = `client-jobs.html?id=${jobId}`;
};

// Attach event listeners
function attachEventListeners() {
  // Logout
  const logoutBtn = document.getElementById('logout-btn');
  const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = './index.html';
  };
  
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
  
  // Request service button
  const requestBtn = document.getElementById('request-service-btn');
  if (requestBtn) {
    requestBtn.addEventListener('click', () => {
      window.location.href = './client-requests.html?new=true';
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

