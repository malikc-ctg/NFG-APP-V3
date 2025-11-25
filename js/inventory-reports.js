// ============================================
// Inventory Reports JavaScript
// Phase 6: Advanced Inventory Reporting
// ============================================

import { supabase } from './supabase.js';

let inventoryReportsInitialized = false;
let inventoryReportsData = {
  summary: null,
  valuation: null,
  abcAnalysis: null,
  expiringItems: null,
  stockTrends: null,
  costAnalysis: null,
  usageForecast: null
};

let stockMovementChart = null;

// Initialize inventory reports
async function initInventoryReports() {
  if (inventoryReportsInitialized) return;
  
  try {
    await Promise.all([
      loadInventorySummary(),
      loadInventoryValuation(),
      loadABCAnalysis(),
      loadExpiringItems(),
      loadStockTrends(),
      loadCostAnalysis(),
      loadUsageForecast()
    ]);
    
    // Setup filter listeners
    document.getElementById('expiring-filter')?.addEventListener('change', () => {
      loadExpiringItems();
    });
    
    inventoryReportsInitialized = true;
  } catch (error) {
    console.error('Error initializing inventory reports:', error);
  }
}

// Load inventory summary stats
async function loadInventorySummary() {
  try {
    const { data, error } = await supabase.rpc('get_inventory_summary_stats');
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const stats = data[0];
      document.getElementById('inventory-report-total-items').textContent = stats.total_items || 0;
      document.getElementById('inventory-report-total-value').textContent = 
        formatCurrency(stats.total_value || 0);
      document.getElementById('inventory-report-low-stock').textContent = stats.low_stock_count || 0;
      document.getElementById('inventory-report-expiring').textContent = stats.expiring_soon_count || 0;
    }
  } catch (error) {
    console.error('Error loading inventory summary:', error);
  }
}

// Load inventory valuation report
async function loadInventoryValuation() {
  try {
    const { data, error } = await supabase
      .from('inventory_valuation_report')
      .select('*')
      .order('site_name')
      .order('category_name')
      .order('item_name');
    
    if (error) throw error;
    
    inventoryReportsData.valuation = data || [];
    
    // Group by site and category for summary
    const summary = {};
    data.forEach(item => {
      const key = `${item.site_name}|${item.category_name}`;
      if (!summary[key]) {
        summary[key] = {
          site_name: item.site_name,
          category_name: item.category_name,
          total_value: 0
        };
      }
      summary[key].total_value += parseFloat(item.total_value || 0);
    });
    
    const tbody = document.getElementById('inventory-valuation-summary');
    if (tbody) {
      const rows = Object.values(summary)
        .sort((a, b) => b.total_value - a.total_value)
        .slice(0, 10)
        .map(item => `
          <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
            <td class="px-4 py-2">${sanitizeText(item.site_name)}</td>
            <td class="px-4 py-2">${sanitizeText(item.category_name || '—')}</td>
            <td class="px-4 py-2 text-right font-medium">${formatCurrency(item.total_value)}</td>
          </tr>
        `).join('');
      
      tbody.innerHTML = rows || '<tr><td colspan="3" class="px-4 py-4 text-center text-gray-500">No data available</td></tr>';
    }
  } catch (error) {
    console.error('Error loading inventory valuation:', error);
    const tbody = document.getElementById('inventory-valuation-summary');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3" class="px-4 py-4 text-center text-red-500">Error loading data</td></tr>';
    }
  }
}

// Load ABC Analysis
async function loadABCAnalysis() {
  try {
    const { data, error } = await supabase
      .from('inventory_abc_analysis')
      .select('*')
      .order('total_value', { ascending: false });
    
    if (error) throw error;
    
    inventoryReportsData.abcAnalysis = data || [];
    
    const categoryCounts = {
      A: data.filter(item => item.abc_category === 'A').length,
      B: data.filter(item => item.abc_category === 'B').length,
      C: data.filter(item => item.abc_category === 'C').length
    };
    
    document.getElementById('abc-category-a-count').textContent = categoryCounts.A;
    document.getElementById('abc-category-b-count').textContent = categoryCounts.B;
    document.getElementById('abc-category-c-count').textContent = categoryCounts.C;
  } catch (error) {
    console.error('Error loading ABC analysis:', error);
  }
}

