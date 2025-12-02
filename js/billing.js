/**
 * Billing & Invoicing System
 * Phase 1: Core Invoice Management
 */

import { supabase } from './supabase.js';
import { toast } from './notifications.js';

// State
let allInvoices = [];
let allClients = [];
let allSites = [];
let allJobs = [];
let currentFilters = {
  status: 'all',
  client: 'all',
  dateFrom: null,
  dateTo: null
};
let currentInvoiceId = null;
let lineItemCounter = 0;

// Initialize
async function init() {
  console.log('[Billing] Initializing billing system...');
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = './index.html';
    return;
  }
  
  // Load data
  await loadClients();
  await loadSites();
  await loadJobs();
  await loadInvoices();
  
  // Attach event listeners
  attachEventListeners();
  
  // Check if we should auto-open invoice modal from job
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('create_from_job') === 'true') {
    const pendingJob = sessionStorage.getItem('pendingInvoiceJob');
    if (pendingJob) {
      try {
        const jobData = JSON.parse(pendingJob);
        await openInvoiceModalFromJob(jobData);
        sessionStorage.removeItem('pendingInvoiceJob');
        // Clean URL
        window.history.replaceState({}, '', 'billing.html');
      } catch (error) {
        console.error('[Billing] Error opening invoice from job:', error);
      }
    }
  }
  
  // Check if we should view a specific invoice
  const invoiceId = urlParams.get('invoice');
  if (invoiceId) {
    viewInvoice(invoiceId);
    // Clean URL
    window.history.replaceState({}, '', 'billing.html');
  }
  
  console.log('[Billing] Initialization complete');
}

// Load clients (users with 'client' role)
async function loadClients() {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('role', 'client')
      .eq('status', 'active')
      .order('full_name');
    
    if (error) throw error;
    
    allClients = data || [];
    
    // Populate client filter dropdown
    const clientFilter = document.getElementById('filter-client');
    if (clientFilter) {
      clientFilter.innerHTML = '<option value="all">All Clients</option>' +
        allClients.map(client => 
          `<option value="${client.id}">${escapeHtml(client.full_name || client.email)}</option>`
        ).join('');
    }
    
    // Populate invoice client dropdown
    const invoiceClient = document.getElementById('invoice-client');
    if (invoiceClient) {
      invoiceClient.innerHTML = '<option value="">Select a client</option>' +
        allClients.map(client => 
          `<option value="${client.id}">${escapeHtml(client.full_name || client.email)}</option>`
        ).join('');
    }
  } catch (error) {
    console.error('[Billing] Error loading clients:', error);
    toast.error('Failed to load clients', 'Error');
  }
}

// Load sites
async function loadSites() {
  try {
    const { data, error } = await supabase
      .from('sites')
      .select('id, name, client_id')
      .order('name');
    
    if (error) throw error;
    
    allSites = data || [];
  } catch (error) {
    console.error('[Billing] Error loading sites:', error);
  }
}

// Load jobs
async function loadJobs() {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, site_id, status')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(100);
    
    if (error) throw error;
    
    allJobs = data || [];
  } catch (error) {
    console.error('[Billing] Error loading jobs:', error);
  }
}

