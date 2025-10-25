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
  
  try {
    const siteInventory = await fetchSiteInventory();
    
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
          <td colspan="5" class="px-4 py-8 text-center text-gray-500">
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
        'out': { color: 'bg-red-100 text-red-700', icon: '', text: 'Out of Stock' },
        'low': { color: 'bg-orange-100 text-orange-700', icon: '', text: 'Low Stock' },
        'warning': { color: 'bg-yellow-100 text-yellow-700', icon: '', text: 'Warning' },
        'ok': { color: 'bg-green-100 text-green-700', icon: '', text: 'In Stock' }
      };
      
      const status = statusConfig[item.stock_status] || statusConfig['ok'];
      
      return `
        <tr class="hover:bg-nfglight/30 transition">
          <td class="px-4 py-3">
            <div class="flex items-center gap-2">
              <i data-lucide="${item.category_icon || 'package'}" class="w-5 h-5 text-nfgblue"></i>
              <div>
                <div class="font-medium text-nfgblue">${item.item_name}</div>
                <div class="text-xs text-gray-500 md:hidden">${item.category_name}</div>
                <div class="text-xs text-gray-500">${item.site_name}</div>
              </div>
            </div>
          </td>
          <td class="px-4 py-3 text-sm hidden md:table-cell">${item.category_name}</td>
          <td class="px-4 py-3 text-center">
            <div class="font-semibold text-nfgblue">${item.quantity}</div>
            <div class="text-xs text-gray-500">${item.unit}</div>
          </td>
          <td class="px-4 py-3 text-center">
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${status.color}">
              <span>${status.icon}</span>
              <span class="hidden sm:inline">${status.text}</span>
            </span>
          </td>
          <td class="px-4 py-3 text-center">
            <div class="flex items-center justify-center gap-1">
              <button onclick="manageStock(${item.site_id}, ${item.item_id}, '${item.item_name.replace(/'/g, "\\'")}', ${item.quantity})" 
                      class="p-1.5 rounded-lg hover:bg-nfglight text-nfgblue" title="Manage Stock">
                <i data-lucide="package" class="w-4 h-4"></i>
              </button>
              <button onclick="viewHistory(${item.item_id}, ${item.site_id}, '${item.item_name.replace(/'/g, "\\'")}', '${item.site_name.replace(/'/g, "\\'")})" 
                      class="p-1.5 rounded-lg hover:bg-nfglight text-nfgblue" title="View History">
                <i data-lucide="history" class="w-4 h-4"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
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

// View transaction history
window.viewHistory = async function(itemId, siteId, itemName, siteName) {
  document.getElementById('history-item-name').textContent = itemName;
  document.getElementById('history-site-name').textContent = siteName;
  
  const { data: transactions, error } = await supabase
    .from('recent_inventory_activity')
    .select('*')
    .eq('item_id', itemId)
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(50);
  
  if (error) {
    console.error('Error fetching history:', error);
    toast.error('Failed to load transaction history', 'Error');
    return;
  }
  
  const historyList = document.getElementById('history-list');
  
  if (!transactions || transactions.length === 0) {
    historyList.innerHTML = '<p class="text-center text-gray-500 py-8">No transaction history yet</p>';
  } else {
    historyList.innerHTML = transactions.map(t => {
      const typeConfig = {
        'restock': { icon: 'plus', color: 'text-green-600', label: 'Restocked' },
        'use': { icon: 'minus', color: 'text-red-600', label: 'Used' },
        'adjustment': { icon: 'settings', color: 'text-blue-600', label: 'Adjusted' },
        'transfer': { icon: 'arrow-right-left', color: 'text-purple-600', label: 'Transferred' },
        'return': { icon: 'corner-up-left', color: 'text-orange-600', label: 'Returned' }
      };
      
      const config = typeConfig[t.transaction_type] || typeConfig['adjustment'];
      const date = new Date(t.created_at).toLocaleString();
      const changeText = t.quantity_change > 0 ? `+${t.quantity_change}` : t.quantity_change;
      
      return `
        <div class="border border-nfgray rounded-xl p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <i data-lucide="${config.icon}" class="w-5 h-5"></i>
              <div>
                <div class="font-medium ${config.color}">${config.label}</div>
                <div class="text-xs text-gray-500">${date}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold ${t.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}">${changeText} ${t.unit}</div>
              <div class="text-xs text-gray-500">${t.quantity_before} → ${t.quantity_after}</div>
            </div>
          </div>
          ${t.user_name ? `<div class="text-xs text-gray-600 mb-1">User: ${t.user_name}</div>` : ''}
          ${t.job_title ? `<div class="text-xs text-gray-600 mb-1">Job: ${t.job_title}</div>` : ''}
          ${t.notes ? `<div class="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded-lg">${t.notes}</div>` : ''}
        </div>
      `;
    }).join('');
  }
  
  const modal = document.getElementById('historyModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  if (window.lucide) lucide.createIcons();
};

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