// Load expiring items
async function loadExpiringItems() {
  try {
    const filter = document.getElementById('expiring-filter')?.value || 'all';
    
    let query = supabase
      .from('expiring_items_detailed_report')
      .select('*')
      .order('expiration_date', { ascending: true });
    
    if (filter !== 'all') {
      query = query.eq('expiration_status', filter);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    inventoryReportsData.expiringItems = data || [];
    
    const tbody = document.getElementById('expiring-items-table');
    if (tbody) {
      const rows = data.slice(0, 50).map(item => {
        const daysLeft = item.days_until_expiration;
        let statusClass = 'text-gray-600';
        if (daysLeft < 0) statusClass = 'text-red-600 font-semibold';
        else if (daysLeft <= 7) statusClass = 'text-orange-600 font-semibold';
        else if (daysLeft <= 30) statusClass = 'text-yellow-600';
        
        return `
          <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
            <td class="px-4 py-2">${sanitizeText(item.item_name)}</td>
            <td class="px-4 py-2">${sanitizeText(item.site_name)}</td>
            <td class="px-4 py-2">${sanitizeText(item.batch_number || '—')}</td>
            <td class="px-4 py-2 text-center">${item.quantity} ${item.unit || ''}</td>
            <td class="px-4 py-2">${item.expiration_date ? new Date(item.expiration_date).toLocaleDateString() : '—'}</td>
            <td class="px-4 py-2 text-center ${statusClass}">${daysLeft !== null ? (daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `${daysLeft} days`) : '—'}</td>
          </tr>
        `;
      }).join('');
      
      tbody.innerHTML = rows || '<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">No expiring items</td></tr>';
    }
  } catch (error) {
    console.error('Error loading expiring items:', error);
    const tbody = document.getElementById('expiring-items-table');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-red-500">Error loading data</td></tr>';
    }
  }
}