// Load invoices
async function loadInvoices() {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:client_id(id, full_name, email),
        site:site_id(id, name),
        job:job_id(id, title)
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (currentFilters.status !== 'all') {
      query = query.eq('status', currentFilters.status);
    }
    
    if (currentFilters.client !== 'all') {
      query = query.eq('client_id', currentFilters.client);
    }
    
    if (currentFilters.dateFrom) {
      query = query.gte('issue_date', currentFilters.dateFrom);
    }
    
    if (currentFilters.dateTo) {
      query = query.lte('issue_date', currentFilters.dateTo);
    }
    
    const { data: invoices, error } = await query;
    
    if (error) throw error;
    
    allInvoices = invoices || [];
    renderInvoices();
    updateSummaryCards();
    
  } catch (error) {
    console.error('[Billing] Error loading invoices:', error);
    toast.error('Failed to load invoices', 'Error');
    document.getElementById('invoices-table-body').innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-12 text-center text-red-500">Error loading invoices. Please try again.</td>
      </tr>
    `;
  }
}

// Render invoices
function renderInvoices() {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;
  
  if (allInvoices.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
          <i data-lucide="file-text" class="w-12 h-12 mx-auto mb-2 opacity-50"></i>
          <p>No invoices found</p>
          <button onclick="openNewInvoiceModal()" class="mt-4 px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark">
            Create Your First Invoice
          </button>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  tbody.innerHTML = allInvoices.map(invoice => {
    const statusBadge = getInvoiceStatusBadge(invoice.status);
    const clientName = invoice.client?.full_name || invoice.client?.email || 'Unknown';
    const siteName = invoice.site?.name || '—';
    const issueDate = invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const dueDate = invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    
    return `
      <tr class="hover:bg-nfglight/30 dark:hover:bg-gray-700/30 transition">
        <td class="px-4 py-3">
          <span class="font-medium text-nfgblue dark:text-blue-400">${escapeHtml(invoice.invoice_number || '—')}</span>
        </td>
        <td class="px-4 py-3">
          <div>
            <p class="font-medium">${escapeHtml(clientName)}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(siteName)}</p>
          </div>
        </td>
        <td class="px-4 py-3 text-sm">${issueDate}</td>
        <td class="px-4 py-3 text-sm">${dueDate}</td>
        <td class="px-4 py-3">
          <span class="font-semibold">$${formatCurrency(invoice.total_amount || 0)}</span>
        </td>
        <td class="px-4 py-3">
          <span class="font-semibold ${invoice.balance_due > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
            $${formatCurrency(invoice.balance_due || 0)}
          </span>
        </td>
        <td class="px-4 py-3">${statusBadge}</td>
        <td class="px-4 py-3">
          <div class="flex items-center justify-end gap-2">
            <button onclick="viewInvoice('${invoice.id}')" class="p-1.5 rounded-lg hover:bg-nfglight" title="View">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            <button onclick="editInvoice('${invoice.id}')" class="p-1.5 rounded-lg hover:bg-nfglight" title="Edit">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            ${invoice.status === 'draft' ? `
              <button onclick="sendInvoice('${invoice.id}')" class="p-1.5 rounded-lg hover:bg-green-50 text-green-600" title="Send Invoice">
                <i data-lucide="send" class="w-4 h-4"></i>
              </button>
              <button onclick="deleteInvoice('${invoice.id}')" class="p-1.5 rounded-lg hover:bg-red-50 text-red-600" title="Delete">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Update summary cards
function updateSummaryCards() {
  const totalRevenue = allInvoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
  
  const outstanding = allInvoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
  
  const overdue = allInvoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + parseFloat(inv.balance_due || 0), 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const paidThisMonth = allInvoices
    .filter(inv => {
      if (inv.status !== 'paid' || !inv.paid_at) return false;
      const paidDate = new Date(inv.paid_at);
      return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
    })
    .reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0);
  
  document.getElementById('summary-total-revenue').textContent = `$${formatCurrency(totalRevenue)}`;
  document.getElementById('summary-outstanding').textContent = `$${formatCurrency(outstanding)}`;
  document.getElementById('summary-overdue').textContent = `$${formatCurrency(overdue)}`;
  document.getElementById('summary-paid-month').textContent = `$${formatCurrency(paidThisMonth)}`;
}

// Get invoice status badge
function getInvoiceStatusBadge(status) {
  const badges = {
    'draft': '<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400">Draft</span>',
    'sent': '<span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Sent</span>',
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

// Open new invoice modal
window.openNewInvoiceModal = function() {
  currentInvoiceId = null;
  document.getElementById('invoice-modal-title').textContent = 'New Invoice';
  document.getElementById('invoice-form').reset();
  document.getElementById('line-items-container').innerHTML = '';
  lineItemCounter = 0;
  
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  
  document.getElementById('invoice-issue-date').value = today;
  document.getElementById('invoice-due-date').value = dueDateStr;
  
  // Reset totals
  updateInvoiceTotals();
  
  // Update site dropdown when client changes
  document.getElementById('invoice-client').addEventListener('change', updateSiteDropdown);
  
  document.getElementById('invoiceModal').classList.remove('hidden');
  document.getElementById('invoiceModal').classList.add('flex');
};

// Open invoice modal from job data
async function openInvoiceModalFromJob(jobData) {
  currentInvoiceId = null;
  document.getElementById('invoice-modal-title').textContent = 'New Invoice from Job';
  document.getElementById('invoice-form').reset();
  document.getElementById('line-items-container').innerHTML = '';
  lineItemCounter = 0;
  
  // Pre-fill job data
  if (jobData.clientId) {
    document.getElementById('invoice-client').value = jobData.clientId;
    await updateSiteDropdown();
  }
  
  if (jobData.siteId) {
    document.getElementById('invoice-site').value = jobData.siteId;
    // Load jobs for this site
    await loadJobsForSite(jobData.siteId);
  }
  
  if (jobData.jobId) {
    document.getElementById('invoice-job').value = jobData.jobId;
  }
  
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dueDateStr = dueDate.toISOString().split('T')[0];
  
  document.getElementById('invoice-issue-date').value = today;
  document.getElementById('invoice-due-date').value = dueDateStr;
  
  // Add a default line item for the job
  if (jobData.jobTitle) {
    const estimatedHours = jobData.estimatedHours || 1;
    const defaultRate = 50; // Default hourly rate - can be customized
    addLineItem(
      `${jobData.jobTitle} - ${jobData.jobType || 'Service'}`,
      estimatedHours,
      defaultRate
    );
  }
  
  // Update totals
  updateInvoiceTotals();
  
  // Open modal
  document.getElementById('invoiceModal').classList.remove('hidden');
  document.getElementById('invoiceModal').classList.add('flex');
  
  toast.info('Invoice pre-filled from job. Review and adjust as needed.', 'Job Invoice');
}

// Load jobs for a specific site
async function loadJobsForSite(siteId) {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('id, title, status')
      .eq('site_id', siteId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    const jobSelect = document.getElementById('invoice-job');
    if (jobSelect) {
      const currentValue = jobSelect.value;
      jobSelect.innerHTML = '<option value="">No job linked</option>' +
        (data || []).map(job => 
          `<option value="${job.id}">${escapeHtml(job.title)}</option>`
        ).join('');
      if (currentValue) {
        jobSelect.value = currentValue;
      }
    }
  } catch (error) {
    console.error('[Billing] Error loading jobs for site:', error);
  }
}

// Update site dropdown based on selected client
function updateSiteDropdown() {
  const clientId = document.getElementById('invoice-client').value;
  const siteSelect = document.getElementById('invoice-site');
  
  if (!clientId) {
    siteSelect.innerHTML = '<option value="">Select a site</option>';
    return;
  }
  
  const clientSites = allSites.filter(site => site.client_id === clientId);
  siteSelect.innerHTML = '<option value="">Select a site</option>' +
    clientSites.map(site => 
      `<option value="${site.id}">${escapeHtml(site.name)}</option>`
    ).join('');
}

// Add line item
document.getElementById('add-line-item-btn')?.addEventListener('click', () => {
  addLineItem();
});

function addLineItem(description = '', quantity = 1, unitPrice = 0) {
  lineItemCounter++;
  const container = document.getElementById('line-items-container');
  const itemId = `line-item-${lineItemCounter}`;
  
  const lineItemHTML = `
    <div id="${itemId}" class="flex items-center gap-2 p-3 border border-nfgray rounded-xl">
      <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
        <input type="text" class="line-item-description border border-nfgray rounded-lg p-2" placeholder="Description" value="${escapeHtml(description)}" required>
        <input type="number" class="line-item-quantity border border-nfgray rounded-lg p-2" placeholder="Qty" step="0.01" min="0" value="${quantity}" required>
        <input type="number" class="line-item-price border border-nfgray rounded-lg p-2" placeholder="Unit Price" step="0.01" min="0" value="${unitPrice}" required>
      </div>
      <div class="flex items-center gap-2">
        <span class="line-item-total font-semibold text-nfgblue dark:text-blue-400 w-20 text-right">$${formatCurrency(quantity * unitPrice)}</span>
        <button type="button" onclick="removeLineItem('${itemId}')" class="p-1.5 rounded-lg hover:bg-red-50 text-red-600">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', lineItemHTML);
  
  // Attach event listeners for calculations
  const itemDiv = document.getElementById(itemId);
  itemDiv.querySelector('.line-item-quantity').addEventListener('input', updateLineItemTotal);
  itemDiv.querySelector('.line-item-price').addEventListener('input', updateLineItemTotal);
  
  // Update totals
  updateInvoiceTotals();
  
  if (window.lucide) lucide.createIcons();
}

// Remove line item
window.removeLineItem = function(itemId) {
  document.getElementById(itemId)?.remove();
  updateInvoiceTotals();
};

// Update line item total
function updateLineItemTotal(e) {
  const itemDiv = e.target.closest('[id^="line-item-"]');
  if (!itemDiv) return;
  
  const quantity = parseFloat(itemDiv.querySelector('.line-item-quantity').value || 0);
  const unitPrice = parseFloat(itemDiv.querySelector('.line-item-price').value || 0);
  const total = quantity * unitPrice;
  
  itemDiv.querySelector('.line-item-total').textContent = `$${formatCurrency(total)}`;
  updateInvoiceTotals();
}

// Update invoice totals
function updateInvoiceTotals() {
  const lineItems = document.querySelectorAll('[id^="line-item-"]');
  let subtotal = 0;
  
  lineItems.forEach(item => {
    const quantity = parseFloat(item.querySelector('.line-item-quantity').value || 0);
    const unitPrice = parseFloat(item.querySelector('.line-item-price').value || 0);
    subtotal += quantity * unitPrice;
  });
  
  const taxRate = parseFloat(document.getElementById('invoice-tax-rate').value || 0);
  const taxAmount = subtotal * (taxRate / 100);
  
  const discountAmount = parseFloat(document.getElementById('invoice-discount-amount').value || 0);
  const discountPercent = parseFloat(document.getElementById('invoice-discount-percent').value || 0);
  const discount = discountAmount || (subtotal * (discountPercent / 100));
  
  const total = subtotal + taxAmount - discount;
  
  document.getElementById('invoice-subtotal').textContent = `$${formatCurrency(subtotal)}`;
  document.getElementById('invoice-tax-amount').textContent = `$${formatCurrency(taxAmount)}`;
  document.getElementById('invoice-total').textContent = `$${formatCurrency(total)}`;
}

