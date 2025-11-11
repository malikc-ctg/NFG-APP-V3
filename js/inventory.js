import { supabase } from './supabase.js';
import { toast, showConfirm } from './notifications.js';

let currentUser = null;
let currentUserProfile = null;
let currentFilter = 'all';
let currentSiteFilter = 'all';
let categories = [];
let inventory = [];
let sites = [];

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user;
  
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    currentUserProfile = profile;
  }
  
  return user;
}

// Fetch categories
async function fetchCategories() {
  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('sort_order');
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  categories = data || [];
  return categories;
}

// Fetch inventory items
async function fetchInventoryItems() {
  const { data, error } = await supabase
    .from('inventory_with_categories')
    .select('*');
  
  if (error) {
    console.error('Error fetching inventory items:', error);
    return [];
  }
  
  return data || [];
}

// Fetch site inventory (with stock levels per site)
async function fetchSiteInventory() {
  const { data, error } = await supabase
    .from('site_inventory_status')
    .select('*');
  
  if (error) {
    console.error('Error fetching site inventory:', error);
    return [];
  }
  
  return data || [];
}

// Fetch sites
async function fetchSites() {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('name');
  
  if (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
  
  sites = data || [];
  return sites;
}

// Render inventory table
async function renderInventory() {
  const tableBody = document.getElementById('inventory-table-body');
  
  // Show skeleton loading first
  if (!tableBody.dataset.loaded) {
    try {
      const { createSkeletonTableRows, showSkeleton } = await import('./skeleton.js');
      showSkeleton(tableBody, createSkeletonTableRows(5, 5));
    } catch (error) {
      console.error('Error loading skeleton:', error);
    }
  }
  
  try {
    const siteInventory = await fetchSiteInventory();
    tableBody.dataset.loaded = 'true';
    
    // Update summary cards
    updateSummaryCards(siteInventory);
    
    // Update low stock alerts
    updateLowStockAlerts(siteInventory);
    
    // Filter by category
    let filtered = siteInventory;
    if (currentFilter !== 'all') {
      filtered = siteInventory.filter(item => item.category_name === currentFilter);
    }
    
    // Filter by site
    if (currentSiteFilter !== 'all') {
      filtered = filtered.filter(item => item.site_id == currentSiteFilter);
    }
    
    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <i data-lucide="package-x" class="w-12 h-12 mx-auto text-gray-300 mb-2"></i>
            <p>No inventory items found</p>
          </td>
        </tr>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    tableBody.innerHTML = filtered.map(item => {
      const statusConfig = {
        'out': { 
          color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', 
          icon: 'package-x', 
          text: 'Out of Stock',
          borderColor: 'border-red-200 dark:border-red-800'
        },
        'low': { 
          color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400', 
          icon: 'alert-triangle', 
          text: 'Low Stock',
          borderColor: 'border-orange-200 dark:border-orange-800'
        },
        'warning': { 
          color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', 
          icon: 'alert-circle', 
          text: 'Warning',
          borderColor: 'border-yellow-200 dark:border-yellow-800'
        },
        'ok': { 
          color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', 
          icon: 'check-circle', 
          text: 'In Stock',
          borderColor: 'border-green-200 dark:border-green-800'
        }
      };
      
      const status = statusConfig[item.stock_status] || statusConfig['ok'];
      const isLowStock = item.stock_status === 'low' || item.stock_status === 'out';
      const rowClass = isLowStock ? `hover:bg-nfglight/30 transition border-l-4 ${status.borderColor}` : 'hover:bg-nfglight/30 transition';
      
      const statusTooltips = {
        'out': 'Item is out of stock and needs to be restocked',
        'low': 'Item is running low and should be restocked soon',
        'warning': 'Item quantity is approaching low stock threshold',
        'ok': 'Item is in stock and quantity is sufficient'
      };
      
      return `
        <tr class="${rowClass}">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <i data-lucide="${item.category_icon || 'package'}" class="w-5 h-5 text-nfgblue dark:text-blue-400"></i>
              <div>
                <div class="font-medium text-nfgblue dark:text-blue-400">${item.item_name}</div>
                <div class="text-xs text-gray-500 md:hidden dark:text-gray-400">${item.category_name}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">${item.site_name}</div>
                ${item.quantity < item.low_stock_threshold ? `<div class="text-xs text-orange-600 dark:text-orange-400 mt-0.5">Threshold: ${item.low_stock_threshold} ${item.unit}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-sm hidden md:table-cell">${item.category_name}</td>
          <td class="px-4 py-3 text-center">
            <div class="font-semibold text-nfgblue dark:text-blue-400 ${isLowStock ? 'text-lg' : ''}">${item.quantity}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${item.unit}</div>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${status.color} tooltip-wrapper" data-tooltip="${statusTooltips[item.stock_status] || statusTooltips['ok']}" data-tooltip-position="left">
              <i data-lucide="${status.icon}" class="w-3 h-3"></i>
              <span class="hidden sm:inline">${status.text}</span>
            </span>
          </td>
          <td class="px-4 py-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button onclick="manageStock(${item.site_id}, ${item.item_id}, '${item.item_name.replace(/'/g, "\\'")}', ${item.quantity})" 
                      class="p-1.5 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700 text-nfgblue dark:text-blue-400 transition" data-tooltip="Manage stock levels for this item" data-tooltip-position="top">
                <i data-lucide="package" class="w-4 h-4"></i>
              </button>
              <button onclick="viewHistory(${item.item_id}, ${item.site_id}, '${item.item_name.replace(/'/g, "\\'")}', '${item.site_name.replace(/'/g, "\\'")})" 
                      class="p-1.5 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700 text-nfgblue dark:text-blue-400 transition" data-tooltip="View transaction history for this item" data-tooltip-position="top">
                <i data-lucide="history" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
    
    // Initialize tooltips
    try {
      const { initTooltips } = await import('./tooltips.js');
      initTooltips();
    } catch (error) {
      console.error('Error initializing tooltips:', error);
    }
  } catch (error) {
    console.error('Error rendering inventory:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="px-4 py-8 text-center text-red-500">
          Error loading inventory. Please refresh the page.
        </td>
      </tr>
    `;
  }
}

// Update summary cards
function updateSummaryCards(siteInventory) {
  const totalItems = siteInventory.length;
  const lowStockCount = siteInventory.filter(item => item.stock_status === 'low').length;
  const outOfStockCount = siteInventory.filter(item => item.stock_status === 'out').length;
  const uniqueSites = new Set(siteInventory.map(item => item.site_id)).size;
  
  document.getElementById('total-items-count').textContent = totalItems;
  document.getElementById('low-stock-summary-count').textContent = lowStockCount;
  document.getElementById('out-of-stock-count').textContent = outOfStockCount;
  document.getElementById('active-sites-count').textContent = uniqueSites;
}

// Update low stock alerts banner
function updateLowStockAlerts(siteInventory) {
  const lowStockItems = siteInventory.filter(item => 
    item.stock_status === 'low' || item.stock_status === 'out'
  );
  
  const alertBanner = document.getElementById('low-stock-alerts');
  const lowStockCount = document.getElementById('low-stock-count');
  const lowStockList = document.getElementById('low-stock-items-list');
  
  if (lowStockItems.length === 0) {
    alertBanner.classList.add('hidden');
    return;
  }
  
  // Check if user dismissed the alert
  const dismissed = localStorage.getItem('inventory-low-stock-dismissed');
  if (dismissed) {
    const dismissedTime = parseInt(dismissed);
    const now = Date.now();
    // Show again after 1 hour
    if (now - dismissedTime < 3600000) {
      alertBanner.classList.add('hidden');
      return;
    } else {
      localStorage.removeItem('inventory-low-stock-dismissed');
    }
  }
  
  lowStockCount.textContent = lowStockItems.length;
  
  // Show top 5 low stock items
  const topItems = lowStockItems.slice(0, 5);
  lowStockList.innerHTML = topItems.map(item => {
    const statusBadge = item.stock_status === 'out' 
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    return `
      <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${statusBadge}">
        ${item.item_name} (${item.quantity} ${item.unit}) - ${item.site_name}
      </span>
    `;
  }).join('');
  
  if (lowStockItems.length > 5) {
    lowStockList.innerHTML += `<span class="text-xs text-orange-600 dark:text-orange-400">+${lowStockItems.length - 5} more</span>`;
  }
  
  alertBanner.classList.remove('hidden');
  if (window.lucide) lucide.createIcons();
}

// Dismiss low stock alert
document.getElementById('dismiss-low-stock-alert')?.addEventListener('click', () => {
  document.getElementById('low-stock-alerts').classList.add('hidden');
  localStorage.setItem('inventory-low-stock-dismissed', Date.now().toString());
});

// Manage stock (open modal)
window.manageStock = function(siteId, itemId, itemName, currentQty) {
  document.getElementById('stock-site-id').value = siteId;
  document.getElementById('stock-item-id').value = itemId;
  document.getElementById('stock-item-name').textContent = itemName;
  document.getElementById('stock-current-qty').textContent = currentQty;
  document.getElementById('stock-quantity').value = '';
  document.getElementById('stock-notes').value = '';
  document.getElementById('stock-action').value = 'restock';
  
  const modal = document.getElementById('stockModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
};

// Store current history data for filtering and export
let currentHistoryData = [];
let currentHistoryItemId = null;
let currentHistorySiteId = null;
let currentHistoryItemName = null;
let currentHistorySiteName = null;

// View transaction history
window.viewHistory = async function(itemId, siteId, itemName, siteName) {
  currentHistoryItemId = itemId;
  currentHistorySiteId = siteId;
  currentHistoryItemName = itemName;
  currentHistorySiteName = siteName;
  
  document.getElementById('history-item-name').textContent = itemName;
  document.getElementById('history-site-name').textContent = siteName;
  
  // Reset filters
  document.getElementById('history-filter-type').value = 'all';
  document.getElementById('history-filter-date-from').value = '';
  document.getElementById('history-filter-date-to').value = '';
  
  await loadHistoryTransactions();
  
  const modal = document.getElementById('historyModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
};

// Load history transactions with filters
async function loadHistoryTransactions() {
  try {
    let query = supabase
      .from('recent_inventory_activity')
      .select('*')
      .eq('item_id', currentHistoryItemId)
      .eq('site_id', currentHistorySiteId);
    
    // Apply transaction type filter
    const typeFilter = document.getElementById('history-filter-type').value;
    if (typeFilter !== 'all') {
      query = query.eq('transaction_type', typeFilter);
    }
    
    // Apply date filters
    const dateFrom = document.getElementById('history-filter-date-from').value;
    const dateTo = document.getElementById('history-filter-date-to').value;
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom + 'T00:00:00');
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59');
    }
    
    query = query.order('created_at', { ascending: false }).limit(100);
    
    const { data: transactions, error } = await query;
    
    if (error) {
      console.error('Error fetching history:', error);
      toast.error('Failed to load transaction history', 'Error');
      return;
    }
    
    currentHistoryData = transactions || [];
    renderHistoryList(currentHistoryData);
  } catch (error) {
    console.error('Error loading history:', error);
    toast.error('Failed to load transaction history', 'Error');
  }
}

// Render history list
function renderHistoryList(transactions) {
  const historyList = document.getElementById('history-list');
  
  if (!transactions || transactions.length === 0) {
    historyList.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">No transaction history found</p>';
    if (window.lucide) lucide.createIcons();
    return;
  }
  
  historyList.innerHTML = transactions.map(t => {
    const typeConfig = {
      'restock': { icon: 'plus', color: 'text-green-600 dark:text-green-400', label: 'Restocked', bgColor: 'bg-green-50 dark:bg-green-900/20' },
      'use': { icon: 'minus', color: 'text-red-600 dark:text-red-400', label: 'Used', bgColor: 'bg-red-50 dark:bg-red-900/20' },
      'adjustment': { icon: 'settings', color: 'text-blue-600 dark:text-blue-400', label: 'Adjusted', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
      'transfer': { icon: 'arrow-right-left', color: 'text-purple-600 dark:text-purple-400', label: 'Transferred', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
      'return': { icon: 'corner-up-left', color: 'text-orange-600 dark:text-orange-400', label: 'Returned', bgColor: 'bg-orange-50 dark:bg-orange-900/20' }
    };
    
    const config = typeConfig[t.transaction_type] || typeConfig['adjustment'];
    const date = new Date(t.created_at).toLocaleString();
    const changeText = t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change;
    
    return `
      <div class="border border-nfgray dark:border-gray-700 rounded-xl p-4 ${config.bgColor}">
        <div class="flex items-start justify-between mb-2">
          <div class="flex items-center gap-2">
            <i data-lucide="${config.icon}" class="w-5 h-5 ${config.color}"></i>
            <div>
              <div class="font-medium ${config.color}">${config.label}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">${date}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="font-semibold ${t.quantity_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">${changeText} ${t.unit}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">${t.quantity_before} → ${t.quantity_after}</div>
          </div>
        </div>
        ${t.user_name ? `<div class="text-xs text-gray-600 dark:text-gray-400 mb-1">User: ${t.user_name}</div>` : ''}
        ${t.job_title ? `<div class="text-xs text-gray-600 dark:text-gray-400 mb-1">Job: ${t.job_title}</div>` : ''}
        ${t.notes ? `<div class="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-nfgray dark:border-gray-700">${t.notes}</div>` : ''}
      </div>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Apply history filters
document.getElementById('apply-history-filters')?.addEventListener('click', async () => {
  await loadHistoryTransactions();
});

// Export history to CSV
document.getElementById('export-history-btn')?.addEventListener('click', () => {
  if (!currentHistoryData || currentHistoryData.length === 0) {
    toast.error('No history data to export', 'Error');
    return;
  }
  
  // Create CSV content
  const headers = ['Date', 'Type', 'Quantity Change', 'Quantity Before', 'Quantity After', 'Unit', 'User', 'Job', 'Notes'];
  const rows = currentHistoryData.map(t => {
    const date = new Date(t.created_at).toLocaleString();
    const changeText = t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change;
    return [
      date,
      t.transaction_type,
      changeText,
      t.quantity_before,
      t.quantity_after,
      t.unit || '',
      t.user_name || '',
      t.job_title || '',
      (t.notes || '').replace(/"/g, '""') // Escape quotes in CSV
    ];
  });
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `inventory-history-${currentHistoryItemName}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success('History exported to CSV', 'Success');
});

// Handle stock form submission
document.getElementById('stock-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const siteId = parseInt(formData.get('site_id'));
  const itemId = parseInt(formData.get('item_id'));
  const action = formData.get('transaction_type');
  const quantity = parseInt(formData.get('quantity'));
  const notes = formData.get('notes');
  
  try {
    // Get current stock
    const { data: currentStock, error: fetchError } = await supabase
      .from('site_inventory')
      .select('quantity')
      .eq('site_id', siteId)
      .eq('item_id', itemId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }
    
    const currentQty = currentStock?.quantity || 0;
    let newQty = currentQty;
    let quantityChange = 0;
    
    // Calculate new quantity based on action
    if (action === 'restock') {
      newQty = currentQty + quantity;
      quantityChange = quantity;
    } else if (action === 'use') {
      newQty = Math.max(0, currentQty - quantity);
      quantityChange = -quantity;
    } else if (action === 'adjustment') {
      newQty = quantity;
      quantityChange = quantity - currentQty;
    }
    
    // Update or insert site inventory
    const { error: upsertError } = await supabase
      .from('site_inventory')
      .upsert({
        site_id: siteId,
        item_id: itemId,
        quantity: newQty,
        updated_at: new Date().toISOString(),
        ...(action === 'restock' ? { last_restocked_at: new Date().toISOString() } : {})
      }, {
        onConflict: 'site_id,item_id'
      });
    
    if (upsertError) throw upsertError;
    
    // Record transaction
    const { error: transactionError } = await supabase
      .from('inventory_transactions')
      .insert({
        item_id: itemId,
        site_id: siteId,
        transaction_type: action,
        quantity_change: quantityChange,
        quantity_before: currentQty,
        quantity_after: newQty,
        user_id: currentUser.id,
        notes: notes || null
      });
    
    if (transactionError) throw transactionError;
    
    // Close modal and refresh
    document.getElementById('stockModal').classList.add('hidden');
    document.getElementById('stockModal').classList.remove('flex');
    e.target.reset();
    
    await renderInventory();
    toast.success('Stock updated successfully!', 'Success');
    
  } catch (error) {
    console.error('Error updating stock:', error);
    document.getElementById('stock-form-error').textContent = 'Failed to update stock: ' + error.message;
    document.getElementById('stock-form-error').classList.remove('hidden');
  }
});

// Handle add item button
document.getElementById('add-item-btn')?.addEventListener('click', async () => {
  document.getElementById('modal-title').textContent = 'Add Item';
  document.getElementById('item-id').value = '';
  document.getElementById('item-name').value = '';
  document.getElementById('item-category').value = '';
  document.getElementById('item-unit').value = 'pieces';
  document.getElementById('item-threshold').value = '5';
  document.getElementById('item-reorder').value = '20';
  document.getElementById('item-notes').value = '';
  
  // Load categories
  await loadCategoryDropdown();
  
  const modal = document.getElementById('itemModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
});

// Load category dropdown
async function loadCategoryDropdown() {
  const select = document.getElementById('item-category');
  const cats = await fetchCategories();
  
  select.innerHTML = '<option value="">Select category</option>' + 
    cats.map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`).join('');
}

// Handle item form submission
document.getElementById('item-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  
  const itemData = {
    name: formData.get('name'),
    category_id: parseInt(formData.get('category_id')),
    unit: formData.get('unit'),
    low_stock_threshold: parseInt(formData.get('low_stock_threshold')),
    reorder_quantity: parseInt(formData.get('reorder_quantity')),
    notes: formData.get('notes') || null,
    created_by: currentUser.id
  };
  
  try {
    const { error } = await supabase
      .from('inventory_items')
      .insert(itemData);
    
    if (error) throw error;
    
    // Close modal and refresh
    document.getElementById('itemModal').classList.add('hidden');
    document.getElementById('itemModal').classList.remove('flex');
    e.target.reset();
    
    await renderInventory();
    toast.success('Item added successfully!', 'Success');
    
  } catch (error) {
    console.error('Error adding item:', error);
    document.getElementById('item-form-error').textContent = 'Failed to add item: ' + error.message;
    document.getElementById('item-form-error').classList.remove('hidden');
  }
});

// Category filter tabs
document.querySelectorAll('.inventory-filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    currentFilter = tab.dataset.category;
    
    // Update active tab
    document.querySelectorAll('.inventory-filter-tab').forEach(t => {
      t.classList.remove('text-nfgblue', 'border-nfgblue');
      t.classList.add('text-gray-500', 'border-transparent');
    });
    tab.classList.remove('text-gray-500', 'border-transparent');
    tab.classList.add('text-nfgblue', 'border-nfgblue');
    
    renderInventory();
  });
});

// Site filter
document.getElementById('site-filter')?.addEventListener('change', (e) => {
  currentSiteFilter = e.target.value;
  renderInventory();
});

// Load site filter dropdown
async function loadSiteFilter() {
  const select = document.getElementById('site-filter');
  const sitesList = await fetchSites();
  
  select.innerHTML = '<option value="all">All Sites</option>' + 
    sitesList.map(site => `<option value="${site.id}">${site.name}</option>`).join('');
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = './index.html';
});

// Initialize
async function init() {
  console.log('[Inventory] Initializing inventory page...');
  
  await getCurrentUser();
  if (!currentUser) {
    window.location.href = './index.html';
    return;
  }
  
  // Hide certain navigation for staff
  if (currentUserProfile && currentUserProfile.role === 'staff') {
    const bookingsNav = document.getElementById('nav-bookings');
    const reportsNav = document.getElementById('nav-reports');
    if (bookingsNav) bookingsNav.style.display = 'none';
    if (reportsNav) reportsNav.style.display = 'none';
  }
  
  await loadSiteFilter();
  await renderInventory();
  
  console.log('[Inventory] Initialization complete');
}

init();