// Load stock movement trends
async function loadStockTrends() {
  try {
    const { data, error } = await supabase
      .from('stock_movement_trends')
      .select('*')
      .order('month', { ascending: false })
      .limit(6);
    
    if (error) throw error;
    
    inventoryReportsData.stockTrends = data || [];
    
    // Prepare chart data
    const months = [...new Set(data.map(item => new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })))].reverse();
    const restocked = months.map(month => {
      const monthData = data.filter(item => 
        new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === month
      );
      return monthData.reduce((sum, item) => sum + (parseFloat(item.total_restocked) || 0), 0);
    });
    const used = months.map(month => {
      const monthData = data.filter(item => 
        new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) === month
      );
      return monthData.reduce((sum, item) => sum + (parseFloat(item.total_used) || 0), 0);
    });
    
    // Render chart
    const ctx = document.getElementById('stock-movement-chart');
    if (ctx) {
      if (stockMovementChart) {
        stockMovementChart.destroy();
      }
      
      stockMovementChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: months,
          datasets: [
            {
              label: 'Restocked',
              data: restocked,
              borderColor: 'rgb(34, 197, 94)',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              tension: 0.4
            },
            {
              label: 'Used',
              data: used,
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top'
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Error loading stock trends:', error);
  }
}

// Load cost analysis
async function loadCostAnalysis() {
  try {
    const { data, error } = await supabase
      .from('cost_analysis_report')
      .select('*')
      .order('total_value', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    inventoryReportsData.costAnalysis = data || [];
    
    const tbody = document.getElementById('cost-analysis-table');
    if (tbody) {
      const rows = data.map(item => `
        <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
          <td class="px-4 py-2">${sanitizeText(item.item_name)}</td>
          <td class="px-4 py-2">${sanitizeText(item.category_name || '—')}</td>
          <td class="px-4 py-2 text-right">${formatCurrency(item.avg_unit_cost || 0)}</td>
          <td class="px-4 py-2 text-right">${formatCurrency(item.min_unit_cost || 0)}</td>
          <td class="px-4 py-2 text-right">${formatCurrency(item.max_unit_cost || 0)}</td>
          <td class="px-4 py-2 text-right font-medium">${formatCurrency(item.total_value || 0)}</td>
        </tr>
      `).join('');
      
      tbody.innerHTML = rows || '<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">No data available</td></tr>';
    }
  } catch (error) {
    console.error('Error loading cost analysis:', error);
    const tbody = document.getElementById('cost-analysis-table');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-red-500">Error loading data</td></tr>';
    }
  }
}

// Load usage forecast
async function loadUsageForecast() {
  try {
    const { data, error } = await supabase
      .from('usage_forecast')
      .select('*')
      .order('forecast_status')
      .order('months_remaining', { ascending: true })
      .limit(50);
    
    if (error) throw error;
    
    inventoryReportsData.usageForecast = data || [];
    
    const tbody = document.getElementById('usage-forecast-table');
    if (tbody) {
      const rows = data.map(item => {
        let statusText = 'Stock Adequate';
        let statusClass = 'text-green-600';
        if (item.forecast_status === 'needs_restock_soon') {
          statusText = 'Restock Soon';
          statusClass = 'text-red-600 font-semibold';
        } else if (item.forecast_status === 'needs_restock_later') {
          statusText = 'Restock Later';
          statusClass = 'text-orange-600';
        }
        
        return `
          <tr class="border-b border-nfgray dark:border-gray-700 last:border-0">
            <td class="px-4 py-2">${sanitizeText(item.item_name)}</td>
            <td class="px-4 py-2">${sanitizeText(item.site_name)}</td>
            <td class="px-4 py-2 text-center">${item.current_quantity || 0}</td>
            <td class="px-4 py-2 text-center">${item.avg_monthly_usage ? item.avg_monthly_usage.toFixed(1) : '—'}</td>
            <td class="px-4 py-2 text-center">${item.months_remaining !== null ? item.months_remaining.toFixed(1) : '—'}</td>
            <td class="px-4 py-2 text-center ${statusClass}">${statusText}</td>
          </tr>
        `;
      }).join('');
      
      tbody.innerHTML = rows || '<tr><td colspan="6" class="px-4 py-4 text-center text-gray-500">No forecast data available</td></tr>';
    }
  } catch (error) {
    console.error('Error loading usage forecast:', error);
    const tbody = document.getElementById('usage-forecast-table');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="px-4 py-4 text-center text-red-500">Error loading data</td></tr>';
    }
  }
}

// Export functions to window for onclick handlers
window.exportInventoryValuationReport = exportInventoryValuationReport;
window.exportABCAnalysis = exportABCAnalysis;
window.exportExpiringItems = exportExpiringItems;
window.exportCostAnalysis = exportCostAnalysis;
window.exportUsageForecast = exportUsageForecast;
window.initInventoryReports = initInventoryReports;

function exportInventoryValuationReport() {
  if (!inventoryReportsData.valuation || inventoryReportsData.valuation.length === 0) {
    toast?.error('No data to export', 'Error') || alert('No data to export');
    return;
  }
  
  const headers = ['Site', 'Item', 'Category', 'Quantity', 'Unit', 'Unit Cost', 'Total Value', 'Warehouse Location', 'Bin Location'];
  const rows = inventoryReportsData.valuation.map(item => [
    item.site_name,
    item.item_name,
    item.category_name || '',
    item.quantity,
    item.unit || '',
    item.unit_cost || 0,
    item.total_value || 0,
    item.warehouse_location_name || '',
    item.bin_location || ''
  ]);
  
  exportToCSV('inventory-valuation-report', headers, rows);
}