// Attach event listeners for totals
document.getElementById('invoice-tax-rate')?.addEventListener('input', updateInvoiceTotals);
document.getElementById('invoice-discount-amount')?.addEventListener('input', updateInvoiceTotals);
document.getElementById('invoice-discount-percent')?.addEventListener('input', updateInvoiceTotals);

// Submit invoice form
document.getElementById('invoice-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please log in', 'Authentication Error');
      return;
    }
    
    // Collect line items
    const lineItems = [];
    document.querySelectorAll('[id^="line-item-"]').forEach((item, index) => {
      const description = item.querySelector('.line-item-description').value;
      const quantity = parseFloat(item.querySelector('.line-item-quantity').value || 0);
      const unitPrice = parseFloat(item.querySelector('.line-item-price').value || 0);
      
      if (description && quantity > 0 && unitPrice > 0) {
        lineItems.push({
          description,
          quantity,
          unit_price: unitPrice,
          line_total: quantity * unitPrice,
          sort_order: index
        });
      }
    });
    
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item', 'Validation Error');
      return;
    }
    
    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    const taxRate = parseFloat(document.getElementById('invoice-tax-rate').value || 0);
    const taxAmount = subtotal * (taxRate / 100);
    const discountAmount = parseFloat(document.getElementById('invoice-discount-amount').value || 0);
    const discountPercent = parseFloat(document.getElementById('invoice-discount-percent').value || 0);
    const discount = discountAmount || (subtotal * (discountPercent / 100));
    const totalAmount = subtotal + taxAmount - discount;
    
    // Prepare invoice data
    const invoiceData = {
      client_id: document.getElementById('invoice-client').value || null,
      site_id: document.getElementById('invoice-site').value ? parseInt(document.getElementById('invoice-site').value) : null,
      job_id: document.getElementById('invoice-job').value || null,
      issue_date: document.getElementById('invoice-issue-date').value,
      due_date: document.getElementById('invoice-due-date').value,
      status: 'draft',
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount > 0 ? discountAmount : 0,
      discount_percent: discountPercent > 0 ? discountPercent : 0,
      total_amount: totalAmount,
      balance_due: totalAmount,
      notes: document.getElementById('invoice-notes').value || null,
      terms: document.getElementById('invoice-terms').value || null,
      created_by: user.id
    };
    
    let invoice;
    
    if (currentInvoiceId) {
      // Update existing invoice
      const { data, error } = await supabase
        .from('invoices')
        .update(invoiceData)
        .eq('id', currentInvoiceId)
        .select()
        .single();
      
      if (error) throw error;
      invoice = data;
      
      // Delete existing line items
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', currentInvoiceId);
      
      toast.success('Invoice updated successfully', 'Success');
    } else {
      // Create new invoice (invoice_number will be auto-generated by trigger)
      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single();
      
      if (error) throw error;
      invoice = data;
      
      toast.success('Invoice created successfully', 'Success');
    }
    
    // Insert line items
    if (lineItems.length > 0) {
      const lineItemsData = lineItems.map(item => ({
        invoice_id: invoice.id,
        ...item
      }));
      
      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsData);
      
      if (lineItemsError) throw lineItemsError;
    }
    
    // Close modal and reload
    document.getElementById('invoiceModal').classList.add('hidden');
    await loadInvoices();
    
  } catch (error) {
    console.error('[Billing] Error saving invoice:', error);
    toast.error(error.message || 'Failed to save invoice', 'Error');
  }
});

