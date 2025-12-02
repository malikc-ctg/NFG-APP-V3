/**
 * Client Portal - Invoices Viewing Logic
 */

import { supabase } from './supabase.js';
import { requireClient, getClientSites } from './client-auth.js';
import { toast } from './notifications.js';

let currentClient = null;
let clientSites = [];
let allInvoices = [];
let currentStatusFilter = 'all';

// Initialize
async function init() {
  console.log('[ClientInvoices] Initializing invoices page...');
  
  // Check authentication
  const authResult = await requireClient();
  if (!authResult) return;
  
  currentClient = authResult.profile;
  
  // Load data
  await loadClientSites();
  await loadInvoices();
  
  // Attach event listeners
  attachEventListeners();
  
  console.log('[ClientInvoices] Initialization complete');
}

// Load client sites for filter
async function loadClientSites() {
  try {
    clientSites = await getClientSites();
  } catch (error) {
    console.error('[ClientInvoices] Error loading sites:', error);
  }
}

// Load invoices
async function loadInvoices() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    if (clientSites.length === 0) {
      document.getElementById('invoices-list').innerHTML = `
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
          <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
          <p>No invoices found. Contact your facility manager.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    let query = supabase
      .from('invoices')
      .select(`
        *,
        sites:site_id(id, name),
        jobs:job_id(id, title),
        payments(id, amount, payment_date, payment_method)
      `)
      .eq('client_id', user.id);
    
    // Apply status filter
    if (currentStatusFilter !== 'all') {
      query = query.eq('status', currentStatusFilter);
    }
    
    const { data: invoices, error } = await query
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Update overdue status
    const today = new Date();
    allInvoices = (invoices || []).map(inv => {
      if (inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < today && inv.balance_due > 0) {
        inv.status = 'overdue';
      }
      return inv;
    });
    
    renderInvoices();
    updateSummaryCards();
    
  } catch (error) {
    console.error('[ClientInvoices] Error loading invoices:', error);
    toast.error('Failed to load invoices', 'Error');
    document.getElementById('invoices-list').innerHTML = `
      <div class="text-center py-12 text-red-500">Error loading invoices. Please try again.</div>
    `;
  }
}

// Render invoices
function renderInvoices() {
  const invoicesList = document.getElementById('invoices-list');
  if (!invoicesList) return;
  
  if (allInvoices.length === 0) {
    invoicesList.innerHTML = `
      <div class="text-center py-12 text-gray-500 dark:text-gray-400">
        <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
        <p>No invoices found</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  invoicesList.innerHTML = allInvoices.map(invoice => {
    const statusBadge = getInvoiceStatusBadge(invoice.status);
    const siteName = invoice.sites?.name || 'Unknown Site';
    const issueDate = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) : '—';
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    }) : '—';
    
    return `
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl shadow-nfg p-4 hover:shadow-md transition cursor-pointer" onclick="viewInvoice('${invoice.id}')">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            <h3 class="font-semibold text-nfgblue dark:text-blue-400 text-lg mb-1">${escapeHtml(invoice.invoice_number || 'INV-000')}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              <i data-lucide="map-pin" class="w-3 h-3 inline"></i> ${escapeHtml(siteName)}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              <i data-lucide="calendar" class="w-3 h-3 inline"></i> Due: ${dueDate}
            </p>
          </div>
          <div class="text-right">
            ${statusBadge}
            <p class="text-xl font-semibold text-nfgblue dark:text-blue-400 mt-2">$${formatCurrency(invoice.total_amount || 0)}</p>
          </div>
        </div>
        <div class="flex items-center justify-between mt-4 pt-4 border-t border-nfgray">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            <span>Issued: ${issueDate}</span>
          </div>
          <button onclick="event.stopPropagation(); viewInvoice('${invoice.id}')" class="text-sm text-nfgblue dark:text-blue-400 hover:underline">
            View Details →
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Update summary cards
function updateSummaryCards() {
  const total = allInvoices.length;
  const paid = allInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
  const pending = allInvoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
  const overdue = allInvoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
  
  document.getElementById('summary-total').textContent = total;
  document.getElementById('summary-paid').textContent = `$${formatCurrency(paid)}`;
  document.getElementById('summary-pending').textContent = `$${formatCurrency(pending)}`;
  document.getElementById('summary-overdue').textContent = `$${formatCurrency(overdue)}`;
}

// View invoice details
window.viewInvoice = async function(invoiceId) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        sites:site_id(id, name, address),
        jobs:job_id(id, title),
        invoice_line_items(id, description, quantity, unit_price, line_total),
        payments(id, amount, payment_date, payment_method, reference_number, notes)
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw error;
    
    // Verify client owns this invoice
    const { data: { user } } = await supabase.auth.getUser();
    if (invoice.client_id !== user.id) {
      toast.error('You do not have access to this invoice', 'Access Denied');
      return;
    }
    
    // Populate modal
    populateInvoiceDetailModal(invoice);
    
    // Open modal
    document.getElementById('invoiceDetailModal').classList.remove('hidden');
    document.getElementById('invoiceDetailModal').classList.add('flex');
    
  } catch (error) {
    console.error('[ClientInvoices] Error loading invoice details:', error);
    toast.error('Failed to load invoice details', 'Error');
  }
};

// Populate invoice detail modal
function populateInvoiceDetailModal(invoice) {
  document.getElementById('invoice-detail-number').textContent = invoice.invoice_number || 'INV-000';
  document.getElementById('invoice-detail-site').textContent = invoice.sites?.name || 'Unknown Site';
  document.getElementById('invoice-detail-issue-date').textContent = invoice.issue_date 
    ? new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  document.getElementById('invoice-detail-due-date').textContent = invoice.due_date 
    ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';
  document.getElementById('invoice-detail-status-badge').innerHTML = getInvoiceStatusBadge(invoice.status);
  document.getElementById('invoice-detail-total').textContent = `$${formatCurrency(invoice.total_amount || 0)}`;
  
  // Line items
  const lineItemsDiv = document.getElementById('invoice-line-items');
  if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
    lineItemsDiv.innerHTML = invoice.invoice_line_items.map(item => `
      <div class="flex items-center justify-between p-3 border border-nfgray rounded-lg">
        <div class="flex-1">
          <p class="font-medium">${escapeHtml(item.description || 'Line Item')}</p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Qty: ${item.quantity} × $${formatCurrency(item.unit_price || 0)}</p>
        </div>
        <p class="font-semibold text-nfgblue dark:text-blue-400">$${formatCurrency(item.line_total || 0)}</p>
      </div>
    `).join('');
  } else {
    lineItemsDiv.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No line items</p>';
  }
  
  // Totals
  document.getElementById('invoice-detail-subtotal').textContent = `$${formatCurrency(invoice.subtotal || 0)}`;
  document.getElementById('invoice-detail-tax').textContent = `$${formatCurrency(invoice.tax_amount || 0)}`;
  document.getElementById('invoice-detail-discount').textContent = `$${formatCurrency(invoice.discount_amount || 0)}`;
  document.getElementById('invoice-detail-grand-total').textContent = `$${formatCurrency(invoice.total_amount || 0)}`;
  document.getElementById('invoice-detail-paid').textContent = `$${formatCurrency(invoice.paid_amount || 0)}`;
  document.getElementById('invoice-detail-balance').textContent = `$${formatCurrency(invoice.balance_due || 0)}`;
  
  if (window.lucide) lucide.createIcons();
}

// Download invoice PDF
document.getElementById('download-invoice-pdf')?.addEventListener('click', async () => {
  toast.info('Generating PDF...', 'Processing');
  // TODO: Implement PDF generation
  toast.warning('PDF generation coming soon', 'Feature');
});

// Get invoice status badge
function getInvoiceStatusBadge(status) {
  const badges = {
    'draft': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Draft</span>',
    'sent': '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>',
    'paid': '<span class="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Paid</span>',
    'overdue': '<span class="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>',
    'cancelled': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Cancelled</span>'
  };
  return badges[status] || badges['draft'];
}

// Format currency
function formatCurrency(amount) {
  return parseFloat(amount || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
  document.querySelectorAll('.invoice-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.invoice-status-tab').forEach(t => {
        t.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
        t.classList.add('text-gray-500', 'border-transparent');
      });
      tab.classList.remove('text-gray-500', 'border-transparent');
      tab.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
      
      currentStatusFilter = tab.dataset.status;
      loadInvoices();
    });
  });
  
  // Clear filters
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    currentStatusFilter = 'all';
    document.querySelectorAll('.invoice-status-tab').forEach(t => {
      if (t.dataset.status === 'all') {
        t.classList.remove('text-gray-500', 'border-transparent');
        t.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
      } else {
        t.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
        t.classList.add('text-gray-500', 'border-transparent');
      }
    });
    loadInvoices();
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