function exportABCAnalysis() {
  if (!inventoryReportsData.abcAnalysis || inventoryReportsData.abcAnalysis.length === 0) {
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error('No data to export', 'Error');
    } else {
      alert('No data to export');
    }
    return;
  }
  
  const headers = ['Item', 'Total Value', 'Total Quantity', 'Value %', 'Cumulative %', 'ABC Category'];
  const rows = inventoryReportsData.abcAnalysis.map(item => [
    item.item_name,
    item.total_value || 0,
    item.total_quantity || 0,
    item.value_percentage ? item.value_percentage.toFixed(2) : 0,
    item.cumulative_percentage ? item.cumulative_percentage.toFixed(2) : 0,
    item.abc_category
  ]);
  
  exportToCSV('abc-analysis', headers, rows);
}

function exportExpiringItems() {
  if (!inventoryReportsData.expiringItems || inventoryReportsData.expiringItems.length === 0) {
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error('No data to export', 'Error');
    } else {
      alert('No data to export');
    }
    return;
  }
  
  const headers = ['Item', 'Site', 'Batch Number', 'Lot Number', 'Quantity', 'Unit', 'Expiration Date', 'Days Until Expiration', 'Status'];
  const rows = inventoryReportsData.expiringItems.map(item => [
    item.item_name,
    item.site_name,
    item.batch_number || '',
    item.lot_number || '',
    item.quantity,
    item.unit || '',
    item.expiration_date || '',
    item.days_until_expiration !== null ? item.days_until_expiration : '',
    item.expiration_status
  ]);
  
  exportToCSV('expiring-items', headers, rows);
}

function exportCostAnalysis() {
  if (!inventoryReportsData.costAnalysis || inventoryReportsData.costAnalysis.length === 0) {
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error('No data to export', 'Error');
    } else {
      alert('No data to export');
    }
    return;
  }
  
  const headers = ['Item', 'Category', 'Sites Count', 'Total Quantity', 'Avg Unit Cost', 'Min Unit Cost', 'Max Unit Cost', 'Total Value', 'Supplier Count', 'Avg Purchase Cost'];
  const rows = inventoryReportsData.costAnalysis.map(item => [
    item.item_name,
    item.category_name || '',
    item.sites_count || 0,
    item.total_quantity_across_sites || 0,
    item.avg_unit_cost || 0,
    item.min_unit_cost || 0,
    item.max_unit_cost || 0,
    item.total_value || 0,
    item.supplier_count || 0,
    item.avg_purchase_cost || ''
  ]);
  
  exportToCSV('cost-analysis', headers, rows);
}

function exportUsageForecast() {
  if (!inventoryReportsData.usageForecast || inventoryReportsData.usageForecast.length === 0) {
    if (typeof toast !== 'undefined' && toast.error) {
      toast.error('No data to export', 'Error');
    } else {
      alert('No data to export');
    }
    return;
  }
  
  const headers = ['Item', 'Site', 'Current Quantity', 'Avg Monthly Usage', 'Months Remaining', 'Status'];
  const rows = inventoryReportsData.usageForecast.map(item => [
    item.item_name,
    item.site_name,
    item.current_quantity || 0,
    item.avg_monthly_usage ? item.avg_monthly_usage.toFixed(2) : '',
    item.months_remaining !== null ? item.months_remaining.toFixed(1) : '',
    item.forecast_status
  ]);
  
  exportToCSV('usage-forecast', headers, rows);
}

// Helper function to export to CSV
function exportToCSV(filename, headers, rows) {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  if (typeof toast !== 'undefined' && toast.success) {
    toast.success('Report exported successfully', 'Success');
  } else {
    console.log('Report exported');
  }
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

// Helper function to sanitize text
function sanitizeText(text) {
  if (!text) return '—';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