// View invoice
window.viewInvoice = async function(invoiceId) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        client:client_id(id, full_name, email),
        site:site_id(id, name),
        job:job_id(id, title),
        invoice_line_items(id, description, quantity, unit_price, line_total, sort_order),
        payments(id, amount, payment_date, payment_method, reference_number, notes)
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw error;
    
    // Populate detail modal
    document.getElementById('invoice-detail-number').textContent = invoice.invoice_number || 'INV-000';
    document.getElementById('invoice-detail-client').textContent = invoice.client?.full_name || invoice.client?.email || 'Unknown Client';
    
    const contentDiv = document.getElementById('invoice-detail-content');
    contentDiv.innerHTML = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
          <p class="font-semibold">${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
          <p class="font-semibold">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Status</p>
          <p>${getInvoiceStatusBadge(invoice.status)}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
          <p class="font-semibold text-nfgblue dark:text-blue-400">$${formatCurrency(invoice.total_amount || 0)}</p>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 mb-6">
        <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-3">Line Items</h5>
        <div class="space-y-2">
          ${invoice.invoice_line_items && invoice.invoice_line_items.length > 0
            ? invoice.invoice_line_items
                .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                .map(item => `
                  <div class="flex items-center justify-between p-3 border border-nfgray rounded-lg">
                    <div class="flex-1">
                      <p class="font-medium">${escapeHtml(item.description || 'Line Item')}</p>
                      <p class="text-sm text-gray-500 dark:text-gray-400">Qty: ${item.quantity} × $${formatCurrency(item.unit_price || 0)}</p>
                    </div>
                    <p class="font-semibold text-nfgblue dark:text-blue-400">$${formatCurrency(item.line_total || 0)}</p>
                  </div>
                `).join('')
            : '<p class="text-gray-500 text-sm text-center py-4">No line items</p>'
          }
        </div>
      </div>
      
      <div class="flex justify-end mb-6">
        <div class="w-full md:w-64 space-y-2">
          <div class="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>$${formatCurrency(invoice.subtotal || 0)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Tax:</span>
            <span>$${formatCurrency(invoice.tax_amount || 0)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>Discount:</span>
            <span>$${formatCurrency(invoice.discount_amount || 0)}</span>
          </div>
          <div class="flex justify-between font-semibold text-lg border-t border-nfgray pt-2">
            <span>Total:</span>
            <span class="text-nfgblue dark:text-blue-400">$${formatCurrency(invoice.total_amount || 0)}</span>
          </div>
          <div class="flex justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Paid:</span>
            <span>$${formatCurrency(invoice.paid_amount || 0)}</span>
          </div>
          <div class="flex justify-between text-sm font-semibold">
            <span>Balance Due:</span>
            <span class="${invoice.balance_due > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
              $${formatCurrency(invoice.balance_due || 0)}
            </span>
          </div>
        </div>
      </div>
      
      <!-- Payment History -->
      <div class="bg-white dark:bg-gray-800 border border-nfgray rounded-xl p-4 mb-6">
        <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-3">Payment History</h5>
        <div id="invoice-payment-history" class="space-y-2">
          ${invoice.payments && invoice.payments.length > 0
            ? invoice.payments.map(payment => {
                const methodBadges = {
                  'cash': { icon: '💵', label: 'Cash', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                  'check': { icon: '📝', label: 'Check', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                  'credit_card': { icon: '💳', label: 'Credit Card', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                  'bank_transfer': { icon: '🏦', label: 'Bank Transfer', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
                  'other': { icon: '📄', label: 'Other', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
                };
                const badge = methodBadges[payment.payment_method] || methodBadges.other;
                return `
                  <div class="flex items-center justify-between p-3 bg-nfglight/30 dark:bg-gray-700/30 border border-nfgray dark:border-gray-600 rounded-xl">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-semibold text-lg text-nfgblue dark:text-blue-400">$${formatCurrency(payment.amount)}</span>
                        <span class="px-2 py-0.5 rounded text-xs font-medium ${badge.color}">${badge.icon} ${badge.label}</span>
                      </div>
                      <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(payment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                      ${payment.reference_number ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ref: ${escapeHtml(payment.reference_number)}</p>` : ''}
                      ${payment.notes ? `<p class="text-xs text-gray-400 dark:text-gray-500 mt-1 italic">${escapeHtml(payment.notes)}</p>` : ''}
                    </div>
                  </div>
                `;
              }).join('')
            : '<p class="text-sm text-gray-500 dark:text-gray-400">No payments recorded</p>'
          }
        </div>
      </div>
      
      ${invoice.notes || invoice.terms ? `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          ${invoice.notes ? `
            <div>
              <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-2">Notes</h5>
              <p class="text-sm">${escapeHtml(invoice.notes)}</p>
            </div>
          ` : ''}
          ${invoice.terms ? `
            <div>
              <h5 class="text-nfgblue dark:text-blue-400 font-semibold mb-2">Payment Terms</h5>
              <p class="text-sm">${escapeHtml(invoice.terms)}</p>
            </div>
          ` : ''}
        </div>
      ` : ''}
      
      <div class="flex items-center justify-end gap-2 pt-4 border-t border-nfgray">
        ${invoice.status === 'draft' ? `
          <button onclick="editInvoice('${invoice.id}')" class="px-4 py-2 rounded-xl border border-nfgray hover:bg-nfglight">
            Edit Invoice
          </button>
          <button onclick="sendInvoice('${invoice.id}')" class="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2">
            <i data-lucide="send" class="w-4 h-4"></i>
            Send Invoice
          </button>
        ` : ''}
        <button onclick="downloadInvoicePDF('${invoice.id}')" class="px-4 py-2 rounded-xl bg-nfgblue text-white hover:bg-nfgdark">
          Download PDF
        </button>
      </div>
    `;
    
    // Show "Send Invoice" button only if status is draft
    const sendInvoiceBtn = document.getElementById('send-invoice-btn');
    if (invoice.status === 'draft') {
      sendInvoiceBtn.classList.remove('hidden');
      sendInvoiceBtn.onclick = () => {
        sendInvoice(invoiceId);
      };
    } else {
      sendInvoiceBtn.classList.add('hidden');
    }
    
    // Show "Add Payment" button only if balance due > 0
    const addPaymentBtn = document.getElementById('add-payment-btn');
    const balanceDue = Number(invoice.balance_due || 0);
    if (balanceDue > 0 && invoice.status !== 'draft') {
      addPaymentBtn.classList.remove('hidden');
      addPaymentBtn.onclick = () => {
        openAddPaymentModal(invoiceId, invoice);
      };
    } else {
      addPaymentBtn.classList.add('hidden');
    }
    
    // Store invoice data for payment modal
    window.currentPaymentInvoiceId = invoiceId;
    window.currentPaymentInvoice = invoice;
    
    document.getElementById('invoiceDetailModal').classList.remove('hidden');
    document.getElementById('invoiceDetailModal').classList.add('flex');
    
    if (window.lucide) lucide.createIcons();
    
  } catch (error) {
    console.error('[Billing] Error loading invoice details:', error);
    toast.error('Failed to load invoice details', 'Error');
  }
};

// Edit invoice
window.editInvoice = async function(invoiceId) {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items(id, description, quantity, unit_price, line_total, sort_order)
      `)
      .eq('id', invoiceId)
      .single();
    
    if (error) throw error;
    
    currentInvoiceId = invoiceId;
    document.getElementById('invoice-modal-title').textContent = 'Edit Invoice';
    
    // Populate form
    document.getElementById('invoice-client').value = invoice.client_id || '';
    updateSiteDropdown();
    if (invoice.site_id) {
      document.getElementById('invoice-site').value = invoice.site_id;
    }
    if (invoice.job_id) {
      document.getElementById('invoice-job').value = invoice.job_id;
    }
    document.getElementById('invoice-number').value = invoice.invoice_number || '';
    document.getElementById('invoice-issue-date').value = invoice.issue_date || '';
    document.getElementById('invoice-due-date').value = invoice.due_date || '';
    document.getElementById('invoice-tax-rate').value = invoice.tax_rate || 0;
    document.getElementById('invoice-discount-amount').value = invoice.discount_amount || 0;
    document.getElementById('invoice-discount-percent').value = invoice.discount_percent || 0;
    document.getElementById('invoice-notes').value = invoice.notes || '';
    document.getElementById('invoice-terms').value = invoice.terms || '';
    
    // Clear and populate line items
    document.getElementById('line-items-container').innerHTML = '';
    lineItemCounter = 0;
    
    if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
      invoice.invoice_line_items
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .forEach(item => {
          addLineItem(item.description, item.quantity, item.unit_price);
        });
    }
    
    updateInvoiceTotals();
    
    document.getElementById('invoiceModal').classList.remove('hidden');
    document.getElementById('invoiceModal').classList.add('flex');
    
  } catch (error) {
    console.error('[Billing] Error loading invoice for edit:', error);
    toast.error('Failed to load invoice', 'Error');
  }
};

// Send invoice (mark as sent)
window.sendInvoice = async function(invoiceId) {
  try {
    // Check if invoice has line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('id')
      .eq('invoice_id', invoiceId);
    
    if (!lineItems || lineItems.length === 0) {
      toast.error('Invoice must have at least one line item before sending', 'Error');
      return;
    }
    
    // Check if invoice has a client
    const { data: invoice } = await supabase
      .from('invoices')
      .select('client_id, invoice_number')
      .eq('id', invoiceId)
      .single();
    
    if (!invoice || !invoice.client_id) {
      toast.error('Invoice must have a client before sending', 'Error');
      return;
    }
    
    if (!confirm(`Send invoice ${invoice.invoice_number || invoiceId} to client?`)) {
      return;
    }
    
    // Update invoice status to 'sent' and set sent_at timestamp
    const { error } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', invoiceId);
    
    if (error) throw error;
    
    toast.success('Invoice sent successfully', 'Success');
    
    // Refresh invoices list
    await loadInvoices();
    
    // Refresh invoice detail modal if it's open
    if (window.currentPaymentInvoiceId === invoiceId) {
      await viewInvoice(invoiceId);
    }
    
    // Update summary cards
    await updateSummaryCards();
    
  } catch (error) {
    console.error('[Billing] Error sending invoice:', error);
    toast.error('Failed to send invoice', 'Error');
  }
};

// Delete invoice
window.deleteInvoice = async function(invoiceId) {
  if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
    return;
  }
  
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId);
    
    if (error) throw error;
    
    toast.success('Invoice deleted successfully', 'Success');
    await loadInvoices();
    
  } catch (error) {
    console.error('[Billing] Error deleting invoice:', error);
    toast.error('Failed to delete invoice', 'Error');
  }
};

// Download PDF
window.downloadInvoicePDF = async function(invoiceId) {
  try {
    // Fetch invoice data
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      toast.error('Failed to load invoice for PDF', 'Error');
      return;
    }

    // Fetch line items
    const { data: lineItems } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });

    // Load jsPDF
    if (!window.jspdf) {
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      window.jspdf = window.jspdf || window.jspdf;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Fetch related data
    const [client, site] = await Promise.all([
      invoice.client_id ? supabase.from('user_profiles').select('full_name, email').eq('id', invoice.client_id).single() : Promise.resolve({ data: null }),
      invoice.site_id ? supabase.from('sites').select('name').eq('id', invoice.site_id).single() : Promise.resolve({ data: null })
    ]);

    // PDF Content - Professional Design
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(22);
    doc.setFont(undefined, 'bold');
    doc.text('NFG ONE', margin, yPos);
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('WHERE INNOVATION MEETS EXECUTION', margin, yPos + 7);
    
    // Invoice Title (Right side)
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE', pageWidth - margin - 35, yPos);
    
    // Header line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos + 12, pageWidth - margin, yPos + 12);
    
    yPos += 25;

    // Invoice Details (Right side)
    const detailsBoxX = pageWidth - margin - 75;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE #', detailsBoxX, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.invoice_number || 'N/A', detailsBoxX + 25, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Date:', detailsBoxX, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : 'N/A', detailsBoxX + 25, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Due:', detailsBoxX, yPos);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A', detailsBoxX + 25, yPos);
    yPos += 6;
    doc.setFont(undefined, 'bold');
    doc.text('Status:', detailsBoxX, yPos);
    doc.setFont(undefined, 'normal');
    doc.text((invoice.status || 'draft').toUpperCase(), detailsBoxX + 25, yPos);

    // Bill To Section
    yPos += 60;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', margin, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text(client.data?.full_name || client.data?.email || 'N/A', margin, yPos);
    if (client.data?.email && client.data?.full_name) {
      yPos += 6;
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(client.data.email, margin, yPos);
      doc.setTextColor(0, 0, 0);
    }
    if (site.data?.name) {
      yPos += 8;
      doc.setFontSize(10);
      doc.text(`Site: ${site.data.name}`, margin, yPos);
    }

    // Line Items Section
    yPos += 20;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Line Items', margin, yPos);
    yPos += 8;

    // Table header
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Description', margin, yPos);
    doc.text('Qty', margin + 100, yPos);
    doc.text('Unit Price', margin + 130, yPos);
    doc.text('Total', margin + 160, yPos);
    yPos += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 6;

    // Table rows
    doc.setFont(undefined, 'normal');
    let rowIndex = 0;
    (lineItems || []).forEach(item => {
      if (yPos > pageHeight - 80) {
        doc.addPage();
        yPos = margin + 20;
        // Redraw header on new page
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(22);
        doc.setFont(undefined, 'bold');
        doc.text('NFG ONE', margin, yPos);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('WHERE INNOVATION MEETS EXECUTION', margin, yPos + 7);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos + 12, pageWidth - margin, yPos + 12);
        yPos += 25;
        doc.setTextColor(0, 0, 0);
      }
      
      doc.setFontSize(9);
      // Wrap description if too long
      const descLines = doc.splitTextToSize(item.description || '—', 90);
      doc.text(descLines[0], margin, yPos);
      doc.text(Number(item.quantity || 0).toFixed(2), margin + 100, yPos);
      doc.text(`$${Number(item.unit_price || 0).toFixed(2)}`, margin + 130, yPos);
      doc.setFont(undefined, 'bold');
      doc.text(`$${Number(item.line_total || 0).toFixed(2)}`, margin + 160, yPos);
      doc.setFont(undefined, 'normal');
      
      yPos += 6;
      if (descLines.length > 1) {
        doc.text(descLines[1], margin, yPos);
        yPos += 6;
      }
      
      // Subtle row divider
      if (rowIndex < (lineItems || []).length - 1) {
        doc.setDrawColor(240, 240, 240);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
        yPos += 4;
      }
      rowIndex++;
    });

    // Summary (Right aligned)
    yPos += 10;
    const summaryBoxY = yPos;
    const summaryBoxWidth = 75;
    const summaryBoxX = pageWidth - margin - summaryBoxWidth;
    
    let summaryY = summaryBoxY;
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Subtotal
    doc.text('Subtotal:', summaryBoxX, summaryY);
    doc.text(`$${Number(invoice.subtotal || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth, summaryY, { align: 'right' });
    summaryY += 6;
    
    // Tax
    doc.text(`Tax (${Number(invoice.tax_rate || 0).toFixed(1)}%):`, summaryBoxX, summaryY);
    doc.text(`$${Number(invoice.tax_amount || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth, summaryY, { align: 'right' });
    summaryY += 6;
    
    // Discount
    if (Number(invoice.discount_amount || 0) > 0) {
      doc.text('Discount:', summaryBoxX, summaryY);
      doc.text(`-$${Number(invoice.discount_amount || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth, summaryY, { align: 'right' });
      summaryY += 6;
    }
    
    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.line(summaryBoxX, summaryY, summaryBoxX + summaryBoxWidth, summaryY);
    summaryY += 6;
    
    // Total
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Total:', summaryBoxX, summaryY);
    doc.text(`$${Number(invoice.total_amount || 0).toFixed(2)}`, summaryBoxX + summaryBoxWidth, summaryY, { align: 'right' });
    summaryY += 8;
    
    // Paid and Balance
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Paid: $${Number(invoice.paid_amount || 0).toFixed(2)}`, summaryBoxX, summaryY);
    summaryY += 6;
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Balance: $${Number(invoice.balance_due || 0).toFixed(2)}`, summaryBoxX, summaryY);

    // Notes & Terms (Left side)
    yPos = summaryBoxY;
    if (invoice.notes || invoice.terms) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      
      if (invoice.notes) {
        doc.text('Notes:', margin, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const notesLines = doc.splitTextToSize(invoice.notes, 100);
        notesLines.forEach(line => {
          doc.text(line, margin, yPos);
          yPos += 5;
        });
        yPos += 5;
      }
      
      if (invoice.terms) {
        doc.setFont(undefined, 'bold');
        doc.text('Payment Terms:', margin, yPos);
        yPos += 7;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        const termsLines = doc.splitTextToSize(invoice.terms, 100);
        termsLines.forEach(line => {
          doc.text(line, margin, yPos);
          yPos += 5;
        });
      }
    }

    // Footer
    const footerY = pageHeight - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 10, pageWidth - margin, footerY - 10);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', margin, footerY);
    doc.text(`Page 1`, pageWidth - margin, footerY, { align: 'right' });

    // Download PDF
    doc.save(`Invoice-${invoice.invoice_number || invoiceId}.pdf`);
    toast.success('Invoice PDF downloaded', 'Success');

  } catch (error) {
    console.error('[Billing] Error generating PDF:', error);
    toast.error('Failed to generate PDF', 'Error');
  }
};

// Validate payment amount
function validatePaymentAmount(amount, balanceDue) {
  if (!amount || amount <= 0) {
    return { valid: false, error: 'Payment amount must be greater than 0' };
  }
  if (amount > balanceDue) {
    return { valid: false, error: `Payment cannot exceed balance due of $${balanceDue.toFixed(2)}` };
  }
  return { valid: true };
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount).replace('$', '');
}

// Update payment form validation
function updatePaymentFormValidation() {
  const amountInput = document.getElementById('payment-amount');
  const amountError = document.getElementById('payment-amount-error');
  const submitBtn = document.querySelector('#add-payment-form button[type="submit"]');
  const balanceDueEl = document.getElementById('payment-balance-due');
  
  if (!amountInput || !window.currentPaymentInvoice) return;

  const paymentAmount = parseFloat(amountInput.value) || 0;
  const balanceDue = Number(window.currentPaymentInvoice.balance_due || 0);
  
  // Validate amount
  const validation = validatePaymentAmount(paymentAmount, balanceDue);
  
  if (paymentAmount > 0 && !validation.valid) {
    // Show error
    amountError.textContent = validation.error;
    amountError.classList.remove('hidden');
    amountInput.classList.add('border-red-500');
    amountInput.classList.remove('border-nfgray');
    if (submitBtn) submitBtn.disabled = true;
    submitBtn?.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    // Hide error
    amountError.classList.add('hidden');
    amountInput.classList.remove('border-red-500');
    amountInput.classList.add('border-nfgray');
    if (submitBtn) submitBtn.disabled = false;
    submitBtn?.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Update balance preview
  const newBalanceHint = document.getElementById('payment-new-balance-hint');
  if (paymentAmount > 0 && paymentAmount <= balanceDue) {
    const newBalance = balanceDue - paymentAmount;
    balanceDueEl.textContent = `$${newBalance.toFixed(2)}`;
    if (newBalanceHint) {
      newBalanceHint.classList.remove('hidden');
      newBalanceHint.textContent = `New balance after payment: $${newBalance.toFixed(2)}`;
    }
    if (newBalance === 0) {
      balanceDueEl.textContent = `$${newBalance.toFixed(2)} (Fully Paid)`;
      balanceDueEl.classList.remove('text-orange-600', 'dark:text-orange-400');
      balanceDueEl.classList.add('text-green-600', 'dark:text-green-400');
      if (newBalanceHint) {
        newBalanceHint.textContent = 'Invoice will be fully paid';
        newBalanceHint.classList.add('text-green-600', 'dark:text-green-400');
        newBalanceHint.classList.remove('text-gray-500', 'dark:text-gray-400');
      }
    } else {
      balanceDueEl.classList.remove('text-green-600', 'dark:text-green-400');
      balanceDueEl.classList.add('text-orange-600', 'dark:text-orange-400');
      if (newBalanceHint) {
        newBalanceHint.classList.remove('text-green-600', 'dark:text-green-400');
        newBalanceHint.classList.add('text-gray-500', 'dark:text-gray-400');
      }
    }
  } else if (paymentAmount === 0 || !amountInput.value) {
    // Reset to original balance
    balanceDueEl.textContent = `$${balanceDue.toFixed(2)}`;
    balanceDueEl.classList.remove('text-green-600', 'dark:text-green-400');
    balanceDueEl.classList.add('text-orange-600', 'dark:text-orange-400');
    if (newBalanceHint) {
      newBalanceHint.classList.add('hidden');
    }
  }
}

// Open add payment modal
window.openAddPaymentModal = function(invoiceId, invoice) {
  const modal = document.getElementById('add-payment-modal');
  if (!modal) {
    console.error('[Billing] Add payment modal not found');
    return;
  }

  // Populate invoice info
  document.getElementById('payment-invoice-number').textContent = invoice.invoice_number || 'N/A';
  const balanceDue = Number(invoice.balance_due || 0);
  document.getElementById('payment-balance-due').textContent = `$${balanceDue.toFixed(2)}`;

  // Set default payment date to today
  const today = new Date();
  document.getElementById('payment-date').value = today.toISOString().split('T')[0];

  // Reset form
  document.getElementById('add-payment-form').reset();
  document.getElementById('payment-date').value = today.toISOString().split('T')[0]; // Reset again after form reset
  document.getElementById('payment-amount').value = '';
  document.getElementById('payment-method').value = '';
  document.getElementById('payment-reference').value = '';
  document.getElementById('payment-notes').value = '';
  document.getElementById('payment-amount-error').classList.add('hidden');
  document.getElementById('payment-error-message').classList.add('hidden');

  // Reset balance display
  const balanceDueEl = document.getElementById('payment-balance-due');
  const newBalanceHint = document.getElementById('payment-new-balance-hint');
  balanceDueEl.textContent = `$${balanceDue.toFixed(2)}`;
  balanceDueEl.classList.remove('text-green-600', 'dark:text-green-400');
  balanceDueEl.classList.add('text-orange-600', 'dark:text-orange-400');
  if (newBalanceHint) {
    newBalanceHint.classList.add('hidden');
    newBalanceHint.classList.remove('text-green-600', 'dark:text-green-400');
    newBalanceHint.classList.add('text-gray-500', 'dark:text-gray-400');
  }

  // Reset input border
  const amountInput = document.getElementById('payment-amount');
  amountInput.classList.remove('border-red-500');
  amountInput.classList.add('border-nfgray');

  // Enable submit button
  const submitBtn = document.querySelector('#add-payment-form button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }

  // Store current invoice ID and data
  window.currentPaymentInvoiceId = invoiceId;
  window.currentPaymentInvoice = invoice;

  // Attach real-time validation listeners
  const paymentAmountInput = document.getElementById('payment-amount');
  if (paymentAmountInput) {
    // Remove existing listeners to avoid duplicates
    const newAmountInput = paymentAmountInput.cloneNode(true);
    paymentAmountInput.parentNode.replaceChild(newAmountInput, paymentAmountInput);
    
    // Add new listeners
    newAmountInput.addEventListener('input', updatePaymentFormValidation);
    newAmountInput.addEventListener('blur', updatePaymentFormValidation);
  }

  // Show modal
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
};

// Attach event listeners
function attachEventListeners() {
  // Payment form submission
  document.getElementById('add-payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const errorDiv = document.getElementById('payment-error-message');
    const amountError = document.getElementById('payment-amount-error');
    errorDiv.classList.add('hidden');
    amountError.classList.add('hidden');
    
    try {
      // Get form data
      const invoiceId = window.currentPaymentInvoiceId;
      const invoice = window.currentPaymentInvoice;
      
      if (!invoiceId || !invoice) {
        throw new Error('Invoice information is missing. Please close and reopen the payment modal.');
      }
      
      const paymentAmount = parseFloat(document.getElementById('payment-amount').value);
      const paymentDate = document.getElementById('payment-date').value;
      const paymentMethod = document.getElementById('payment-method').value;
      const referenceNumber = document.getElementById('payment-reference').value.trim() || null;
      const notes = document.getElementById('payment-notes').value.trim() || null;
      
      // Validate payment amount
      const balanceDue = Number(invoice.balance_due || 0);
      const validation = validatePaymentAmount(paymentAmount, balanceDue);
      
      if (!validation.valid) {
        amountError.textContent = validation.error;
        amountError.classList.remove('hidden');
        document.getElementById('payment-amount').classList.add('border-red-500');
        return;
      }
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Insert payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          invoice_id: invoiceId,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          reference_number: referenceNumber,
          notes: notes,
          created_by: user.id
        })
        .select()
        .single();
      
      if (paymentError) {
        console.error('[Billing] Error creating payment:', paymentError);
        throw paymentError;
      }
      
      // The trigger will automatically update invoice balance, but we'll refresh to be sure
      const successMessage = Number(invoice.balance_due || 0) - paymentAmount <= 0
        ? `Payment of $${paymentAmount.toFixed(2)} recorded. Invoice is now fully paid.`
        : `Payment of $${paymentAmount.toFixed(2)} recorded successfully.`;
      
      toast.success(successMessage, 'Payment Recorded');
      
      // Close payment modal
      document.getElementById('add-payment-modal').classList.add('hidden');
      document.getElementById('add-payment-modal').classList.remove('flex');
      
      // Refresh invoice detail modal
      await viewInvoice(invoiceId);
      
      // Refresh invoices list and summary
      await loadInvoices();
      await updateSummaryCards();
      
    } catch (error) {
      console.error('[Billing] Error recording payment:', error);
      const errorMessage = error.message || 'Failed to record payment. Please try again.';
      errorDiv.querySelector('p').textContent = errorMessage;
      errorDiv.classList.remove('hidden');
      toast.error(errorMessage, 'Payment Error');
    }
  });
  
  // New invoice button
  document.getElementById('new-invoice-btn')?.addEventListener('click', openNewInvoiceModal);
  
  // Status tabs
  document.querySelectorAll('.invoice-status-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.invoice-status-tab').forEach(t => {
        t.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
        t.classList.add('text-gray-500', 'border-transparent');
      });
      tab.classList.remove('text-gray-500', 'border-transparent');
      tab.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue');
      
      currentFilters.status = tab.dataset.status;
      loadInvoices();
    });
  });
  
  // Filter inputs
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    loadInvoices();
  });
  
  document.getElementById('filter-client')?.addEventListener('change', (e) => {
    currentFilters.client = e.target.value;
    loadInvoices();
  });
  
  document.getElementById('filter-date-from')?.addEventListener('change', (e) => {
    currentFilters.dateFrom = e.target.value || null;
    loadInvoices();
  });
  
  document.getElementById('filter-date-to')?.addEventListener('change', (e) => {
    currentFilters.dateTo = e.target.value || null;
    loadInvoices();
  });
  
  // Clear filters
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    currentFilters = { status: 'all', client: 'all', dateFrom: null, dateTo: null };
    document.getElementById('filter-status').value = 'all';
    document.getElementById('filter-client').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    
    // Reset status tab
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
  
  // Phase 8: Attach tab and report listeners
  attachTabListeners();
  attachReportListeners();
}

