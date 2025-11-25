import { supabase } from './supabase.js';
import { toast, showConfirm } from './notifications.js';

let currentUser = null;
let currentUserProfile = null;
let currentFilter = 'all';
let currentSiteFilter = 'all';
let categories = [];
let inventory = [];
let sites = [];
let selectedInventory = new Set(); // Track selected inventory item IDs (site_id + item_id combination)
let allInventory = []; // Store all inventory items for selection tracking
let suppliersList = [];
let purchaseOrdersList = [];
let inventoryItemsCache = [];
let suppliersViewInitialized = false;
let transfersViewInitialized = false;
let transfersList = [];
let allTransfersCache = [];
let poItemRowId = 0;
let supplierPerformance = {};
let usageTrends = {};
const USAGE_TREND_WINDOW_DAYS = 60;
const PO_DOCUMENTS_BUCKET = 'purchase-order-docs';
let currentPODetailId = null;
let poPaymentsCache = [];
let poDocumentsCache = [];
function sanitizeText(value) {
  if (!value) return '';
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char] || char;
  });
}

function formatCurrency(amount) {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

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

async function fetchUsageTrends(windowDays = USAGE_TREND_WINDOW_DAYS) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - windowDays);
    
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('item_id, transaction_type, quantity_change, created_at')
      .gte('created_at', since.toISOString())
      .in('transaction_type', ['use', 'adjustment']);
    
    if (error) throw error;
    
    const map = {};
    (data || []).forEach(entry => {
      if (!entry.item_id) return;
      if (!map[entry.item_id]) {
        map[entry.item_id] = { totalUsage: 0 };
      }
      const delta = entry.quantity_change || 0;
      if (entry.transaction_type === 'use') {
        map[entry.item_id].totalUsage += Math.abs(delta);
      } else if (entry.transaction_type === 'adjustment' && delta < 0) {
        map[entry.item_id].totalUsage += Math.abs(delta);
      }
    });
    
    usageTrends = {};
    Object.entries(map).forEach(([itemId, stats]) => {
      usageTrends[itemId] = {
        avgDailyUsage: (stats.totalUsage || 0) / windowDays,
        windowDays
      };
    });
    
    updatePOItemSuggestions();
  } catch (error) {
    console.error('Failed to load usage trends:', error);
  }
}

// Fetch site inventory (with stock levels per site)
async function fetchSiteInventory() {
  const viewResult = await supabase
    .from('site_inventory_status')
    .select('*');
  
  if (!viewResult.error && Array.isArray(viewResult.data)) {
    return viewResult.data;
  }
  
  console.warn('[Inventory] site_inventory_status view unavailable, falling back to joined query.', viewResult.error);
  
  try {
    const { data, error } = await supabase
      .from('site_inventory')
      .select(`
        id,
        site_id,
        item_id,
        quantity,
        unit_cost,
        location_notes,
        last_restocked_at,
        updated_at,
        sites:sites(name),
        inventory_items:inventory_items(
          id,
          name,
          unit,
          low_stock_threshold,
          unit_cost,
          average_cost,
          last_purchase_cost,
          inventory_categories:inventory_categories(name, icon)
        )
      `);
    
    if (error) throw error;
    
    return (data || []).map(record => {
      const item = record.inventory_items || {};
      const category = item.inventory_categories || {};
      const threshold = item.low_stock_threshold ?? 0;
      const status = record.quantity === 0
        ? 'out'
        : record.quantity < threshold
          ? 'low'
          : record.quantity < threshold * 2
            ? 'warning'
            : 'ok';
      
      // Determine unit cost (site-specific cost, or item average cost, or item unit cost)
      const unitCost = record.unit_cost || item.average_cost || item.unit_cost || null;
      
      return {
        id: record.id,
        site_id: record.site_id,
        site_name: record.sites?.name || 'Unknown Site',
        item_id: record.item_id,
        item_name: item.name || 'Unknown Item',
        unit: item.unit || '',
        quantity: record.quantity || 0,
        unit_cost: unitCost,
        item_average_cost: item.average_cost,
        item_unit_cost: item.unit_cost,
        location_notes: record.location_notes,
        last_restocked_at: record.last_restocked_at,
        updated_at: record.updated_at,
        low_stock_threshold: threshold,
        category_name: category.name || 'Uncategorized',
        category_icon: category.icon || 'package',
        stock_status: status
      };
    });
  } catch (error) {
    console.error('Error fetching site inventory fallback:', error);
    return [];
  }
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
      console.warn('[Inventory] Skeleton module missing, continuing without skeleton loader.', error);
    }
  }
  
  try {
    const siteInventory = await fetchSiteInventory();
    allInventory = siteInventory; // Store all inventory for selection tracking
    window.allInventory = allInventory;
    window.selectedInventory = selectedInventory;
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
          <td colspan="7" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
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
      
      // Create unique key for inventory item (site_id + item_id)
      const itemKey = `${item.site_id}_${item.item_id}`;
      const isSelected = selectedInventory.has(itemKey);
      const isStaff = currentUserProfile && currentUserProfile.role === 'staff';
      const canBulkOperate = !isStaff && currentUserProfile && (currentUserProfile.role === 'admin' || currentUserProfile.role === 'client' || currentUserProfile.role === 'super_admin');
      
      return `
        <tr class="${rowClass} ${isSelected ? 'bg-nfglight/30 dark:bg-blue-900/20' : ''}">
          <td class="px-4 py-3">
            ${canBulkOperate ? `
              <input 
                type="checkbox" 
                class="inventory-checkbox w-4 h-4 text-nfgblue border-nfgray rounded focus:ring-nfgblue cursor-pointer" 
                data-item-key="${itemKey}"
                data-site-id="${item.site_id}"
                data-item-id="${item.item_id}"
                ${isSelected ? 'checked' : ''}
                aria-label="Select item ${item.item_name}"
              />
            ` : ''}
          </td>
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
          <td class="px-4 py-3 text-center hidden lg:table-cell">
            ${item.unit_cost ? `
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">${formatCurrency(item.unit_cost)}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">per ${item.unit}</div>
            ` : '<span class="text-xs text-gray-400 dark:text-gray-500">N/A</span>'}
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
              ${isLowStock && canBulkOperate ? `
                <button onclick="createPOFromLowStockItem(${item.item_id}, ${item.site_id}, ${item.reorder_quantity || item.low_stock_threshold * 4 || 20})" 
                        class="p-1.5 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700 text-green-600 dark:text-green-400 transition" data-tooltip="Create PO for this low stock item" data-tooltip-position="top">
                  <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    // Show/hide Select All checkbox based on role
    const selectAllContainer = document.getElementById('select-all-inventory-container');
    const isStaff = currentUserProfile && currentUserProfile.role === 'staff';
    if (selectAllContainer) {
      if (isStaff) {
        selectAllContainer.classList.add('hidden');
      } else {
        selectAllContainer.classList.remove('hidden');
      }
    }
    
    if (window.lucide) lucide.createIcons();
    
    // Attach checkbox listeners after rendering
    if (typeof window !== 'undefined' && window.attachInventoryCheckboxListeners) {
      window.attachInventoryCheckboxListeners();
    }
    
    // Update select all checkbox state
    if (typeof window !== 'undefined' && window.updateSelectAllInventoryCheckbox) {
      window.updateSelectAllInventoryCheckbox();
    }
  } catch (error) {
    console.error('Error rendering inventory:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-4 py-8 text-center text-red-500">
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
  
  // Calculate total inventory value
  const totalInventoryValue = siteInventory.reduce((total, item) => {
    const unitCost = item.unit_cost || 0;
    const quantity = item.quantity || 0;
    return total + (unitCost * quantity);
  }, 0);
  
  document.getElementById('total-items-count').textContent = totalItems;
  document.getElementById('low-stock-summary-count').textContent = lowStockCount;
  document.getElementById('out-of-stock-count').textContent = outOfStockCount;
  document.getElementById('active-sites-count').textContent = uniqueSites;
  
  // Update inventory value if element exists
  const inventoryValueEl = document.getElementById('total-inventory-value');
  if (inventoryValueEl) {
    inventoryValueEl.textContent = formatCurrency(totalInventoryValue);
  }
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

// Create PO from all low stock items
document.getElementById('create-po-from-low-stock-btn')?.addEventListener('click', async () => {
  await createPOFromLowStockItems();
});

// Load warehouse locations for a site
async function loadWarehouseLocations(siteId) {
  try {
    const { data, error } = await supabase
      .from('warehouse_locations')
      .select('*')
      .eq('site_id', siteId)
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading warehouse locations:', error);
    return [];
  }
}

// Populate warehouse location dropdown
async function populateWarehouseLocations(selectElement, siteId) {
  if (!selectElement) return;
  
  const locations = await loadWarehouseLocations(siteId);
  const currentValue = selectElement.value;
  
  selectElement.innerHTML = '<option value="">Select location</option>' +
    locations.map(loc => `<option value="${loc.id}">${sanitizeText(loc.name)}</option>`).join('');
  
  if (currentValue) {
    selectElement.value = currentValue;
  }
}

// Manage stock (open modal)
window.manageStock = async function(siteId, itemId, itemName, currentQty) {
  document.getElementById('stock-site-id').value = siteId;
  document.getElementById('stock-item-id').value = itemId;
  document.getElementById('stock-item-name').textContent = itemName;
  document.getElementById('stock-current-qty').textContent = currentQty;
  document.getElementById('stock-quantity').value = '';
  document.getElementById('stock-notes').value = '';
  document.getElementById('stock-action').value = 'restock';
  
  // Clear batch tracking fields
  document.getElementById('stock-batch-number').value = '';
  document.getElementById('stock-lot-number').value = '';
  document.getElementById('stock-expiration-date').value = '';
  document.getElementById('stock-manufactured-date').value = '';
  document.getElementById('stock-warehouse-location').value = '';
  document.getElementById('stock-bin-location').value = '';
  
  // Load warehouse locations
  await populateWarehouseLocations(document.getElementById('stock-warehouse-location'), siteId);
  
  // Update batch tracking visibility
  updateBatchTrackingVisibility();
  
  const modal = document.getElementById('stockModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
};

// Show/hide batch tracking section based on action
function updateBatchTrackingVisibility() {
  const action = document.getElementById('stock-action')?.value;
  const batchSection = document.getElementById('batch-tracking-section');
  if (batchSection) {
    if (action === 'restock') {
      batchSection.classList.remove('hidden');
    } else {
      batchSection.classList.add('hidden');
    }
  }
}

// Inventory history view state
let historyViewInitialized = false;
let historyViewData = [];
let historyFilters = {
  type: 'all',
  site: 'all',
  search: '',
  dateFrom: '',
  dateTo: ''
};
let historySearchTimeout = null;

function initInventoryViewTabs() {
  const tabs = document.querySelectorAll('.inventory-view-tab');
  const inventoryView = document.getElementById('inventory-view');
  const historyView = document.getElementById('history-view');
  const desktopHistoryActions = document.getElementById('history-inline-actions');
  const suppliersView = document.getElementById('suppliers-view');
  const suppliersActions = document.getElementById('suppliers-inline-actions');
  const transfersView = document.getElementById('transfers-view');
  
  if (!tabs.length || !inventoryView || !historyView) return;
  
  const defaultTab = document.querySelector('.inventory-view-tab[data-view="inventory"]');
  defaultTab?.classList.add('active-view-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', async () => {
      if (tab.classList.contains('active-view-tab')) return;
      
      const view = tab.dataset.view;
      if (view === 'suppliers' && currentUserProfile && currentUserProfile.role === 'staff') {
        toast.error('Supplier management is not available for staff accounts');
        return;
      }
      
      tabs.forEach(t => {
        t.classList.remove('active-view-tab', 'text-white', 'bg-nfgblue', 'shadow-nfg');
        t.classList.add('text-gray-600', 'dark:text-gray-300');
      });
      
      tab.classList.add('active-view-tab', 'text-white', 'bg-nfgblue', 'shadow-nfg');
      tab.classList.remove('text-gray-600', 'dark:text-gray-300');
      
      if (view === 'history') {
        inventoryView.classList.add('hidden');
        historyView.classList.remove('hidden');
        suppliersView?.classList.add('hidden');
        desktopHistoryActions?.classList.remove('hidden');
        suppliersActions?.classList.add('hidden');
        
        if (!historyViewInitialized) {
          await initHistoryView();
        }
      } else if (view === 'suppliers') {
        inventoryView.classList.add('hidden');
        historyView.classList.add('hidden');
        transfersView?.classList.add('hidden');
        suppliersView?.classList.remove('hidden');
        desktopHistoryActions?.classList.add('hidden');
        suppliersActions?.classList.remove('hidden');
        
        if (!suppliersViewInitialized) {
          await initSuppliersView();
        }
      } else if (view === 'transfers') {
        inventoryView.classList.add('hidden');
        historyView.classList.add('hidden');
        suppliersView?.classList.add('hidden');
        transfersView?.classList.remove('hidden');
        desktopHistoryActions?.classList.add('hidden');
        suppliersActions?.classList.add('hidden');
        
        if (!transfersViewInitialized) {
          await initTransfersView();
        }
      } else {
        historyView.classList.add('hidden');
        suppliersView?.classList.add('hidden');
        transfersView?.classList.add('hidden');
        inventoryView.classList.remove('hidden');
        desktopHistoryActions?.classList.add('hidden');
        suppliersActions?.classList.add('hidden');
      }
    });
  });
}

async function initHistoryView() {
  await populateHistorySiteFilter();
  attachHistoryFilterListeners();
  await loadHistoryActivity(true);
  historyViewInitialized = true;
}

async function populateHistorySiteFilter() {
  const select = document.getElementById('history-site-filter');
  if (!select) return;
  
  select.innerHTML = '<option value="all">All Sites</option>';
  
  const sitesList = await fetchSites();
  select.innerHTML += sitesList.map(site => `<option value="${site.id}">${site.name}</option>`).join('');
}

function attachHistoryFilterListeners() {
  const typeSelect = document.getElementById('history-type-filter');
  const siteSelect = document.getElementById('history-site-filter');
  const searchInput = document.getElementById('history-search-input');
  const dateFromInput = document.getElementById('history-date-from');
  const dateToInput = document.getElementById('history-date-to');
  const applyBtn = document.getElementById('history-apply-filters');
  const clearBtn = document.getElementById('history-clear-filters');
  const refreshBtns = [
    document.getElementById('history-refresh-btn'),
    document.getElementById('history-refresh-btn-mobile')
  ].filter(Boolean);
  const exportBtns = [
    document.getElementById('history-export-btn'),
    document.getElementById('history-export-btn-mobile')
  ].filter(Boolean);
  
  typeSelect?.addEventListener('change', () => {
    historyFilters.type = typeSelect.value;
  });
  
  siteSelect?.addEventListener('change', () => {
    historyFilters.site = siteSelect.value;
  });
  
  searchInput?.addEventListener('input', () => {
    if (historySearchTimeout) clearTimeout(historySearchTimeout);
    historySearchTimeout = setTimeout(() => {
      historyFilters.search = searchInput.value.trim();
    }, 300);
  });
  
  dateFromInput?.addEventListener('change', () => {
    historyFilters.dateFrom = dateFromInput.value;
  });
  
  dateToInput?.addEventListener('change', () => {
    historyFilters.dateTo = dateToInput.value;
  });
  
  applyBtn?.addEventListener('click', async () => {
    historyFilters.search = searchInput?.value.trim() || '';
    await loadHistoryActivity();
  });
  
  clearBtn?.addEventListener('click', async () => {
    if (typeSelect) typeSelect.value = 'all';
    if (siteSelect) siteSelect.value = 'all';
    if (searchInput) searchInput.value = '';
    if (dateFromInput) dateFromInput.value = '';
    if (dateToInput) dateToInput.value = '';
    
    historyFilters = {
      type: 'all',
      site: 'all',
      search: '',
      dateFrom: '',
      dateTo: ''
    };
    
    await loadHistoryActivity();
  });
  
  refreshBtns.forEach(btn => btn.addEventListener('click', () => loadHistoryActivity(true)));
  exportBtns.forEach(btn => btn.addEventListener('click', exportHistoryViewData));
}

async function loadHistoryActivity(showToast = false) {
  const tableBody = document.getElementById('history-table-body');
  if (!tableBody) return;
  
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Loading history...</td>
    </tr>
  `;
  
  try {
    const siteFilter = historyFilters.site !== 'all' ? parseInt(historyFilters.site, 10) : null;
    const transactions = await fetchInventoryTransactions({
      type: historyFilters.type !== 'all' ? historyFilters.type : null,
      siteId: Number.isNaN(siteFilter) ? null : siteFilter,
      dateFrom: historyFilters.dateFrom || null,
      dateTo: historyFilters.dateTo || null,
      limit: 300
    });
    
    const searchTerm = historyFilters.search.trim().toLowerCase();
    historyViewData = searchTerm
      ? transactions.filter(entry => {
          const haystack = [
            entry.item_name,
            entry.site_name,
            entry.user_name,
            entry.notes || ''
          ].join(' ').toLowerCase();
          return haystack.includes(searchTerm);
        })
      : transactions;
    
    renderHistoryTable();
    updateHistorySummaryCards();
    
    if (showToast) {
      toast.success('History refreshed', 'Success');
    }
  } catch (error) {
    console.error('Error loading inventory history:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-red-500">Failed to load history. Please try again.</td>
      </tr>
    `;
    toast.error('Failed to load inventory history', 'Error');
  }
}