// ==========================================
// Phase 8: Financial Reports & Analytics
// ==========================================

let revenueChart = null;
let reportPeriod = 'this_month';
let reportDateFrom = null;
let reportDateTo = null;

// Tab switching
function attachTabListeners() {
  const tabButtons = document.querySelectorAll('.billing-page-tab');
  const tabContents = document.querySelectorAll('.billing-tab-content');
  
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      // Update active tab
      tabButtons.forEach(b => {
        b.classList.remove('text-nfgblue', 'dark:text-blue-400', 'border-nfgblue', 'dark:border-blue-400');
        b.classList.add('text-gray-500', 'dark:text-gray-400', 'border-transparent');
      });
      btn.classList.remove('text-gray-500', 'dark:text-gray-400', 'border-transparent');
      btn.classList.add('text-nfgblue', 'dark:text-blue-400', 'border-b-2', 'border-nfgblue', 'dark:border-blue-400');
      
      // Show/hide content
      tabContents.forEach(content => {
        content.classList.add('hidden');
      });
      document.getElementById(`content-${targetTab}`)?.classList.remove('hidden');
      
      // Load reports if switching to reports tab
      if (targetTab === 'reports') {
        loadFinancialReports();
      }
      
      if (window.lucide) lucide.createIcons();
    });
  });
}

// Load financial reports
async function loadFinancialReports() {
  console.log('[Billing Reports] Loading financial reports...');
  
  try {
    const dateRange = getReportDateRange();
    
    // Load all data in parallel
    const [invoices, payments, expenses] = await Promise.all([
      loadInvoicesForReports(dateRange),
      loadPaymentsForReports(dateRange),
      loadExpensesForReports(dateRange)
    ]);
    
    // Update summary cards
    updateReportSummaryCards(invoices, expenses);
    
    // Load individual reports
    loadRevenueReport(invoices);
    loadClientRevenueReport(invoices);
    loadOutstandingInvoicesReport(invoices);
    loadAgingReport(invoices);
    loadPaymentHistoryReport(payments);
    
  } catch (error) {
    console.error('[Billing Reports] Error loading reports:', error);
    toast.error('Failed to load financial reports', 'Error');
  }
}

// Get date range based on selected period
function getReportDateRange() {
  const period = document.getElementById('report-period')?.value || 'this_month';
  
  let from = null;
  let to = null;
  const today = new Date();
  
  switch (period) {
    case 'this_month':
      from = new Date(today.getFullYear(), today.getMonth(), 1);
      to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'last_month':
      from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      to = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'this_quarter':
      const quarter = Math.floor(today.getMonth() / 3);
      from = new Date(today.getFullYear(), quarter * 3, 1);
      to = new Date(today.getFullYear(), (quarter + 1) * 3, 0);
      break;
    case 'this_year':
      from = new Date(today.getFullYear(), 0, 1);
      to = new Date(today.getFullYear(), 11, 31);
      break;
    case 'custom':
      const fromInput = document.getElementById('report-date-from');
      const toInput = document.getElementById('report-date-to');
      if (fromInput?.value) from = new Date(fromInput.value);
      if (toInput?.value) to = new Date(toInput.value);
      break;
    default: // all
      from = null;
      to = null;
  }
  
  reportDateFrom = from;
  reportDateTo = to;
  
  return { from, to };
}