function renderHistoryTable() {
  const tableBody = document.getElementById('history-table-body');
  if (!tableBody) return;
  
  if (!historyViewData.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No transactions found for the selected filters</td>
      </tr>
    `;
    return;
  }
  
  const typeConfig = {
    'restock': { icon: 'plus', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', label: 'Restocked' },
    'use': { icon: 'minus', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', label: 'Used' },
    'adjustment': { icon: 'settings', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', label: 'Adjusted' },
    'transfer': { icon: 'arrow-right-left', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20', label: 'Transferred' },
    'return': { icon: 'corner-up-left', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', label: 'Returned' }
  };
  
  tableBody.innerHTML = historyViewData.map(entry => {
    const config = typeConfig[entry.transaction_type] || typeConfig['adjustment'];
    const date = new Date(entry.created_at).toLocaleString();
    const changeText = entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change;
    const notes = entry.notes ? entry.notes : '—';
    const user = entry.user_name || 'System';
    
    return `
      <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
        <td class="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">${date}</td>
        <td class="px-4 py-3 text-sm text-nfgblue dark:text-blue-300">
          <div class="font-medium">${entry.item_name}</div>
          <div class="text-xs text-gray-500">${entry.unit || ''}</div>
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${entry.site_name || '—'}</td>
        <td class="px-4 py-3 text-sm">
          <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${config.bg}">
            <i data-lucide="${config.icon}" class="w-3.5 h-3.5 ${config.text}"></i>
            <span class="${config.text}">${config.label}</span>
          </span>
        </td>
        <td class="px-4 py-3 text-center font-semibold ${entry.quantity_change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
          ${changeText}
        </td>
        <td class="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-300">${entry.quantity_before} → ${entry.quantity_after}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${user}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${notes}</td>
      </tr>
    `;
  }).join('');
  
  if (window.lucide) window.lucide.createIcons();
}

function updateHistorySummaryCards() {
  const total = historyViewData.length;
  const restock = historyViewData.filter(entry => entry.transaction_type === 'restock').length;
  const use = historyViewData.filter(entry => entry.transaction_type === 'use').length;
  const adjustment = historyViewData.filter(entry => entry.transaction_type === 'adjustment').length;
  
  document.getElementById('history-total-count').textContent = total;
  document.getElementById('history-restock-count').textContent = restock;
  document.getElementById('history-use-count').textContent = use;
  document.getElementById('history-adjustment-count').textContent = adjustment;
}

function exportHistoryViewData() {
  if (!historyViewData.length) {
    toast.error('No history data to export', 'Error');
    return;
  }
  
  const headers = ['Date', 'Item', 'Site', 'Type', 'Change', 'Before', 'After', 'Performed By', 'Notes'];
  const rows = historyViewData.map(entry => [
    new Date(entry.created_at).toLocaleString(),
    entry.item_name,
    entry.site_name || '',
    entry.transaction_type,
    entry.quantity_change,
    entry.quantity_before,
    entry.quantity_after,
    entry.user_name || 'System',
    entry.notes || ''
  ]);
  
  const csvContent = [headers.join(','), ...rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `inventory-history-view-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success('Inventory history exported', 'Success');
}

// ===== Supplier Management & Purchase Orders =====

function getSupplierPerformance(supplierId) {
  return supplierPerformance[supplierId] || null;
}

function getSupplierLeadTimeDays(supplierId) {
  if (!supplierId) return 14;
  const stats = getSupplierPerformance(supplierId);
  if (stats?.avgLeadTimeDays && Number.isFinite(stats.avgLeadTimeDays)) {
    return Math.max(1, Math.round(stats.avgLeadTimeDays));
  }
  return 14;
}

function getSuggestedQuantityForItem(itemId, leadTimeDays) {
  if (!itemId || !usageTrends[itemId]) return null;
  const avgDaily = usageTrends[itemId].avgDailyUsage || 0;
  if (!avgDaily) return null;
  const suggestion = Math.ceil(avgDaily * (leadTimeDays || 14));
  return suggestion > 0 ? suggestion : null;
}

function updatePOItemSuggestions() {
  const table = document.getElementById('po-items-table');
  if (!table) return;
  const supplierId = parseInt(document.getElementById('po-supplier')?.value, 10);
  const leadTimeDays = getSupplierLeadTimeDays(supplierId);
  const rows = table.querySelectorAll('tr[data-row-id]');
  rows.forEach(row => {
    const suggestionEl = row.querySelector('.po-item-suggestion');
    const applyBtn = row.querySelector('.po-apply-suggestion');
    if (!suggestionEl) return;
    const itemId = parseInt(row.querySelector('.po-item-select')?.value, 10);
    const suggestion = getSuggestedQuantityForItem(itemId, leadTimeDays);
    if (suggestion) {
      suggestionEl.innerHTML = `Suggested: <span class="font-semibold text-nfgblue">${suggestion}</span> (based on ${USAGE_TREND_WINDOW_DAYS}d usage)`;
      suggestionEl.dataset.suggestedValue = String(suggestion);
      applyBtn?.classList.remove('hidden');
    } else {
      suggestionEl.textContent = 'Suggested: N/A';
      suggestionEl.dataset.suggestedValue = '';
      applyBtn?.classList.add('hidden');
    }
  });
}

async function initSuppliersView() {
  if (suppliersViewInitialized) return;
  await Promise.all([loadSuppliers(), loadPurchaseOrders()]);
  await populatePOSiteOptions();
  suppliersViewInitialized = true;
}

async function initTransfersView() {
  if (transfersViewInitialized) return;
  await loadTransfers();
  attachTransferListeners();
  transfersViewInitialized = true;
}

async function populatePOSiteOptions() {
  const siteSelect = document.getElementById('po-site');
  if (!siteSelect) return;
  
  if (!sites.length) {
    await fetchSites();
  }
  
  siteSelect.innerHTML = '<option value="">Select site</option>' + 
    sites.map(site => `<option value="${site.id}">${sanitizeText(site.name)}</option>`).join('');
}

async function ensureInventoryItemsCache() {
  if (!inventoryItemsCache.length) {
    inventoryItemsCache = await fetchInventoryItems();
  }
  return inventoryItemsCache;
}

async function loadSuppliers(showToast = false) {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    
    if (error) throw error;
    
    suppliersList = data || [];
    calculateSupplierPerformance();
    renderSuppliersList();
    populateSupplierFilters();
    
    if (showToast) {
      toast.success('Suppliers refreshed', 'Success');
    }
  } catch (error) {
    console.error('Failed to load suppliers:', error);
    toast.error('Failed to load suppliers', 'Error');
  }
}

function renderSuppliersList() {
  const container = document.getElementById('suppliers-list');
  if (!container) return;
  
  if (!suppliersList.length) {
    container.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-8">No suppliers yet. Click "Add Supplier" to get started.</p>';
    return;
  }
  
  container.innerHTML = suppliersList.map(supplier => {
    const statusBadge = supplier.is_active
      ? '<span class="inline-flex items-center px-2 py-1 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-medium">Active</span>'
      : '<span class="inline-flex items-center px-2 py-1 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs font-medium">Inactive</span>';
    
    const perf = getSupplierPerformance(supplier.id);
    const perfHtml = perf
      ? `
        <div class="grid grid-cols-2 gap-2 mt-3 text-[11px] text-gray-600 dark:text-gray-400">
          <div>Avg Lead: <span class="font-semibold text-nfgblue dark:text-blue-300">${perf.avgLeadTimeDays ? perf.avgLeadTimeDays.toFixed(1) + 'd' : '—'}</span></div>
          <div>Fill Rate: <span class="font-semibold text-nfgblue dark:text-blue-300">${perf.fillRatePercent ? perf.fillRatePercent.toFixed(0) + '%' : '—'}</span></div>
          <div>On-Time: <span class="font-semibold text-nfgblue dark:text-blue-300">${perf.onTimePercent ? perf.onTimePercent.toFixed(0) + '%' : '—'}</span></div>
          <div>Last Delivery: <span class="font-semibold text-nfgblue dark:text-blue-300">${perf.lastDeliveryDate ? perf.lastDeliveryDate.toLocaleDateString() : '—'}</span></div>
        </div>
      `
      : '<p class="text-xs text-gray-400 mt-2">No completed deliveries yet</p>';
    
    return `
      <div class="py-3 first:pt-0 last:pb-0">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold text-nfgblue dark:text-blue-400">${sanitizeText(supplier.name)}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${sanitizeText(supplier.contact_name || supplier.email || supplier.phone || '')}</p>
            <div class="flex flex-wrap gap-2 mt-2">
              ${statusBadge}
              ${supplier.email ? `<span class="text-xs text-gray-500 dark:text-gray-400">${sanitizeText(supplier.email)}</span>` : ''}
              ${supplier.phone ? `<span class="text-xs text-gray-500 dark:text-gray-400">${sanitizeText(supplier.phone)}</span>` : ''}
            </div>
            ${perfHtml}
          </div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 text-xs rounded-lg border border-nfgray hover:bg-nfglight dark:hover:bg-gray-700" onclick="window.editSupplier(${supplier.id})">
              Edit
            </button>
            <button class="px-2 py-1 text-xs rounded-lg border border-nfgblue text-nfgblue hover:bg-nfglight dark:text-blue-400" onclick="window.createPOForSupplier(${supplier.id})">
              New PO
            </button>
          </div>
        </div>
        ${supplier.notes ? `<p class="mt-2 text-xs text-gray-600 dark:text-gray-300">${sanitizeText(supplier.notes)}</p>` : ''}
      </div>
    `;
  }).join('');
}

function populateSupplierFilters() {
  const supplierFilter = document.getElementById('po-supplier-filter');
  const poSupplierSelect = document.getElementById('po-supplier');
  
  const options = suppliersList
    .map(supplier => `<option value="${supplier.id}">${sanitizeText(supplier.name)}</option>`)
    .join('');
  
  if (supplierFilter) {
    const currentValue = supplierFilter.value;
    supplierFilter.innerHTML = '<option value="all">All Suppliers</option>' + options;
    supplierFilter.value = currentValue || 'all';
  }
  
  if (poSupplierSelect) {
    poSupplierSelect.innerHTML = '<option value="">Select supplier</option>' + options;
  }
}