// Load invoices for reports
async function loadInvoicesForReports(dateRange) {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      client:user_profiles!invoices_client_id_fkey(id, full_name, email),
      site:sites(id, name)
    `)
    .neq('status', 'cancelled');
  
  if (dateRange.from) {
    query = query.gte('issue_date', dateRange.from.toISOString().split('T')[0]);
  }
  if (dateRange.to) {
    query = query.lte('issue_date', dateRange.to.toISOString().split('T')[0]);
  }
  
  const { data, error } = await query.order('issue_date', { ascending: false });
  if (error) throw error;
  
  return data || [];
}

// Load payments for reports
async function loadPaymentsForReports(dateRange) {
  let query = supabase
    .from('payments')
    .select(`
      *,
      invoice:invoices!payments_invoice_id_fkey(
        invoice_number,
        client:user_profiles!invoices_client_id_fkey(full_name, email)
      )
    `)
    .order('payment_date', { ascending: false });
  
  if (dateRange.from) {
    query = query.gte('payment_date', dateRange.from.toISOString().split('T')[0]);
  }
  if (dateRange.to) {
    query = query.lte('payment_date', dateRange.to.toISOString().split('T')[0]);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
}

// Load expenses for reports
async function loadExpensesForReports(dateRange) {
  let query = supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false });
  
  if (dateRange.from) {
    query = query.gte('expense_date', dateRange.from.toISOString().split('T')[0]);
  }
  if (dateRange.to) {
    query = query.lte('expense_date', dateRange.to.toISOString().split('T')[0]);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data || [];
}

// Update report summary cards
function updateReportSummaryCards(invoices, expenses) {
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const outstanding = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + Number(inv.balance_due || inv.total_amount || 0), 0);
  
  document.getElementById('report-total-revenue').textContent = formatCurrency(totalRevenue);
  document.getElementById('report-total-expenses').textContent = formatCurrency(totalExpenses);
  document.getElementById('report-net-profit').textContent = formatCurrency(netProfit);
  document.getElementById('report-outstanding').textContent = formatCurrency(outstanding);
}

// Load revenue report (chart)
async function loadRevenueReport(invoices) {
  // Group by month
  const revenueByMonth = {};
  invoices
    .filter(inv => inv.status === 'paid')
    .forEach(inv => {
      const month = new Date(inv.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      if (!revenueByMonth[month]) revenueByMonth[month] = 0;
      revenueByMonth[month] += Number(inv.total_amount || 0);
    });
  
  const months = Object.keys(revenueByMonth).sort();
  const amounts = months.map(m => revenueByMonth[m]);
  
  // Create chart
  const ctx = document.getElementById('revenue-chart');
  if (!ctx) return;
  
  if (revenueChart) revenueChart.destroy();
  
  // Load Chart.js dynamically
  if (!window.Chart) {
    await import('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js');
  }
  
  revenueChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Revenue',
        data: amounts,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Load client revenue report
function loadClientRevenueReport(invoices) {
  const clientRevenue = {};
  
  invoices
    .filter(inv => inv.status === 'paid')
    .forEach(inv => {
      const clientId = inv.client_id;
      const clientName = inv.client?.full_name || inv.client?.email || 'Unknown';
      
      if (!clientRevenue[clientId]) {
        clientRevenue[clientId] = {
          name: clientName,
          revenue: 0,
          count: 0
        };
      }
      
      clientRevenue[clientId].revenue += Number(inv.total_amount || 0);
      clientRevenue[clientId].count += 1;
    });
  
  const sorted = Object.values(clientRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  const tbody = document.getElementById('client-revenue-table');
  if (!tbody) return;
  
  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No revenue data</td></tr>';
    return;
  }
  
  tbody.innerHTML = sorted.map(client => `
    <tr class="border-b border-nfgray dark:border-gray-700">
      <td class="px-4 py-3">${escapeHtml(client.name)}</td>
      <td class="px-4 py-3 text-right font-medium">${formatCurrency(client.revenue)}</td>
      <td class="px-4 py-3 text-right text-gray-500 dark:text-gray-400">${client.count}</td>
    </tr>
  `).join('');
}

// Load outstanding invoices report
function loadOutstandingInvoicesReport(invoices) {
  const outstanding = invoices
    .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled' && (inv.balance_due > 0 || inv.total_amount > 0))
    .map(inv => {
      const dueDate = new Date(inv.due_date);
      const today = new Date();
      const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
      
      return {
        ...inv,
        daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        balance: Number(inv.balance_due || inv.total_amount || 0)
      };
    })
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
    .slice(0, 20);
  
  const tbody = document.getElementById('outstanding-invoices-table');
  if (!tbody) return;
  
  if (outstanding.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No outstanding invoices</td></tr>';
    return;
  }
  
  tbody.innerHTML = outstanding.map(inv => `
    <tr class="border-b border-nfgray dark:border-gray-700">
      <td class="px-4 py-3">${escapeHtml(inv.invoice_number || '—')}</td>
      <td class="px-4 py-3">${escapeHtml(inv.client?.full_name || inv.client?.email || '—')}</td>
      <td class="px-4 py-3 text-right font-medium">${formatCurrency(inv.balance)}</td>
      <td class="px-4 py-3 text-right">${new Date(inv.due_date).toLocaleDateString()}</td>
      <td class="px-4 py-3">
        <span class="px-2 py-1 rounded-full text-xs font-medium ${inv.daysOverdue > 90 ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' : inv.daysOverdue > 60 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'}">
          ${inv.daysOverdue} days
        </span>
      </td>
    </tr>
  `).join('');
}

// Load aging report
function loadAgingReport(invoices) {
  const outstanding = invoices.filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled');
  const today = new Date();
  
  let current = 0;
  let days31_60 = 0;
  let days61_90 = 0;
  let over90 = 0;
  
  outstanding.forEach(inv => {
    const dueDate = new Date(inv.due_date);
    const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));
    const balance = Number(inv.balance_due || inv.total_amount || 0);
    
    if (daysOverdue <= 30) {
      current += balance;
    } else if (daysOverdue <= 60) {
      days31_60 += balance;
    } else if (daysOverdue <= 90) {
      days61_90 += balance;
    } else {
      over90 += balance;
    }
  });
  
  document.getElementById('aging-current').textContent = formatCurrency(current);
  document.getElementById('aging-31-60').textContent = formatCurrency(days31_60);
  document.getElementById('aging-61-90').textContent = formatCurrency(days61_90);
  document.getElementById('aging-over-90').textContent = formatCurrency(over90);
}

// Load payment history report
function loadPaymentHistoryReport(payments) {
  const recentPayments = payments.slice(0, 50);
  
  const tbody = document.getElementById('payment-history-table');
  if (!tbody) return;
  
  if (recentPayments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No payments found</td></tr>';
    return;
  }
  
  tbody.innerHTML = recentPayments.map(payment => `
    <tr class="border-b border-nfgray dark:border-gray-700">
      <td class="px-4 py-3">${new Date(payment.payment_date).toLocaleDateString()}</td>
      <td class="px-4 py-3">${escapeHtml(payment.invoice?.invoice_number || '—')}</td>
      <td class="px-4 py-3">${escapeHtml(payment.invoice?.client?.full_name || payment.invoice?.client?.email || '—')}</td>
      <td class="px-4 py-3 text-right font-medium">${formatCurrency(Number(payment.amount || 0))}</td>
      <td class="px-4 py-3">${escapeHtml(payment.payment_method || '—')}</td>
    </tr>
  `).join('');
}

// Export functions (stubs - can be enhanced)
window.exportRevenueReport = function() {
  toast.info('Revenue report export coming soon', 'Export');
};

window.exportClientRevenueReport = function() {
  toast.info('Client revenue report export coming soon', 'Export');
};

window.exportOutstandingReport = function() {
  toast.info('Outstanding invoices report export coming soon', 'Export');
};

window.exportAgingReport = function() {
  toast.info('Aging report export coming soon', 'Export');
};

window.exportPaymentHistoryReport = function() {
  toast.info('Payment history report export coming soon', 'Export');
};

// Attach report listeners
function attachReportListeners() {
  // Period selector
  const periodSelect = document.getElementById('report-period');
  const customRange = document.getElementById('custom-date-range');
  
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        customRange?.classList.remove('hidden');
      } else {
        customRange?.classList.add('hidden');
        loadFinancialReports();
      }
    });
  }
  
  // Custom date range inputs
  const dateFrom = document.getElementById('report-date-from');
  const dateTo = document.getElementById('report-date-to');
  
  if (dateFrom && dateTo) {
    dateFrom.addEventListener('change', loadFinancialReports);
    dateTo.addEventListener('change', loadFinancialReports);
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-reports');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadFinancialReports);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