function calculateSupplierPerformance() {
  const performanceMap = {};
  
  purchaseOrdersList.forEach(po => {
    if (!po.supplier_id) return;
    if (!performanceMap[po.supplier_id]) {
      performanceMap[po.supplier_id] = {
        totalOrders: 0,
        receivedOrders: 0,
        onTimeOrders: 0,
        leadTimeDaysTotal: 0,
        fillOrderedTotal: 0,
        fillReceivedTotal: 0,
        lastDeliveryDate: null
      };
    }
    
    const stats = performanceMap[po.supplier_id];
    stats.totalOrders += 1;
    
    const items = po.purchase_order_items || [];
    const ordered = items.reduce((sum, item) => sum + (item.quantity_ordered || 0), 0);
    const received = items.reduce((sum, item) => sum + (item.quantity_received || 0), 0);
    stats.fillOrderedTotal += ordered;
    stats.fillReceivedTotal += received;
    
    if (po.status === 'received' && po.received_date) {
      stats.receivedOrders += 1;
      const createdAt = new Date(po.created_at);
      const receivedAt = new Date(po.received_date);
      const leadDays = Math.max(0, (receivedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      stats.leadTimeDaysTotal += leadDays;
      if (po.expected_date) {
        const expected = new Date(po.expected_date);
        if (receivedAt.getTime() <= expected.getTime()) {
          stats.onTimeOrders += 1;
        }
      }
      if (!stats.lastDeliveryDate || receivedAt.getTime() > stats.lastDeliveryDate) {
        stats.lastDeliveryDate = receivedAt.getTime();
      }
    }
  });
  
  supplierPerformance = {};
  Object.entries(performanceMap).forEach(([supplierId, stats]) => {
    supplierPerformance[supplierId] = {
      totalOrders: stats.totalOrders,
      receivedOrders: stats.receivedOrders,
      avgLeadTimeDays: stats.receivedOrders ? stats.leadTimeDaysTotal / stats.receivedOrders : null,
      onTimePercent: stats.receivedOrders ? (stats.onTimeOrders / stats.receivedOrders) * 100 : null,
      fillRatePercent: stats.fillOrderedTotal ? (stats.fillReceivedTotal / stats.fillOrderedTotal) * 100 : null,
      lastDeliveryDate: stats.lastDeliveryDate ? new Date(stats.lastDeliveryDate) : null
    };
  });
}

function openSupplierModal(supplierId = null) {
  const modal = document.getElementById('supplierModal');
  const form = document.getElementById('supplier-form');
  if (!modal || !form) return;
  
  form.reset();
  document.getElementById('supplier-form-error')?.classList.add('hidden');
  document.getElementById('supplier-id').value = supplierId || '';
  document.getElementById('supplier-active').checked = true;
  document.getElementById('supplier-modal-title').textContent = supplierId ? 'Edit Supplier' : 'Add Supplier';
  
  if (supplierId) {
    const supplier = suppliersList.find(s => s.id === supplierId);
    if (supplier) {
      document.getElementById('supplier-name').value = supplier.name || '';
      document.getElementById('supplier-contact').value = supplier.contact_name || '';
      document.getElementById('supplier-email').value = supplier.email || '';
      document.getElementById('supplier-phone').value = supplier.phone || '';
      document.getElementById('supplier-preferred-contact').value = supplier.preferred_contact || '';
      document.getElementById('supplier-notes').value = supplier.notes || '';
      document.getElementById('supplier-active').checked = supplier.is_active !== false;
    }
  }
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) window.lucide.createIcons();
}

async function saveSupplier(e) {
  e.preventDefault();
  const errorEl = document.getElementById('supplier-form-error');
  if (errorEl) errorEl.classList.add('hidden');
  
  const supplierId = document.getElementById('supplier-id').value;
  const payload = {
    name: document.getElementById('supplier-name').value.trim(),
    contact_name: document.getElementById('supplier-contact').value.trim() || null,
    email: document.getElementById('supplier-email').value.trim() || null,
    phone: document.getElementById('supplier-phone').value.trim() || null,
    preferred_contact: document.getElementById('supplier-preferred-contact').value || null,
    notes: document.getElementById('supplier-notes').value.trim() || null,
    is_active: document.getElementById('supplier-active').checked
  };
  
  if (!payload.name) {
    if (errorEl) {
      errorEl.textContent = 'Supplier name is required';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  try {
    if (supplierId) {
      payload.updated_at = new Date().toISOString();
      const { error } = await supabase
        .from('suppliers')
        .update(payload)
        .eq('id', supplierId);
      if (error) throw error;
      toast.success('Supplier updated', 'Success');
    } else {
      const { error } = await supabase
        .from('suppliers')
        .insert(payload);
      if (error) throw error;
      toast.success('Supplier added', 'Success');
    }
    
    document.getElementById('supplierModal').classList.add('hidden');
    document.getElementById('supplierModal').classList.remove('flex');
    e.target.reset();
    await loadSuppliers();
  } catch (error) {
    console.error('Failed to save supplier:', error);
    if (errorEl) {
      errorEl.textContent = error.message || 'Failed to save supplier';
      errorEl.classList.remove('hidden');
    }
  }
}

async function loadPurchaseOrders(showToast = false) {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        suppliers:suppliers(name, contact_name, email),
        sites:sites(name),
        purchase_order_items:purchase_order_items(
          id,
          item_id,
          quantity_ordered,
          quantity_received,
          cost_per_unit,
          inventory_items:inventory_items(name, unit)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    purchaseOrdersList = data || [];
    updatePurchaseOrderStats();
    renderPurchaseOrdersTable();
    calculateSupplierPerformance();
    renderSuppliersList();
    
    if (showToast) {
      toast.success('Purchase orders refreshed', 'Success');
    }
  } catch (error) {
    console.error('Failed to load purchase orders:', error);
    toast.error('Failed to load purchase orders', 'Error');
  }
}

function updatePurchaseOrderStats() {
  const pending = purchaseOrdersList.filter(po => ['draft', 'pending', 'ordered'].includes(po.status)).length;
  const received = purchaseOrdersList.filter(po => po.status === 'received').length;
  const openItems = purchaseOrdersList
    .filter(po => ['pending', 'ordered'].includes(po.status))
    .reduce((sum, po) => sum + (po.total_items || 0), 0);
  const outstandingAmount = purchaseOrdersList
    .reduce((sum, po) => {
      const totalPaid = po.total_paid || 0;
      const balance = Math.max(0, (po.total_cost || 0) - totalPaid);
      return sum + balance;
    }, 0);
  
  document.getElementById('suppliers-active-count').textContent = suppliersList.filter(s => s.is_active !== false).length;
  document.getElementById('po-pending-count').textContent = pending;
  document.getElementById('po-received-count').textContent = received;
  document.getElementById('po-open-items-count').textContent = openItems;
  const outstandingEl = document.getElementById('po-outstanding-amount');
  if (outstandingEl) outstandingEl.textContent = formatCurrency(outstandingAmount);
}

function renderPurchaseOrdersTable() {
  const tableBody = document.getElementById('po-table-body');
  if (!tableBody) return;
  
  if (!purchaseOrdersList.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No purchase orders yet</td></tr>';
    return;
  }
  
  const statusFilter = document.getElementById('po-status-filter')?.value || 'all';
  const supplierFilter = document.getElementById('po-supplier-filter')?.value || 'all';
  
  const filtered = purchaseOrdersList.filter(po => {
    const statusMatch = statusFilter === 'all' || po.status === statusFilter;
    const supplierMatch = supplierFilter === 'all' || String(po.supplier_id) === supplierFilter;
    return statusMatch && supplierMatch;
  });
  
  if (!filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No purchase orders match the current filters</td></tr>';
    return;
  }
  
  tableBody.innerHTML = filtered.map(po => {
    const supplierName = po.suppliers?.name || '—';
    const siteName = po.sites?.name || '—';
    const expected = po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—';
    const badge = getPOStatusBadge(po.status);
    const totalPaid = po.total_paid || 0;
    const balance = Math.max(0, (po.total_cost || 0) - totalPaid);
    const paymentStatus = getPaymentStatusBadge(po.payment_status, balance);
    
    const actions = [];
    actions.push(`<button class="px-2 py-1 text-xs rounded-lg border border-nfgray hover:bg-nfglight dark:hover:bg-gray-700" onclick="window.openPODetailModal(${po.id})">Details</button>`);
    if (po.suppliers?.email) {
      actions.push(`<button class="px-2 py-1 text-xs rounded-lg border border-nfgblue text-nfgblue hover:bg-nfglight dark:text-blue-400" onclick="window.emailPurchaseOrder(${po.id})">${po.emailed_at ? 'Resend Email' : 'Email PO'}</button>`);
    }
    if (po.status !== 'received' && po.status !== 'cancelled') {
      actions.push(`<button class="px-2 py-1 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100" onclick="window.markPurchaseOrderReceived(${po.id})">Mark Received</button>`);
      actions.push(`<button class="px-2 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100" onclick="window.cancelPurchaseOrder(${po.id})">Cancel</button>`);
    } else {
      actions.push(`<span class="text-xs text-gray-500">No actions</span>`);
    }
    
    return `
      <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
        <td class="px-3 py-3 font-semibold text-nfgblue dark:text-blue-400">${sanitizeText(po.po_number)}</td>
        <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">${sanitizeText(supplierName)}</td>
        <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">${sanitizeText(siteName)}</td>
        <td class="px-3 py-3 text-sm text-gray-600 dark:text-gray-300">${expected}</td>
        <td class="px-3 py-3 text-center text-sm text-gray-600 dark:text-gray-300">${po.total_items || 0}</td>
        <td class="px-3 py-3 text-center">
          <span class="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-lg ${badge.className}">
            ${badge.label}
          </span>
          <div class="mt-1 text-[11px] text-gray-500">${paymentStatus}</div>
        </td>
        <td class="px-3 py-3 text-center text-sm font-semibold ${balance > 0 ? 'text-rose-600' : 'text-green-600'}">${formatCurrency(balance)}</td>
        <td class="px-3 py-3 text-center flex flex-col md:flex-row gap-2 justify-center">${actions.join('')}</td>
      </tr>
    `;
  }).join('');
}

function getPOStatusBadge(status) {
  const map = {
    draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    pending: { label: 'Pending', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    ordered: { label: 'Ordered', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    received: { label: 'Received', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' }
  };
  return map[status] || map.pending;
}

function getPaymentStatusBadge(status, balance) {
  if (!status) {
    return balance > 0 ? 'Unpaid' : 'Paid';
  }
  if (status === 'paid') return 'Paid';
  if (status === 'partial') return `Partial (${formatCurrency(balance)} due)`;
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function determinePaymentStatus(totalPaid, totalCost) {
  if ((totalPaid || 0) <= 0) return 'unpaid';
  if (totalPaid >= (totalCost || 0)) return 'paid';
  return 'partial';
}

function openPurchaseOrderModal(prefSupplierId = null) {
  const modal = document.getElementById('poModal');
  if (!modal) return;
  
  document.getElementById('po-form').reset();
  resetPOItemsTable();
  document.getElementById('po-total-value').textContent = formatCurrency(0);
  document.getElementById('po-form-error')?.classList.add('hidden');
  
  populateSupplierFilters(); // ensure options up to date
  populatePOSiteOptions();
  
  if (prefSupplierId) {
    document.getElementById('po-supplier').value = prefSupplierId;
  }
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) window.lucide.createIcons();
}

// Create PO from low stock items
async function createPOFromLowStockItems() {
  try {
    // Get current inventory to find low stock items
    const siteInventory = await fetchSiteInventory();
    const lowStockItems = siteInventory.filter(item => 
      item.stock_status === 'low' || item.stock_status === 'out'
    );
    
    if (lowStockItems.length === 0) {
      toast.error('No low stock items found');
      return;
    }
    
    // Group by item_id to avoid duplicates (take highest reorder quantity needed)
    const itemMap = new Map();
    lowStockItems.forEach(item => {
      const existing = itemMap.get(item.item_id);
      // Calculate suggested reorder quantity: enough to reach threshold * 4, but at least reorder_quantity
      const targetStock = item.low_stock_threshold * 4;
      const needed = Math.max(targetStock - item.quantity, item.reorder_quantity || item.low_stock_threshold * 4 || 20);
      const reorderQty = Math.max(needed, 20); // Minimum 20 units
      
      if (!existing || reorderQty > existing.reorder_quantity) {
        itemMap.set(item.item_id, {
          item_id: item.item_id,
          item_name: item.item_name,
          reorder_quantity: reorderQty,
          site_id: item.site_id,
          site_name: item.site_name,
          current_qty: item.quantity,
          preferred_supplier_id: null
        });
      }
    });
    
    const itemsToAdd = Array.from(itemMap.values());
    
    // Open PO modal
    openPurchaseOrderModal();
    
    // Wait a bit for modal to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Pre-select first item's site
    if (itemsToAdd.length > 0 && itemsToAdd[0].site_id) {
      const siteSelect = document.getElementById('po-site');
      if (siteSelect) {
        siteSelect.value = itemsToAdd[0].site_id;
      }
    }
    
    // Add items to PO form
    for (const item of itemsToAdd) {
      await addPOItemRow({
        item_id: item.item_id,
        quantity: item.reorder_quantity
      });
    }
    
    toast.success(`Added ${itemsToAdd.length} low stock item(s) to purchase order`, 'Low Stock Items Added');
  } catch (error) {
    console.error('Error creating PO from low stock:', error);
    toast.error('Failed to create PO from low stock items');
  }
}

// Create PO from single low stock item
async function createPOFromLowStockItem(itemId, siteId, suggestedQty) {
  try {
    // Get item details
    const { data: item, error } = await supabase
      .from('inventory_items')
      .select('id, name, reorder_quantity, low_stock_threshold')
      .eq('id', itemId)
      .single();
    
    if (error || !item) {
      toast.error('Item not found');
      return;
    }
    
    // Open PO modal
    openPurchaseOrderModal();
    
    // Wait for modal to render
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Set site
    const siteSelect = document.getElementById('po-site');
    if (siteSelect && siteId) {
      siteSelect.value = siteId;
    }
    
    // Add item to PO
    const reorderQty = suggestedQty || item.reorder_quantity || item.low_stock_threshold * 4 || 20;
    await addPOItemRow({
      item_id: itemId,
      quantity: reorderQty
    });
    
    toast.success(`Added "${item.name}" to purchase order`, 'Item Added');
  } catch (error) {
    console.error('Error creating PO from low stock item:', error);
    toast.error('Failed to add item to purchase order');
  }
}

// Automated low stock detection
async function checkLowStock() {
  try {
    const siteInventory = await fetchSiteInventory();
    const lowStockItems = siteInventory.filter(item => 
      item.stock_status === 'low' || item.stock_status === 'out'
    );
    
    if (lowStockItems.length === 0) {
      return { count: 0, items: [] };
    }
    
    // Get last alert timestamp
    const lastAlert = localStorage.getItem('low-stock-last-alert');
    const lastAlertTime = lastAlert ? parseInt(lastAlert) : 0;
    const now = Date.now();
    const sixHours = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    
    // Only alert if it's been more than 6 hours since last alert
    if (now - lastAlertTime < sixHours) {
      return { count: lowStockItems.length, items: lowStockItems, alerted: false };
    }
    
    // Store alert timestamp
    localStorage.setItem('low-stock-last-alert', now.toString());
    
    // Check if we should send notifications
    const shouldNotify = lowStockItems.length > 0;
    
    return {
      count: lowStockItems.length,
      items: lowStockItems,
      alerted: shouldNotify,
      timestamp: now
    };
  } catch (error) {
    console.error('Error checking low stock:', error);
    return { count: 0, items: [], error: error.message };
  }
}

// Load transfers
async function loadTransfers(showToast = false) {
  try {
    // Try to load from view first, fallback to direct table query if view doesn't exist
    let data, error;
    
    try {
      const result = await supabase
        .from('inventory_transfers_with_details')
        .select('*')
        .order('created_at', { ascending: false });
      data = result.data;
      error = result.error;
    } catch (viewError) {
      // View might not exist, fallback to direct table query
      console.warn('[Transfers] View not available, using direct table query:', viewError);
      const result = await supabase
        .from('inventory_transfers')
        .select(`
          *,
          from_site:sites!inventory_transfers_from_site_id_fkey(name),
          to_site:sites!inventory_transfers_to_site_id_fkey(name),
          transfer_items:inventory_transfer_items(count)
        `)
        .order('requested_at', { ascending: false });
      data = result.data;
      error = result.error;
      
      // Transform data to match view structure
      if (data && !error) {
        data = data.map(transfer => ({
          ...transfer,
          from_site_name: transfer.from_site?.name || 'Unknown',
          to_site_name: transfer.to_site?.name || 'Unknown',
          total_items: transfer.transfer_items?.length || 0
        }));
      }
    }
    
    if (error) throw error;
    
    transfersList = data || [];
    allTransfersCache = [...transfersList]; // Cache for filtering
    renderTransfers();
    updateTransferSummaryCards();
    
    if (showToast) {
      toast.success('Transfers refreshed', 'Success');
    }
  } catch (error) {
    console.error('Failed to load transfers:', error);
    toast.error('Failed to load transfers', 'Error');
    transfersList = [];
    renderTransfers();
  }
}

// Render transfers table
function renderTransfers() {
  const tableBody = document.getElementById('transfers-table-body');
  if (!tableBody) return;
  
  if (!transfersList || transfersList.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
          No transfers yet. Click "Create Transfer" to get started.
        </td>
      </tr>
    `;
    return;
  }
  
  const statusConfig = {
    'pending': { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Pending' },
    'approved': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Approved' },
    'in-transit': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', label: 'In Transit' },
    'completed': { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Completed' },
    'cancelled': { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Cancelled' }
  };
  
  tableBody.innerHTML = transfersList.map(transfer => {
    const status = statusConfig[transfer.status] || statusConfig['pending'];
    const isStaff = currentUserProfile && currentUserProfile.role === 'staff';
    
    return `
      <tr class="hover:bg-nfglight/30 transition">
        <td class="px-3 py-2 font-medium text-nfgblue dark:text-blue-400">${transfer.transfer_number}</td>
        <td class="px-3 py-2">${sanitizeText(transfer.from_site_name || 'Unknown')}</td>
        <td class="px-3 py-2">${sanitizeText(transfer.to_site_name || 'Unknown')}</td>
        <td class="px-3 py-2 text-center">${transfer.total_items || 0}</td>
        <td class="px-3 py-2 text-center">
          <span class="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${status.color}">
            ${status.label}
          </span>
        </td>
        <td class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
          ${transfer.requested_at ? new Date(transfer.requested_at).toLocaleDateString() : '—'}
        </td>
        <td class="px-3 py-2 text-center">
          <div class="flex items-center justify-center gap-1">
            <button onclick="viewTransferDetails(${transfer.id})" 
                    class="p-1.5 rounded-lg hover:bg-nfglight dark:hover:bg-gray-700 text-nfgblue dark:text-blue-400 transition" 
                    data-tooltip="View details" data-tooltip-position="top">
              <i data-lucide="eye" class="w-4 h-4"></i>
            </button>
            ${transfer.status === 'pending' && !isStaff ? `
              <button onclick="approveTransfer(${transfer.id})" 
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition" 
                      data-tooltip="Approve transfer" data-tooltip-position="top">
                <i data-lucide="check" class="w-4 h-4"></i>
              </button>
              <button onclick="cancelTransfer(${transfer.id})" 
                      class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition" 
                      data-tooltip="Cancel transfer" data-tooltip-position="top">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            ` : ''}
            ${transfer.status === 'approved' && !isStaff ? `
              <button onclick="completeTransfer(${transfer.id})" 
                      class="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 transition" 
                      data-tooltip="Complete transfer" data-tooltip-position="top">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  if (window.lucide) lucide.createIcons();
}

// Update transfer summary cards
function updateTransferSummaryCards() {
  const pending = transfersList.filter(t => t.status === 'pending').length;
  const approved = transfersList.filter(t => t.status === 'approved').length;
  const inTransit = transfersList.filter(t => t.status === 'in-transit').length;
  const completed = transfersList.filter(t => t.status === 'completed').length;
  
  document.getElementById('transfers-pending-count').textContent = pending;
  document.getElementById('transfers-approved-count').textContent = approved;
  document.getElementById('transfers-in-transit-count').textContent = inTransit;
  document.getElementById('transfers-completed-count').textContent = completed;
}

// Attach transfer view event listeners
function attachTransferListeners() {
  // Refresh button
  document.getElementById('transfers-refresh-btn')?.addEventListener('click', async () => {
    await loadTransfers(true);
  });
  
  // Create transfer button
  document.getElementById('create-transfer-btn')?.addEventListener('click', () => {
    openTransferModal();
  });
  
  // Status filter
  document.getElementById('transfers-status-filter')?.addEventListener('change', (e) => {
    filterTransfers(e.target.value);
  });
}

// Filter transfers by status
function filterTransfers(status) {
  if (status === 'all') {
    transfersList = [...allTransfersCache || []];
  } else {
    transfersList = (allTransfersCache || []).filter(t => t.status === status);
  }
  renderTransfers();
}

// Open transfer modal
async function openTransferModal() {
  const modal = document.getElementById('transferModal');
  if (!modal) return;
  
  // Reset form
  document.getElementById('transfer-form')?.reset();
  document.getElementById('transfer-form-error')?.classList.add('hidden');
  
  // Clear items table
  const itemsTable = document.getElementById('transfer-items-table');
  if (itemsTable) {
    itemsTable.innerHTML = '<tr data-placeholder="true"><td colspan="4" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No items added yet</td></tr>';
  }
  
  // Populate site dropdowns
  if (!sites.length) {
    await fetchSites();
  }
  
  const fromSiteSelect = document.getElementById('transfer-from-site');
  const toSiteSelect = document.getElementById('transfer-to-site');
  
  if (fromSiteSelect) {
    fromSiteSelect.innerHTML = '<option value="">Select source site</option>' + 
      sites.map(site => `<option value="${site.id}">${sanitizeText(site.name)}</option>`).join('');
  }
  
  if (toSiteSelect) {
    toSiteSelect.innerHTML = '<option value="">Select destination site</option>' + 
      sites.map(site => `<option value="${site.id}">${sanitizeText(site.name)}</option>`).join('');
  }
  
  // Add event listener for from site change to load available inventory
  fromSiteSelect?.addEventListener('change', async (e) => {
    const siteId = parseInt(e.target.value, 10);
    if (siteId) {
      await loadAvailableInventoryForTransfer(siteId);
    }
  });
  
  // Add item row button
  document.getElementById('add-transfer-item-row')?.addEventListener('click', addTransferItemRow);
  
  // Show modal
  modal.classList.remove('hidden');
  
  if (window.lucide) lucide.createIcons();
}

// Load available inventory for a site (for transfer)
async function loadAvailableInventoryForTransfer(siteId) {
  try {
    const { data, error } = await supabase
      .from('site_inventory')
      .select(`
        quantity,
        inventory_items:inventory_items(
          id,
          name,
          unit,
          category_id,
          inventory_categories:inventory_categories(name)
        )
      `)
      .eq('site_id', siteId)
      .gt('quantity', 0)
      .order('inventory_items(name)');
    
    if (error) throw error;
    
    // Store for use in transfer item rows
    window.availableInventoryForTransfer = (data || []).map(item => ({
      item_id: item.inventory_items.id,
      name: item.inventory_items.name,
      unit: item.inventory_items.unit,
      category: item.inventory_items.inventory_categories?.name || 'Uncategorized',
      available: item.quantity
    }));
    
    // Update existing item rows with available quantities
    updateTransferItemRowsAvailability();
  } catch (error) {
    console.error('Failed to load available inventory:', error);
    toast.error('Failed to load available inventory', 'Error');
  }
}

// Update transfer item rows with available quantities
function updateTransferItemRowsAvailability() {
  const rows = document.querySelectorAll('#transfer-items-table tr[data-item-id]');
  rows.forEach(row => {
    const itemId = parseInt(row.dataset.itemId, 10);
    const availableCell = row.querySelector('.transfer-available');
    const item = window.availableInventoryForTransfer?.find(i => i.item_id === itemId);
    
    if (availableCell && item) {
      availableCell.textContent = `${item.available} ${item.unit}`;
    }
  });
}

// Add transfer item row
function addTransferItemRow() {
  const table = document.getElementById('transfer-items-table');
  if (!table) return;
  
  // Remove placeholder
  const placeholder = table.querySelector('tr[data-placeholder="true"]');
  if (placeholder) placeholder.remove();
  
  const rowId = Date.now();
  const availableItems = window.availableInventoryForTransfer || [];
  
  const row = document.createElement('tr');
  row.dataset.rowId = rowId;
  row.innerHTML = `
    <td class="px-3 py-2">
      <select class="transfer-item-select w-full border border-nfgray rounded-lg px-2 py-1.5 text-sm" data-row-id="${rowId}">
        <option value="">Select item</option>
        ${availableItems.map(item => 
          `<option value="${item.item_id}" data-available="${item.available}" data-unit="${item.unit}">${sanitizeText(item.name)} (${item.unit})</option>`
        ).join('')}
      </select>
    </td>
    <td class="px-3 py-2 text-center">
      <span class="transfer-available text-sm text-gray-500 dark:text-gray-400">—</span>
    </td>
    <td class="px-3 py-2">
      <input type="number" min="1" step="1" class="transfer-item-qty w-full border border-nfgray rounded-lg px-2 py-1.5 text-sm" placeholder="Qty" data-row-id="${rowId}" />
    </td>
    <td class="px-3 py-2 text-center">
      <button type="button" onclick="removeTransferItemRow(${rowId})" class="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>
    </td>
  `;
  
  table.appendChild(row);
  
  // Add change listener to update available quantity
  const select = row.querySelector('.transfer-item-select');
  select?.addEventListener('change', (e) => {
    const option = e.target.selectedOptions[0];
    const available = parseInt(option?.dataset.available || '0', 10);
    const unit = option?.dataset.unit || '';
    const availableCell = row.querySelector('.transfer-available');
    if (availableCell) {
      availableCell.textContent = `${available} ${unit}`;
    }
    // Set max on quantity input
    const qtyInput = row.querySelector('.transfer-item-qty');
    if (qtyInput) {
      qtyInput.max = available;
    }
  });
  
  if (window.lucide) lucide.createIcons();
}

// Remove transfer item row
window.removeTransferItemRow = function(rowId) {
  const row = document.querySelector(`#transfer-items-table tr[data-row-id="${rowId}"]`);
  if (row) {
    row.remove();
    
    // Show placeholder if no rows left
    const table = document.getElementById('transfer-items-table');
    if (table && !table.querySelector('tr[data-row-id]')) {
      table.innerHTML = '<tr data-placeholder="true"><td colspan="4" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No items added yet</td></tr>';
    }
  }
};

// Submit transfer request
async function submitTransferRequest(e) {
  if (e) e.preventDefault();
  
  const errorEl = document.getElementById('transfer-form-error');
  if (errorEl) errorEl.classList.add('hidden');
  
  const fromSiteId = parseInt(document.getElementById('transfer-from-site')?.value, 10);
  const toSiteId = parseInt(document.getElementById('transfer-to-site')?.value, 10);
  const notes = document.getElementById('transfer-notes')?.value.trim() || null;
  
  if (!fromSiteId || !toSiteId) {
    if (errorEl) {
      errorEl.textContent = 'Both source and destination sites are required';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  if (fromSiteId === toSiteId) {
    if (errorEl) {
      errorEl.textContent = 'Source and destination sites must be different';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Collect items
  const itemsTable = document.getElementById('transfer-items-table');
  const rows = itemsTable?.querySelectorAll('tr[data-row-id]') || [];
  const items = [];
  
  for (const row of rows) {
    const itemId = parseInt(row.querySelector('.transfer-item-select')?.value, 10);
    const quantity = parseInt(row.querySelector('.transfer-item-qty')?.value, 10);
    
    if (itemId && quantity > 0) {
      items.push({ item_id: itemId, quantity_requested: quantity });
    }
  }
  
  if (items.length === 0) {
    if (errorEl) {
      errorEl.textContent = 'Add at least one item to transfer';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('User not authenticated', 'Error');
    return;
  }
  
  try {
    // Create transfer
    const { data: transfer, error: transferError } = await supabase
      .from('inventory_transfers')
      .insert({
        from_site_id: fromSiteId,
        to_site_id: toSiteId,
        requested_by: user.id,
        status: 'pending',
        notes: notes
      })
      .select()
      .single();
    
    if (transferError) throw transferError;
    
    // Create transfer items
    const transferItems = items.map(item => ({
      transfer_id: transfer.id,
      item_id: item.item_id,
      quantity_requested: item.quantity_requested,
      quantity_transferred: 0
    }));
    
    const { error: itemsError } = await supabase
      .from('inventory_transfer_items')
      .insert(transferItems);
    
    if (itemsError) throw itemsError;
    
    toast.success('Transfer request created successfully', 'Success');
    
    // Close modal
    document.getElementById('transferModal')?.classList.add('hidden');
    
    // Refresh transfers list
    await loadTransfers(true);
  } catch (error) {
    console.error('Failed to create transfer:', error);
    if (errorEl) {
      errorEl.textContent = error.message || 'Failed to create transfer request';
      errorEl.classList.remove('hidden');
    }
    toast.error('Failed to create transfer request', 'Error');
  }
}

// View transfer details
async function viewTransferDetails(transferId) {
  const modal = document.getElementById('transferDetailModal');
  if (!modal) return;
  
  try {
    // Get transfer with items
    const { data: transfer, error: transferError } = await supabase
      .from('inventory_transfers_with_details')
      .select('*')
      .eq('id', transferId)
      .single();
    
    if (transferError) throw transferError;
    
    // Get transfer items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_transfer_items')
      .select(`
        *,
        inventory_items:inventory_items(
          id,
          name,
          unit
        )
      `)
      .eq('transfer_id', transferId);
    
    if (itemsError) throw itemsError;
    
    // Populate modal
    document.getElementById('transfer-detail-number').textContent = transfer.transfer_number || '—';
    document.getElementById('transfer-detail-from').textContent = transfer.from_site_name || '—';
    document.getElementById('transfer-detail-to').textContent = transfer.to_site_name || '—';
    
    const statusConfig = {
      'pending': { color: 'text-orange-600 dark:text-orange-400', label: 'Pending' },
      'approved': { color: 'text-blue-600 dark:text-blue-400', label: 'Approved' },
      'in-transit': { color: 'text-purple-600 dark:text-purple-400', label: 'In Transit' },
      'completed': { color: 'text-green-600 dark:text-green-400', label: 'Completed' },
      'cancelled': { color: 'text-red-600 dark:text-red-400', label: 'Cancelled' }
    };
    
    const status = statusConfig[transfer.status] || statusConfig['pending'];
    const statusEl = document.getElementById('transfer-detail-status');
    statusEl.textContent = status.label;
    statusEl.className = `font-semibold ${status.color}`;
    
    document.getElementById('transfer-detail-requested').textContent = 
      transfer.requested_at ? new Date(transfer.requested_at).toLocaleString() : '—';
    
    // Notes
    if (transfer.notes) {
      document.getElementById('transfer-detail-notes').classList.remove('hidden');
      document.getElementById('transfer-detail-notes-text').textContent = transfer.notes;
    } else {
      document.getElementById('transfer-detail-notes').classList.add('hidden');
    }
    
    // Items
    const itemsTable = document.getElementById('transfer-detail-items');
    if (itemsTable) {
      if (items && items.length > 0) {
        itemsTable.innerHTML = items.map(item => `
          <tr>
            <td class="px-3 py-2">${sanitizeText(item.inventory_items?.name || 'Unknown')}</td>
            <td class="px-3 py-2 text-center">${item.quantity_requested} ${item.inventory_items?.unit || ''}</td>
            <td class="px-3 py-2 text-center">${item.quantity_transferred || 0} ${item.inventory_items?.unit || ''}</td>
          </tr>
        `).join('');
      } else {
        itemsTable.innerHTML = '<tr><td colspan="3" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No items</td></tr>';
      }
    }
    
    // Show modal
    modal.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to load transfer details:', error);
    toast.error('Failed to load transfer details', 'Error');
  }
}

// Approve transfer
async function approveTransfer(transferId) {
  if (!confirm('Are you sure you want to approve this transfer?')) return;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('User not authenticated', 'Error');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('inventory_transfers')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', transferId);
    
    if (error) throw error;
    
    toast.success('Transfer approved successfully', 'Success');
    await loadTransfers(true);
  } catch (error) {
    console.error('Failed to approve transfer:', error);
    toast.error('Failed to approve transfer', 'Error');
  }
}

// Cancel transfer
async function cancelTransfer(transferId) {
  if (!confirm('Are you sure you want to cancel this transfer?')) return;
  
  try {
    const { error } = await supabase
      .from('inventory_transfers')
      .update({
        status: 'cancelled'
      })
      .eq('id', transferId);
    
    if (error) throw error;
    
    toast.success('Transfer cancelled successfully', 'Success');
    await loadTransfers(true);
  } catch (error) {
    console.error('Failed to cancel transfer:', error);
    toast.error('Failed to cancel transfer', 'Error');
  }
}

// Complete transfer (process the actual inventory movement)
async function completeTransfer(transferId) {
  if (!confirm('Are you sure you want to complete this transfer? This will move inventory between sites.')) return;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    toast.error('User not authenticated', 'Error');
    return;
  }
  
  try {
    // Call the SQL function to process the transfer
    const { data, error } = await supabase.rpc('process_inventory_transfer', {
      transfer_id_param: transferId
    });
    
    if (error) throw error;
    
    // Update transfer with completer info
    await supabase
      .from('inventory_transfers')
      .update({
        completed_by: user.id
      })
      .eq('id', transferId);
    
    toast.success('Transfer completed successfully', 'Success');
    
    // Refresh data
    await loadTransfers(true);
    await renderInventory(); // Refresh inventory view
  } catch (error) {
    console.error('Failed to complete transfer:', error);
    toast.error(error.message || 'Failed to complete transfer', 'Error');
  }
}

// Initialize automated low stock checking
// Send low stock email notifications
async function sendLowStockEmailNotifications(lowStockItems) {
  if (!lowStockItems || lowStockItems.length === 0) return;
  
  try {
    // Get all admin and client users (they should receive low stock alerts)
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .in('role', ['admin', 'client']);
    
    if (usersError || !users || users.length === 0) {
      console.warn('[Low Stock] No admin/client users found for email notifications');
      return;
    }
    
    // Prepare low stock items summary
    const itemsSummary = lowStockItems.slice(0, 10).map(item => {
      const siteName = item.site_name || sites.find(s => s.id === item.site_id)?.name || 'Unknown Site';
      const itemName = item.item_name || item.name || 'Unknown Item';
      return `• ${itemName} at ${siteName}: ${item.quantity} ${item.unit || ''} remaining`;
    }).join('\n');
    
    const moreItems = lowStockItems.length > 10 ? `\n... and ${lowStockItems.length - 10} more item(s)` : '';
    
    // Send email to each admin/client
    for (const user of users) {
      if (!user.email) continue;
      
      try {
        const { data, error } = await supabase.functions.invoke('send-notification-email', {
          body: {
            notification: {
              user_id: user.id,
              type: 'low_stock',
              title: `Low Stock Alert: ${lowStockItems.length} Item(s) Need Restocking`,
              message: `${lowStockItems.length} inventory item(s) are running low on stock and need to be restocked.\n\n${itemsSummary}${moreItems}\n\nPlease review your inventory and create purchase orders as needed.`,
              link: `${window.location.origin}/inventory.html`,
              created_at: new Date().toISOString()
            },
            user_email: user.email
          }
        });
        
        if (error) {
          console.error(`[Low Stock] Failed to send email to ${user.email}:`, error);
        } else {
          console.log(`[Low Stock] Email notification sent to ${user.email}`);
        }
      } catch (error) {
        console.error(`[Low Stock] Error sending email to ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error('[Low Stock] Error sending email notifications:', error);
  }
}

// Send low stock push notifications
async function sendLowStockPushNotifications(lowStockItems) {
  if (!lowStockItems || lowStockItems.length === 0) return;
  
  try {
    // Get all admin and client users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .in('role', ['admin', 'client']);
    
    if (usersError || !users || users.length === 0) {
      console.warn('[Low Stock] No admin/client users found for push notifications');
      return;
    }
    
    // Send push notification to each user
    for (const user of users) {
      try {
        const { data, error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: user.id,
            title: 'Low Stock Alert',
            body: `${lowStockItems.length} item(s) are running low on stock`,
            data: {
              type: 'low_stock',
              count: lowStockItems.length,
              link: '/inventory.html'
            }
          }
        });
        
        if (error) {
          console.error(`[Low Stock] Failed to send push to user ${user.id}:`, error);
        } else {
          console.log(`[Low Stock] Push notification sent to user ${user.id}`);
        }
      } catch (error) {
        console.error(`[Low Stock] Error sending push to user ${user.id}:`, error);
      }
    }
  } catch (error) {
    console.error('[Low Stock] Error sending push notifications:', error);
  }
}

function initLowStockChecking() {
  // Check immediately on load
  checkLowStock().then(async result => {
    if (result.alerted && result.count > 0) {
      console.log(`🔔 Low stock detected: ${result.count} items`);
      
      // Send email and push notifications
      await sendLowStockEmailNotifications(result.items);
      await sendLowStockPushNotifications(result.items);
      
      // Update low stock alerts banner if on inventory page
      if (window.location.pathname.includes('inventory.html')) {
        renderInventory().catch(err => console.error('Error refreshing inventory:', err));
      }
    }
  });
  
  // Check every 6 hours
  setInterval(async () => {
    const result = await checkLowStock();
    if (result.alerted && result.count > 0) {
      console.log(`🔔 Low stock detected: ${result.count} items`);
      
      // Send email and push notifications
      await sendLowStockEmailNotifications(result.items);
      await sendLowStockPushNotifications(result.items);
      
      // Show toast notification if not on inventory page
      if (!window.location.pathname.includes('inventory.html')) {
        toast.info(`${result.count} item(s) are running low on stock. Click to view.`, 'Low Stock Alert', {
          duration: 10000,
          onClick: () => window.location.href = './inventory.html'
        });
      }
    }
  }, 6 * 60 * 60 * 1000); // 6 hours
}

async function addPOItemRow(defaults = {}) {
  const table = document.getElementById('po-items-table');
  if (!table) return;
  
  const items = await ensureInventoryItemsCache();
  if (!items.length) {
    toast.error('Please add inventory items before creating purchase orders');
    return;
  }
  
  const placeholder = table.querySelector('tr[data-placeholder]');
  if (placeholder) placeholder.remove();
  
  poItemRowId += 1;
  const rowId = `po-item-${poItemRowId}`;
  const options = items.map(item => `<option value="${item.id}" ${item.id === defaults.item_id ? 'selected' : ''}>${sanitizeText(item.name)}</option>`).join('');
  
  table.insertAdjacentHTML('beforeend', `
    <tr data-row-id="${rowId}">
      <td class="px-3 py-2">
        <select class="po-item-select w-full border border-nfgray rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-nfgblue outline-none">
          ${options}
        </select>
      </td>
      <td class="px-3 py-2 text-center">
        <div class="flex flex-col items-center gap-1">
          <input type="number" min="1" value="${defaults.quantity || 1}" class="po-item-qty w-20 border border-nfgray rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-nfgblue outline-none" />
          <div class="po-item-suggestion text-xs text-gray-500">Suggested: N/A</div>
          <button type="button" class="po-apply-suggestion hidden text-[11px] text-nfgblue hover:underline">Use suggestion</button>
        </div>
      </td>
      <td class="px-3 py-2 text-center">
        <input type="number" min="0" step="0.01" value="${defaults.cost_per_unit || ''}" class="po-item-cost w-24 border border-nfgray rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-nfgblue outline-none" />
      </td>
      <td class="px-3 py-2 text-center text-sm font-semibold po-item-total">$0.00</td>
      <td class="px-3 py-2 text-center">
        <button type="button" class="remove-po-item-row p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600" data-row-id="${rowId}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `);
  
  const newRow = table.querySelector(`[data-row-id="${rowId}"]`);
  newRow.querySelector('.po-item-qty')?.addEventListener('input', updatePOTotalValue);
  newRow.querySelector('.po-item-cost')?.addEventListener('input', updatePOTotalValue);
  newRow.querySelector('.remove-po-item-row')?.addEventListener('click', (event) => {
    const row = event.currentTarget.closest('tr[data-row-id]');
    row?.remove();
    updatePOTotalValue();
    ensurePOItemsPlaceholder();
  });
  newRow.querySelector('.po-item-select')?.addEventListener('change', () => updatePOItemSuggestions());
  newRow.querySelector('.po-apply-suggestion')?.addEventListener('click', (event) => {
    const row = event.currentTarget.closest('tr[data-row-id]');
    if (!row) return;
    const suggestionEl = row.querySelector('.po-item-suggestion');
    const value = parseInt(suggestionEl?.dataset.suggestedValue || '', 10);
    if (value && row.querySelector('.po-item-qty')) {
      row.querySelector('.po-item-qty').value = value;
      updatePOTotalValue();
    }
  });
  
  if (window.lucide) window.lucide.createIcons();
  updatePOTotalValue();
  updatePOItemSuggestions();
}

function ensurePOItemsPlaceholder() {
  const table = document.getElementById('po-items-table');
  if (!table) return;
  if (!table.querySelector('tr[data-row-id]')) {
    table.innerHTML = '<tr data-placeholder="true"><td colspan="5" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No items added yet</td></tr>';
  }
}

function updatePOTotalValue() {
  const table = document.getElementById('po-items-table');
  if (!table) return;
  
  const rows = table.querySelectorAll('tr[data-row-id]');
  let total = 0;
  
  rows.forEach(row => {
    const qty = parseInt(row.querySelector('.po-item-qty')?.value, 10) || 0;
    const cost = parseFloat(row.querySelector('.po-item-cost')?.value) || 0;
    const rowTotal = qty * cost;
    total += rowTotal;
    const totalCell = row.querySelector('.po-item-total');
    if (totalCell) totalCell.textContent = formatCurrency(rowTotal);
  });
  
  document.getElementById('po-total-value').textContent = formatCurrency(total);
  updatePOItemSuggestions();
}

function resetPOItemsTable() {
  const table = document.getElementById('po-items-table');
  if (table) {
    table.innerHTML = '<tr data-placeholder="true"><td colspan="5" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No items added yet</td></tr>';
  }
  document.getElementById('po-total-value').textContent = formatCurrency(0);
  updatePOItemSuggestions();
}

function collectPOItemsFromForm() {
  const table = document.getElementById('po-items-table');
  if (!table) return [];
  const rows = table.querySelectorAll('tr[data-row-id]');
  return Array.from(rows).map(row => ({
    item_id: parseInt(row.querySelector('.po-item-select')?.value, 10),
    quantity: parseInt(row.querySelector('.po-item-qty')?.value, 10) || 0,
    cost_per_unit: parseFloat(row.querySelector('.po-item-cost')?.value) || 0
  })).filter(item => item.item_id && item.quantity > 0);
}

async function submitPurchaseOrder(e) {
  e.preventDefault();
  const errorEl = document.getElementById('po-form-error');
  if (errorEl) errorEl.classList.add('hidden');
  
  const supplierId = parseInt(document.getElementById('po-supplier').value, 10);
  const siteId = parseInt(document.getElementById('po-site').value, 10);
  const expectedDate = document.getElementById('po-expected-date').value || null;
  const notes = document.getElementById('po-notes').value.trim() || null;
  
  if (!supplierId || !siteId) {
    if (errorEl) {
      errorEl.textContent = 'Supplier and site are required';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  const items = collectPOItemsFromForm();
  if (!items.length) {
    if (errorEl) {
      errorEl.textContent = 'Add at least one item to the purchase order';
      errorEl.classList.remove('hidden');
    }
    return;
  }
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
  const poNumber = `PO-${Date.now()}`;
  
  try {
    const { data: poData, error } = await supabase
      .from('purchase_orders')
      .insert({
        po_number: poNumber,
        supplier_id: supplierId,
        site_id: siteId,
        expected_date: expectedDate,
        notes,
        status: 'pending',
        ordered_by: currentUser?.id || null,
        total_items: totalItems,
        total_cost: totalCost
      })
      .select()
      .single();
    
    if (error) throw error;
    
    const itemsPayload = items.map(item => ({
      purchase_order_id: poData.id,
      item_id: item.item_id,
      quantity_ordered: item.quantity,
      cost_per_unit: item.cost_per_unit,
      notes: null
    }));
    
    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsPayload);
    
    if (itemsError) throw itemsError;
    
    document.getElementById('poModal').classList.add('hidden');
    document.getElementById('poModal').classList.remove('flex');
    e.target.reset();
    resetPOItemsTable();
    toast.success('Purchase order created', 'Success');
    await loadPurchaseOrders();
  } catch (error) {
    console.error('Failed to create purchase order:', error);
    if (errorEl) {
      errorEl.textContent = error.message || 'Failed to create purchase order';
      errorEl.classList.remove('hidden');
    }
  }
}

async function markPurchaseOrderReceived(poId) {
  const po = purchaseOrdersList.find(p => p.id === poId);
  if (!po) return;
  if (!po.site_id) {
    toast.error('Assign a site to this purchase order before receiving items');
    return;
  }
  
  const confirmed = await showConfirm('Mark this purchase order as received and restock items?', 'Receive Purchase Order');
  if (!confirmed) return;
  
  try {
    let items = po.purchase_order_items;
    if (!items || !items.length) {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', poId);
      if (error) throw error;
      items = data || [];
    }
    
    for (const item of items) {
      const { data: existing, error: fetchError } = await supabase
        .from('site_inventory')
        .select('quantity')
        .eq('site_id', po.site_id)
        .eq('item_id', item.item_id)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }
      
      const currentQty = existing?.quantity || 0;
      const newQty = currentQty + (item.quantity_ordered || 0);
      const now = new Date().toISOString();
      
      // Get cost per unit from PO item if available
      const unitCost = item.cost_per_unit || null;
      
      await supabase
        .from('site_inventory')
        .upsert({
          site_id: po.site_id,
          item_id: item.item_id,
          quantity: newQty,
          unit_cost: unitCost, // Save cost when receiving
          updated_at: now,
          last_restocked_at: now
        }, { onConflict: 'site_id,item_id' });
      
      await supabase
        .from('inventory_transactions')
        .insert({
          item_id: item.item_id,
          site_id: po.site_id,
          transaction_type: 'restock',
          quantity_change: item.quantity_ordered,
          quantity_before: currentQty,
          quantity_after: newQty,
          user_id: currentUser?.id || null,
          notes: `Received via ${po.po_number}`
        });
      
      await supabase
        .from('purchase_order_items')
        .update({ quantity_received: item.quantity_ordered, updated_at: now })
        .eq('id', item.id);
    }
    
    await supabase
      .from('purchase_orders')
      .update({ status: 'received', received_date: new Date().toISOString().slice(0, 10) })
      .eq('id', poId);
    
    toast.success('Purchase order marked as received', 'Success');
    await loadPurchaseOrders();
    await renderInventory();
  } catch (error) {
    console.error('Failed to mark purchase order received:', error);
    toast.error('Failed to receive purchase order', 'Error');
  }
}

async function emailPurchaseOrder(poId) {
  const po = purchaseOrdersList.find(p => p.id === poId);
  if (!po) {
    toast.error('Purchase order not found');
    return;
  }
  const supplierEmail = po.suppliers?.email;
  if (!supplierEmail) {
    toast.error('Supplier email is missing');
    return;
  }
  if (!po.purchase_order_items || !po.purchase_order_items.length) {
    toast.error('Add line items before emailing this purchase order');
    return;
  }
  
  try {
    toast.info('Generating purchase order PDF…');
    const pdfBuffer = await generatePurchaseOrderPdf(po);
    const pdfBase64 = arrayBufferToBase64(pdfBuffer);
    
    const payload = {
      po: {
        po_number: po.po_number,
        status: po.status,
        expected_date: po.expected_date,
        notes: po.notes,
        suppliers: po.suppliers,
        sites: po.sites,
        purchase_order_items: po.purchase_order_items
      },
      supplierEmail,
      pdfBase64
    };
    
    const { error } = await supabase.functions.invoke('send-purchase-order-email', { body: payload });
    if (error) throw error;
    
    await supabase
      .from('purchase_orders')
      .update({ emailed_at: new Date().toISOString() })
      .eq('id', poId);
    
    toast.success('Purchase order emailed to supplier');
    await loadPurchaseOrders();
  } catch (error) {
    console.error('Failed to email purchase order:', error);
    toast.error(error.message || 'Failed to email purchase order');
  }
}

async function ensureJsPdf() {
  if (!window.jspdf) {
    await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
  return window.jspdf.jsPDF;
}

async function generatePurchaseOrderPdf(po) {
  const JsPdfConstructor = await ensureJsPdf();
  const doc = new JsPdfConstructor();
  
  doc.setFontSize(18);
  doc.text('Northern Facilities Group', 14, 20);
  doc.setFontSize(12);
  doc.text(`Purchase Order: ${po.po_number}`, 14, 30);
  doc.text(`Supplier: ${po.suppliers?.name || '—'}`, 14, 38);
  doc.text(`Site: ${po.sites?.name || '—'}`, 14, 46);
  if (po.expected_date) {
    doc.text(`Expected Date: ${new Date(po.expected_date).toLocaleDateString()}`, 14, 54);
  }
  
  let y = 70;
  doc.setFont(undefined, 'bold');
  doc.text('Item', 14, y);
  doc.text('Qty', 110, y);
  doc.text('Cost/Unit', 150, y);
  doc.setFont(undefined, 'normal');
  y += 6;
  
  (po.purchase_order_items || []).forEach(item => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(item.inventory_items?.name || 'Unknown Item', 14, y);
    doc.text(String(item.quantity_ordered || 0), 110, y, { align: 'right' });
    doc.text(`$${Number(item.cost_per_unit || 0).toFixed(2)}`, 170, y, { align: 'right' });
    y += 6;
  });
  
  if (po.notes) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    doc.setFont(undefined, 'bold');
    doc.text('Notes', 14, y);
    doc.setFont(undefined, 'normal');
    y += 6;
    doc.text(doc.splitTextToSize(po.notes, 180), 14, y);
  }
  
  return doc.output('arraybuffer');
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function updatePurchaseOrderPaymentStatus(poId) {
  try {
    const { data: poRecord, error: poError } = await supabase
      .from('purchase_orders')
      .select('total_cost')
      .eq('id', poId)
      .maybeSingle();
    if (poError) throw poError;
    
    const { data: payments, error: payError } = await supabase
      .from('purchase_order_payments')
      .select('amount')
      .eq('purchase_order_id', poId);
    if (payError) throw payError;
    
    const totalPaid = (payments || []).reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const status = determinePaymentStatus(totalPaid, poRecord?.total_cost || 0);
    
    await supabase
      .from('purchase_orders')
      .update({ payment_status: status })
      .eq('id', poId);
  } catch (error) {
    console.error('Failed to update payment status:', error);
  }
}

// ===== Purchase Order Detail (Payments & Documents) =====

function openPODetailModal(poId) {
  const modal = document.getElementById('poDetailModal');
  if (!modal) return;
  currentPODetailId = poId;
  const po = purchaseOrdersList.find(p => p.id === poId);
  if (!po) {
    toast.error('Purchase order not found');
    return;
  }
  renderPODetailSummary(po);
  togglePaymentForm(false);
  toggleDocForm(false);
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) window.lucide.createIcons();
  loadPurchaseOrderPayments(poId);
  loadPurchaseOrderDocuments(poId);
}

function renderPODetailSummary(po) {
  document.getElementById('po-detail-title').textContent = `${po.po_number} (${po.status})`;
  document.getElementById('po-detail-supplier').textContent = po.suppliers?.name || '—';
  document.getElementById('po-detail-site').textContent = `Site: ${po.sites?.name || '—'}`;
  document.getElementById('po-detail-expected').textContent = `Expected: ${po.expected_date ? new Date(po.expected_date).toLocaleDateString() : '—'}`;
  const totalPaid = po.total_paid || 0;
  const balance = Math.max(0, (po.total_cost || 0) - totalPaid);
  document.getElementById('po-detail-paid').textContent = formatCurrency(totalPaid);
  document.getElementById('po-detail-balance').textContent = formatCurrency(balance);
}

async function loadPurchaseOrderPayments(poId) {
  const listEl = document.getElementById('po-payments-list');
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Loading payments…</p>';
  const { data, error } = await supabase
    .from('purchase_order_payments')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('payment_date', { ascending: false });
  if (error) {
    console.error('Failed to load payments:', error);
    listEl.innerHTML = '<p class="text-sm text-red-500 text-center py-6">Failed to load payments</p>';
    return;
  }
  poPaymentsCache = data || [];
  renderPurchaseOrderPayments();
}

function renderPurchaseOrderPayments() {
  const listEl = document.getElementById('po-payments-list');
  if (!listEl) return;
  if (!poPaymentsCache.length) {
    listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No payments recorded</p>';
    return;
  }
  listEl.innerHTML = poPaymentsCache.map(payment => `
    <div class="border border-nfgray rounded-lg p-3">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-nfgblue dark:text-blue-300">${formatCurrency(payment.amount)}</p>
        <p class="text-xs text-gray-500">${new Date(payment.payment_date).toLocaleDateString()}</p>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">${payment.method || 'Method not set'}</p>
      ${payment.notes ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${sanitizeText(payment.notes)}</p>` : ''}
    </div>
  `).join('');
}

async function addPurchaseOrderPayment(e) {
  e.preventDefault();
  if (!currentPODetailId) return;
  const amount = parseFloat(document.getElementById('po-payment-amount').value);
  if (!amount || amount <= 0) {
    toast.error('Enter a valid payment amount');
    return;
  }
  const payload = {
    purchase_order_id: currentPODetailId,
    amount,
    payment_date: document.getElementById('po-payment-date').value || new Date().toISOString().slice(0, 10),
    method: document.getElementById('po-payment-method').value || null,
    reference: document.getElementById('po-payment-reference').value || null,
    notes: document.getElementById('po-payment-notes').value || null,
    recorded_by: currentUser?.id || null
  };
  try {
    const { error } = await supabase
      .from('purchase_order_payments')
      .insert(payload);
    if (error) throw error;
    toast.success('Payment recorded');
    await updatePurchaseOrderPaymentStatus(currentPODetailId);
    togglePaymentForm(false);
    document.getElementById('po-payment-form').reset();
    await loadPurchaseOrders();
    const updated = purchaseOrdersList.find(po => po.id === currentPODetailId);
    if (updated) renderPODetailSummary(updated);
    await loadPurchaseOrderPayments(currentPODetailId);
  } catch (err) {
    console.error('Failed to add payment:', err);
    toast.error(err.message || 'Failed to add payment');
  }
}

function togglePaymentForm(show) {
  const form = document.getElementById('po-payment-form');
  if (!form) return;
  if (show) {
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
    form.reset();
  }
}

async function loadPurchaseOrderDocuments(poId) {
  const listEl = document.getElementById('po-documents-list');
  if (!listEl) return;
  listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-6">Loading documents…</p>';
  const { data, error } = await supabase
    .from('purchase_order_documents')
    .select('*')
    .eq('purchase_order_id', poId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load documents:', error);
    listEl.innerHTML = '<p class="text-sm text-red-500 text-center py-6">Failed to load documents</p>';
    return;
  }
  poDocumentsCache = data || [];
  renderPurchaseOrderDocuments();
}

function renderPurchaseOrderDocuments() {
  const listEl = document.getElementById('po-documents-list');
  if (!listEl) return;
  if (!poDocumentsCache.length) {
    listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400 text-center py-6">No documents uploaded</p>';
    return;
  }
  listEl.innerHTML = poDocumentsCache.map(doc => `
    <div class="border border-nfgray rounded-lg p-3 flex items-center justify-between">
      <div>
        <p class="font-semibold text-nfgblue dark:text-blue-300">${sanitizeText(doc.file_name)}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">${doc.doc_type || 'document'} · ${new Date(doc.created_at).toLocaleString()}</p>
      </div>
      <button class="px-3 py-1.5 text-xs rounded-lg border border-nfgblue text-nfgblue hover:bg-nfglight dark:text-blue-300" onclick="window.downloadPurchaseOrderDocument(${doc.id})">
        Download
      </button>
    </div>
  `).join('');
}

function toggleDocForm(show) {
  const form = document.getElementById('po-doc-form');
  if (!form) return;
  if (show) {
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
    form.reset();
  }
}

async function uploadPurchaseOrderDocument(e) {
  e.preventDefault();
  if (!currentPODetailId) return;
  const fileInput = document.getElementById('po-doc-file');
  const file = fileInput?.files?.[0];
  if (!file) {
    toast.error('Select a file to upload');
    return;
  }
  const docType = document.getElementById('po-doc-type').value || null;
  try {
    const path = `${currentUser?.id || 'system'}/${currentPODetailId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from(PO_DOCUMENTS_BUCKET)
      .upload(path, file, { upsert: false });
    if (uploadError) throw uploadError;
    
    const { error: insertError } = await supabase
      .from('purchase_order_documents')
      .insert({
        purchase_order_id: currentPODetailId,
        file_name: file.name,
        storage_path: path,
        doc_type: docType,
        uploaded_by: currentUser?.id || null
      });
    if (insertError) throw insertError;
    
    toast.success('Document uploaded');
    toggleDocForm(false);
    await loadPurchaseOrderDocuments(currentPODetailId);
  } catch (error) {
    console.error('Failed to upload document:', error);
    toast.error(error.message || 'Failed to upload document');
  }
}

async function downloadPurchaseOrderDocument(docId) {
  const doc = poDocumentsCache.find(d => d.id === docId);
  if (!doc) {
    toast.error('Document not found');
    return;
  }
  try {
    const { data, error } = await supabase.storage
      .from(PO_DOCUMENTS_BUCKET)
      .createSignedUrl(doc.storage_path, 120);
    if (error) throw error;
    window.open(data.signedUrl, '_blank');
  } catch (error) {
    console.error('Failed to download document:', error);
    toast.error('Failed to download document');
  }
}

async function cancelPurchaseOrder(poId) {
  const po = purchaseOrdersList.find(p => p.id === poId);
  if (!po || po.status === 'received' || po.status === 'cancelled') return;
  
  const confirmed = await showConfirm('Cancel this purchase order?', 'Cancel Purchase Order');
  if (!confirmed) return;
  
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: 'cancelled' })
      .eq('id', poId);
    
    if (error) throw error;
    
    toast.success('Purchase order cancelled', 'Success');
    await loadPurchaseOrders();
  } catch (error) {
    console.error('Failed to cancel purchase order:', error);
    toast.error('Failed to cancel purchase order', 'Error');
  }
}

async function fetchInventoryTransactions(options = {}) {
  let query = supabase
    .from('inventory_transactions')
    .select(`
      id,
      transaction_type,
      quantity_change,
      quantity_before,
      quantity_after,
      created_at,
      notes,
      site_id,
      item_id,
      user_id,
      inventory_items:inventory_items(name, unit),
      sites:sites(name)
    `);
  
  if (options.itemId) {
    query = query.eq('item_id', options.itemId);
  }
  
  if (options.siteId) {
    query = query.eq('site_id', options.siteId);
  }
  
  if (options.type) {
    query = query.eq('transaction_type', options.type);
  }
  
  if (options.dateFrom) {
    query = query.gte('created_at', `${options.dateFrom}T00:00:00`);
  }
  
  if (options.dateTo) {
    query = query.lte('created_at', `${options.dateTo}T23:59:59`);
  }
  
  query = query.order('created_at', { ascending: false }).limit(options.limit || 100);
  
  const { data, error } = await query;
  if (error) throw error;
  
  const enriched = await enrichTransactionsWithUserNames(data || []);
  return enriched.map(transformTransactionRecord);
}

async function enrichTransactionsWithUserNames(entries) {
  const userIds = [...new Set(entries.map(entry => entry.user_id).filter(Boolean))];
  if (!userIds.length) return entries;
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    
    if (error) throw error;
    
    const map = {};
    (data || []).forEach(profile => {
      map[profile.id] = profile;
    });
    
    return entries.map(entry => ({
      ...entry,
      user_name: map[entry.user_id]?.full_name || null,
      user_email: map[entry.user_id]?.email || null
    }));
  } catch (error) {
    console.error('Failed to fetch user profiles for inventory history:', error);
    return entries;
  }
}

function transformTransactionRecord(record) {
  const item = record.inventory_items || {};
  const site = record.sites || {};
  
  return {
    id: record.id,
    transaction_type: record.transaction_type,
    quantity_change: record.quantity_change,
    quantity_before: record.quantity_before,
    quantity_after: record.quantity_after,
    created_at: record.created_at,
    notes: record.notes,
    site_id: record.site_id,
    site_name: site.name || '—',
    item_id: record.item_id,
    item_name: item.name || 'Unknown Item',
    unit: item.unit || '',
    user_id: record.user_id,
    user_name: record.user_name || (record.user_id ? 'Team Member' : 'System')
  };
}

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
    const typeFilter = document.getElementById('history-filter-type').value;
    const dateFrom = document.getElementById('history-filter-date-from').value;
    const dateTo = document.getElementById('history-filter-date-to').value;
    
    const transactions = await fetchInventoryTransactions({
      itemId: currentHistoryItemId,
      siteId: currentHistorySiteId,
      type: typeFilter !== 'all' ? typeFilter : null,
      dateFrom: dateFrom || null,
      dateTo: dateTo || null,
      limit: 100
    });
    
    currentHistoryData = transactions;
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

// Add event listener for stock action change to show/hide batch tracking
document.getElementById('stock-action')?.addEventListener('change', updateBatchTrackingVisibility);

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
    
    // Get batch tracking data (only for restock)
    const batchNumber = action === 'restock' ? formData.get('batch_number')?.trim() : null;
    const lotNumber = action === 'restock' ? formData.get('lot_number')?.trim() : null;
    const expirationDate = action === 'restock' ? formData.get('expiration_date') || null : null;
    const manufacturedDate = action === 'restock' ? formData.get('manufactured_date') || null : null;
    const warehouseLocationId = action === 'restock' ? (formData.get('warehouse_location_id') || null) : null;
    const binLocation = action === 'restock' ? formData.get('bin_location')?.trim() || null : null;
    
    // Update or insert site inventory
    const { error: upsertError } = await supabase
      .from('site_inventory')
      .upsert({
        site_id: siteId,
        item_id: itemId,
        quantity: newQty,
        updated_at: new Date().toISOString(),
        bin_location: binLocation,
        warehouse_location_id: warehouseLocationId ? parseInt(warehouseLocationId, 10) : null,
        ...(action === 'restock' ? { last_restocked_at: new Date().toISOString() } : {})
      }, {
        onConflict: 'site_id,item_id'
      });
    
    if (upsertError) throw upsertError;
    
    // Create batch record if batch number provided (for restock)
    if (action === 'restock' && batchNumber) {
      try {
        const { error: batchError } = await supabase
          .from('inventory_batches')
          .upsert({
            item_id: itemId,
            site_id: siteId,
            batch_number: batchNumber,
            lot_number: lotNumber || null,
            quantity: quantity,
            expiration_date: expirationDate || null,
            manufactured_date: manufacturedDate || null,
            bin_location: binLocation,
            warehouse_location_id: warehouseLocationId ? parseInt(warehouseLocationId, 10) : null,
            received_date: new Date().toISOString()
          }, {
            onConflict: 'site_id,item_id,batch_number'
          });
        
        if (batchError) {
          console.warn('Failed to create batch record:', batchError);
          // Don't fail the whole operation if batch creation fails
        }
      } catch (batchErr) {
        console.warn('Error creating batch:', batchErr);
        // Continue even if batch creation fails
      }
    }
    
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
  
  // Clear advanced fields
  document.getElementById('item-batch-number').value = '';
  document.getElementById('item-lot-number').value = '';
  document.getElementById('item-expiration-date').value = '';
  document.getElementById('item-manufactured-date').value = '';
  document.getElementById('item-warehouse-location').value = '';
  document.getElementById('item-bin-location').value = '';
  
  // Load categories
  await loadCategoryDropdown();
  
  // Load warehouse locations for all sites (if any site is selected in filter)
  const currentSiteFilter = document.getElementById('site-filter')?.value;
  if (currentSiteFilter && currentSiteFilter !== 'all') {
    await populateWarehouseLocations(document.getElementById('item-warehouse-location'), parseInt(currentSiteFilter, 10));
  }
  
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
    window.currentFilter = currentFilter; // Update global reference
    
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

document.getElementById('add-supplier-btn')?.addEventListener('click', () => openSupplierModal());
document.getElementById('refresh-suppliers-btn')?.addEventListener('click', () => loadSuppliers(true));
document.getElementById('new-po-btn')?.addEventListener('click', () => openPurchaseOrderModal());
document.getElementById('po-refresh-btn')?.addEventListener('click', () => loadPurchaseOrders(true));
document.getElementById('po-status-filter')?.addEventListener('change', renderPurchaseOrdersTable);
document.getElementById('po-supplier-filter')?.addEventListener('change', renderPurchaseOrdersTable);
document.getElementById('po-supplier')?.addEventListener('change', updatePOItemSuggestions);
document.getElementById('add-po-item-row')?.addEventListener('click', () => addPOItemRow());
document.getElementById('supplier-form')?.addEventListener('submit', saveSupplier);
document.getElementById('po-form')?.addEventListener('submit', submitPurchaseOrder);
document.getElementById('transfer-form')?.addEventListener('submit', submitTransferRequest);
document.getElementById('add-po-payment-btn')?.addEventListener('click', () => togglePaymentForm(true));
document.getElementById('cancel-po-payment')?.addEventListener('click', () => togglePaymentForm(false));
document.getElementById('po-payment-form')?.addEventListener('submit', addPurchaseOrderPayment);
document.getElementById('add-po-doc-btn')?.addEventListener('click', () => toggleDocForm(true));
document.getElementById('cancel-po-doc')?.addEventListener('click', () => toggleDocForm(false));
document.getElementById('po-doc-form')?.addEventListener('submit', uploadPurchaseOrderDocument);

window.editSupplier = (supplierId) => openSupplierModal(supplierId);
window.createPOForSupplier = (supplierId) => openPurchaseOrderModal(supplierId);
window.createPOFromLowStockItem = (itemId, siteId, suggestedQty) => createPOFromLowStockItem(itemId, siteId, suggestedQty);
window.markPurchaseOrderReceived = (poId) => markPurchaseOrderReceived(poId);
window.cancelPurchaseOrder = (poId) => cancelPurchaseOrder(poId);
window.emailPurchaseOrder = (poId) => emailPurchaseOrder(poId);
window.openPODetailModal = (poId) => openPODetailModal(poId);
window.downloadPurchaseOrderDocument = (docId) => downloadPurchaseOrderDocument(docId);

// Expose transfer functions globally
window.openTransferModal = () => openTransferModal();
window.viewTransferDetails = (transferId) => viewTransferDetails(transferId);
window.approveTransfer = (transferId) => approveTransfer(transferId);
window.cancelTransfer = (transferId) => cancelTransfer(transferId);
window.completeTransfer = (transferId) => completeTransfer(transferId);

// Site filter - use event delegation to handle custom dropdown changes
document.addEventListener('change', (e) => {
  if (e.target.id === 'site-filter' || e.target.closest('#site-filter') || 
      (e.target.closest('.nfg-select-wrapper') && e.target.closest('.nfg-select-wrapper').querySelector('select')?.id === 'site-filter')) {
    const select = document.getElementById('site-filter');
    let value;
    
    // Get value from custom dropdown or regular select
    if (select.dataset.customDropdown === 'true') {
      const wrapper = select.closest('.nfg-select-wrapper');
      if (wrapper) {
        const hiddenInput = wrapper.querySelector('input[type="hidden"]');
        value = hiddenInput?.value || select.value;
      } else {
        value = select.value;
      }
    } else {
      value = select.value;
    }
    
    currentSiteFilter = value;
    window.currentSiteFilter = currentSiteFilter; // Update global reference
  renderInventory();
  }
});

// Load site filter dropdown
async function loadSiteFilter() {
  const select = document.getElementById('site-filter');
  const sitesList = await fetchSites();
  
  // Store current value if custom dropdown is already initialized
  let currentValue = 'all';
  if (select.dataset.customDropdown === 'true') {
    const wrapper = select.closest('.nfg-select-wrapper');
    const hiddenInput = wrapper?.querySelector('input[type="hidden"]');
    currentValue = hiddenInput?.value || select.value;
    
    // Remove existing wrapper if any
    if (wrapper) {
      select.dataset.initialized = 'false';
      wrapper.replaceWith(select);
    }
  } else {
    currentValue = select.value;
  }
  
  select.innerHTML = '<option value="all">All Sites</option>' + 
    sitesList.map(site => `<option value="${site.id}">${site.name}</option>`).join('');
  
  // Restore previous value
  select.value = currentValue;
  
  // Reinitialize custom dropdown after updating options
  if (select.dataset.customDropdown === 'true' && window.NFGDropdown) {
    new window.NFGDropdown(select);
    select.dataset.initialized = 'true';
    
    // Set value after initialization
    if (window.NFGDropdown && currentValue) {
      // Find the dropdown instance and set value
      setTimeout(() => {
        const newWrapper = select.closest('.nfg-select-wrapper');
        const newHiddenInput = newWrapper?.querySelector('input[type="hidden"]');
        if (newHiddenInput && currentValue !== 'all') {
          newHiddenInput.value = currentValue;
          select.value = currentValue;
          // Update displayed text
          const selectedText = newWrapper?.querySelector('.nfg-selected-text');
          const selectedOption = select.querySelector(`option[value="${currentValue}"]`);
          if (selectedText && selectedOption) {
            selectedText.textContent = selectedOption.textContent;
            selectedText.classList.remove('placeholder');
          }
        }
      }, 0);
    }
  }
}

// Logout
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = './index.html';
});

// Make functions and variables globally available for bulk operations script
window.renderInventory = renderInventory;
window.selectedInventory = selectedInventory;
window.allInventory = allInventory;
window.currentFilter = currentFilter;
window.currentSiteFilter = currentSiteFilter;
window.supabase = supabase;
window.toast = toast;
window.showConfirm = showConfirm;

// Make currentUserProfile globally available
window.currentUserProfile = currentUserProfile;

// Update global references when they change (wrap getCurrentUser)
const originalGetCurrentUser = getCurrentUser;
getCurrentUser = async function() {
  const user = await originalGetCurrentUser();
  window.currentUserProfile = currentUserProfile;
  window.currentUser = currentUser;
  return user;
};

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
    document.querySelector('.inventory-view-tab[data-view="suppliers"]')?.classList.add('hidden');
    document.getElementById('suppliers-inline-actions')?.classList.add('hidden');
  }
  
  await loadSiteFilter();
  
  try {
  await renderInventory();
  } catch (error) {
    console.error('[Inventory] Failed to render inventory:', error);
    toast.error('Failed to load inventory data. Some features may be unavailable.');
  }
  
  initInventoryViewTabs();
  fetchUsageTrends().catch((error) => console.warn('Usage trend preload failed:', error));
  
  // Initialize automated low stock checking
  initLowStockChecking();
  
  // Initialize custom dropdowns after DOM is ready
  if (window.initCustomDropdowns) {
    window.initCustomDropdowns();
  }
  
  console.log('[Inventory] Initialization complete');
}

init();

