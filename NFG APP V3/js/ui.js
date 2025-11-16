console.log('UI module loaded.')

// Current filter state
let currentFilter = 'all'

// Render sites to the grid
export function renderSites(sites) {
  console.log('[UI] Rendering sites:', sites?.length || 0, 'sites')
  const grid = document.getElementById('sites-grid')
  if (!grid) {
    console.error('[UI] ❌ sites-grid element not found!')
    return
  }
  
  // Apply current filter
  const filteredSites = filterSites(sites, currentFilter)
  console.log('[UI] Filtered sites:', filteredSites?.length || 0, 'sites')
  
  if (filteredSites.length === 0) {
    // Show different empty state based on whether we have sites or not
    const hasAnySites = sites.length > 0
    grid.innerHTML = createEmptyState(hasAnySites)
  } else {
    grid.innerHTML = filteredSites.map(site => createSiteCard(site)).join('')
    console.log('[UI] ✅ Sites rendered! Check for View Site buttons with data-action="view-site"')
  }
}

// Filter sites based on status
function filterSites(sites, filter) {
  if (filter === 'all') {
    return sites
  }
  return sites.filter(site => site.status === filter)
}

// Apply filter and update UI
function applyFilter(filterValue) {
  currentFilter = filterValue
  
  // Update filter label
  const filterLabel = document.getElementById('filter-label')
  if (filterLabel) {
    if (filterValue === 'all') {
      filterLabel.textContent = 'All Sites'
    } else {
      filterLabel.textContent = filterValue
    }
  }
  
  // Close the dropdown
  const dropdown = document.getElementById('sites-filter')
  if (dropdown) {
    dropdown.classList.add('hidden')
  }
  
  // Re-render sites with new filter
  const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]')
  renderSites(sites)
}

// Create empty state when no sites exist
function createEmptyState(hasAnySites = false) {
  if (hasAnySites && currentFilter !== 'all') {
    // Show "no sites match filter" message
    return `
      <div class="col-span-full flex flex-col items-center justify-center py-16 px-4">
        <div class="bg-white border-2 border-dashed border-nfgray rounded-xl p-12 max-w-md text-center">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <h3 class="text-nfgblue font-semibold text-xl mb-2">No Sites Found</h3>
          <p class="text-nftext text-sm mb-6">No sites match the "${currentFilter}" status. Try selecting a different filter.</p>
          <button 
            data-action="filter-sites"
            data-value="all"
            class="bg-nfgblue hover:bg-nfgdark text-white rounded-xl px-6 py-3 font-medium transition inline-flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
            </svg>
            Show All Sites
          </button>
        </div>
      </div>
    `
  }
  
  // Show "no sites at all" message
  return `
    <div class="col-span-full flex flex-col items-center justify-center py-16 px-4">
      <div class="bg-white border-2 border-dashed border-nfgray rounded-xl p-12 max-w-md text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
        </svg>
        <h3 class="text-nfgblue font-semibold text-xl mb-2">No Sites Yet</h3>
        <p class="text-nftext text-sm mb-6">Get started by adding your first site. Sites represent the buildings or properties you manage.</p>
        <button 
          data-action="add-site"
          class="bg-nfgblue hover:bg-nfgdark text-white rounded-xl px-6 py-3 font-medium transition inline-flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Your First Site
        </button>
      </div>
    </div>
  `
}

// Create a site card HTML
function createSiteCard(site) {
  const statusColors = {
    'Active': 'bg-green-100 text-green-700',
    'Paused': 'bg-yellow-100 text-yellow-700',
    'In Setup': 'bg-blue-100 text-blue-700'
  }
  
  const statusClass = statusColors[site.status] || 'bg-gray-100 text-gray-700'
  
  return `
    <div class="bg-white border border-nfgray rounded-xl p-4 shadow-nfg hover:shadow-lg transition-shadow">
      <!-- Header -->
      <div class="flex justify-between items-start mb-3">
        <div>
          <h3 class="text-nfgblue font-semibold text-lg">${site.name}</h3>
          <p class="text-gray-500 text-xs mt-1">${site.address}</p>
        </div>
        <span class="px-2 py-1 rounded-lg text-xs font-medium ${statusClass}">${site.status}</span>
      </div>
      
      <!-- KPIs -->
      <div class="grid grid-cols-3 gap-2 mb-4 py-3 border-t border-b border-nfgray">
        <div class="text-center">
          <p class="text-nfgblue text-xl font-semibold">${site.jobs_completed || 0}</p>
          <p class="text-gray-500 text-xs">Jobs Done</p>
        </div>
        <div class="text-center">
          <p class="text-nfgblue text-xl font-semibold">${site.upcoming_bookings || 0}</p>
          <p class="text-gray-500 text-xs">Upcoming</p>
        </div>
        <div class="text-center">
          <p class="text-nfgblue text-xl font-semibold">${site.deal_value ? Number(site.deal_value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'}</p>
          <p class="text-gray-500 text-xs">Deal Value</p>
        </div>
      </div>
      
      <!-- Action Button -->
      <button 
        data-action="view-site" 
        data-site-id="${site.id}"
        class="w-full bg-nfgblue hover:bg-nfgdark text-white rounded-xl py-2 text-sm font-medium transition">
        View Site
      </button>
    </div>
  `
}

// Track if UI has been initialized to prevent duplicate listeners
let uiInitialized = false

// Initialize UI event handlers
export function initializeUI() {
  if (uiInitialized) {
    console.log('[UI] Already initialized, skipping...')
    return
  }
  
  console.log('[UI] Initializing UI event handlers...')
  uiInitialized = true
  
  // Handle all clicks with event delegation
  document.addEventListener('click', (e) => {
    // View Site button
    const viewBtn = e.target.closest('[data-action="view-site"]')
    if (viewBtn) {
      e.preventDefault()
      e.stopPropagation()
      const siteId = viewBtn.dataset.siteId
      console.log(`[UI] ✅ View Site button clicked! Site ID: ${siteId}`)
      openSiteDetailModal(siteId)
      return
    }
    
    // Add Site button
    const addBtn = e.target.closest('[data-action="add-site"]')
    if (addBtn) {
      e.preventDefault()
      console.log('[UI] Add Site clicked')
      openAddSiteModal()
      return
    }
    
    // Delete Site button
    const deleteBtn = e.target.closest('[data-action="delete-site"]')
    if (deleteBtn) {
      e.preventDefault()
      console.log('[UI] Delete Site clicked')
      openDeleteConfirmModal()
      return
    }
    
    // Confirm Delete button
    const confirmDeleteBtn = e.target.closest('[data-action="confirm-delete-site"]')
    if (confirmDeleteBtn) {
      e.preventDefault()
      console.log('[UI] Confirm Delete Site clicked')
      deleteSite()
      return
    }
    
    // Filter Sites button
    const filterBtn = e.target.closest('[data-action="filter-sites"]')
    if (filterBtn) {
      e.preventDefault()
      const filterValue = filterBtn.dataset.value
      console.log('[UI] Filter Sites clicked:', filterValue)
      applyFilter(filterValue)
      return
    }
    
    // Close modal buttons
    const closeModalBtn = e.target.closest('[data-action="close-modal"]')
    if (closeModalBtn) {
      e.preventDefault()
      const targetModal = closeModalBtn.dataset.target
      console.log('[UI] Close modal clicked:', targetModal)
      
      if (targetModal === 'siteDetailModal') {
        closeSiteDetailModal()
      } else if (targetModal === 'deleteSiteConfirmModal') {
        closeDeleteConfirmModal()
      }
      return
    }
  }, true) // Use capture phase to ensure we catch the event
  
  // Handle modal close buttons
  document.getElementById('cancel-modal')?.addEventListener('click', closeAddSiteModal)
  document.getElementById('close-modal-x')?.addEventListener('click', closeAddSiteModal)
  
  // Close modal when clicking outside
  document.getElementById('add-site-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'add-site-modal') {
      closeAddSiteModal()
    }
  })
  
  // Handle custom site filter dropdown
  const filterRadios = document.querySelectorAll('input[name="site-filter"]')
  filterRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const filterId = e.target.id
      const filterValue = filterId.replace('filter-', '')
      console.log(`[UI] Filter changed to: ${filterValue}`)
      // TODO: Filter sites based on selection
    })
  })
  
  // Initialize sidebar toggle
  initSidebarToggle()
  
  // Initialize user profile
  initUserProfile()
}

// Sidebar toggle functionality
function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar')
  const toggleBtn = document.getElementById('sidebar-toggle')
  
  toggleBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed')
    
    // Save state to localStorage
    const isCollapsed = sidebar?.classList.contains('collapsed')
    localStorage.setItem('sidebar_collapsed', isCollapsed)
  })
  
  // Restore sidebar state from localStorage
  const savedState = localStorage.getItem('sidebar_collapsed')
  if (savedState === 'true') {
    sidebar?.classList.add('collapsed')
  }
}

// Initialize user profile in sidebar
async function initUserProfile() {
  // Get user from Supabase auth
  const { supabase } = await import('./supabase.js')
  const { data: { user } } = await supabase.auth.getUser()
  
  if (user) {
    // Set user name
    const userName = user.email?.split('@')[0] || 'User'
    const userNameEl = document.getElementById('user-name')
    if (userNameEl) {
      userNameEl.textContent = userName.charAt(0).toUpperCase() + userName.slice(1)
    }
    
    // Set user initials
    const initials = userName.charAt(0).toUpperCase()
    const initialsEl = document.getElementById('user-initials')
    if (initialsEl) {
      initialsEl.textContent = initials
    }
  }
}

// Modal functions
function openAddSiteModal() {
  const modal = document.getElementById('addSiteModal')
  const form = document.getElementById('add-site-form')
  const errorEl = document.getElementById('form-error')
  
  if (modal) {
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    form?.reset()
    errorEl?.classList.add('hidden')
  }
}

export function closeAddSiteModal() {
  const modal = document.getElementById('addSiteModal')
  const form = document.getElementById('add-site-form')
  const errorEl = document.getElementById('form-error')
  
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
    form?.reset()
    errorEl?.classList.add('hidden')
  }
}

// Store current site ID for delete operation
let currentSiteId = null

// Open site detail modal and populate with data
export async function openSiteDetailModal(siteId) {
  console.log('[UI] Opening modal for site ID:', siteId, 'Type:', typeof siteId)
  
  try {
    // Import supabase
    const { supabase } = await import('./supabase.js')
    
    // Try to get site from Supabase first
    let site = null
    
    console.log('[UI] Fetching site from Supabase...')
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', siteId)
      .single()
    
    if (error) {
      console.warn('[UI] Supabase error:', error.message)
      console.log('[UI] Falling back to localStorage...')
      
      // Fallback to localStorage
      const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]')
      console.log('[UI] Sites in localStorage:', sites)
      site = sites.find(s => s.id == siteId)
    } else {
      site = data
      console.log('[UI] ✅ Site found in Supabase:', site)
    }
    
    if (!site) {
      console.error('[UI] ❌ Site not found! ID:', siteId)
      console.error('[UI] Available sites:', JSON.parse(localStorage.getItem('nfg_sites') || '[]'))
      alert(`Site not found (ID: ${siteId}). The site may have been deleted.`)
      return
    }
    
    // Store current site ID for delete operation
    currentSiteId = siteId
    
    console.log('[UI] Populating modal with site data...')
    
    // Populate modal with site data
    document.getElementById('site-detail-name').textContent = site.name || 'Unknown Site'
    document.getElementById('site-detail-address').textContent = site.address || 'No address'
    document.getElementById('site-detail-status').textContent = site.status || 'Unknown'
    document.getElementById('site-detail-sqft').textContent = site.square_footage ? `${site.square_footage.toLocaleString()} sq ft` : '—'
    document.getElementById('site-detail-rating').textContent = site.rating || '0'
    document.getElementById('site-detail-phone').textContent = site.contact_phone || '—'
    document.getElementById('site-detail-email').textContent = site.contact_email || '—'
    document.getElementById('site-detail-jobs').textContent = site.jobsCompleted || site.jobs_completed || '0'
    document.getElementById('site-detail-bookings').textContent = site.upcomingBookings || site.upcoming_bookings || '0'
    document.getElementById('site-detail-notes').textContent = site.notes || 'No notes available.'
    
    // Show modal
    const modal = document.getElementById('siteDetailModal')
    if (modal) {
      console.log('[UI] ✅ Opening modal...')
      modal.classList.remove('hidden')
      modal.classList.add('flex')
      
      // Re-render Lucide icons
      if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 50)
      }
    } else {
      console.error('[UI] ❌ Modal element not found!')
    }
  } catch (error) {
    console.error('[UI] Error opening site modal:', error)
    alert('Error opening site details. Check console for details.')
  }
}

// Open delete confirmation modal
export function openDeleteConfirmModal() {
  if (!currentSiteId) {
    console.error('No site selected for deletion')
    return
  }
  
  // Get site data to show name in confirmation
  const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]')
  const site = sites.find(s => s.id == currentSiteId)
  
  if (site) {
    document.getElementById('delete-site-name').textContent = site.name
  }
  
  // Show confirmation modal
  const modal = document.getElementById('deleteSiteConfirmModal')
  if (modal) {
    modal.classList.remove('hidden')
    modal.classList.add('flex')
    
    // Re-render Lucide icons
    if (window.lucide) {
      setTimeout(() => window.lucide.createIcons(), 50)
    }
  }
}

// Delete site from localStorage
export function deleteSite() {
  if (!currentSiteId) {
    console.error('No site selected for deletion')
    return
  }
  
  try {
    // Get current sites
    const sites = JSON.parse(localStorage.getItem('nfg_sites') || '[]')
    
    // Filter out the site to delete
    const updatedSites = sites.filter(s => s.id != currentSiteId)
    
    // Save back to localStorage
    localStorage.setItem('nfg_sites', JSON.stringify(updatedSites))
    
    console.log(`Site ${currentSiteId} deleted successfully`)
    
    // Close both modals
    closeSiteDetailModal()
    closeDeleteConfirmModal()
    
    // Refresh the sites grid
    renderSites(updatedSites)
    
    // Also refresh full sites page if it exists
    if (typeof renderSitesFullPage === 'function') {
      renderSitesFullPage(updatedSites)
    }
    
    // Reset current site ID
    currentSiteId = null
    
  } catch (error) {
    console.error('Error deleting site:', error)
    alert('Failed to delete site. Please try again.')
  }
}

// Close site detail modal
export function closeSiteDetailModal() {
  const modal = document.getElementById('siteDetailModal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

// Close delete confirmation modal
export function closeDeleteConfirmModal() {
  const modal = document.getElementById('deleteSiteConfirmModal')
  if (modal) {
    modal.classList.add('hidden')
    modal.classList.remove('flex')
  }
}

// Show loading state on submit button
export function setSubmitLoading(isLoading) {
  const btn = document.getElementById('submit-site-btn')
  if (!btn) return
  
  if (isLoading) {
    btn.disabled = true
    btn.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Creating...</span>
    `
  } else {
    btn.disabled = false
    btn.innerHTML = '<span>Create Site</span>'
  }
}

// Show error in modal
export function showFormError(message) {
  const errorEl = document.getElementById('form-error')
  if (errorEl) {
    errorEl.textContent = message
    errorEl.classList.remove('hidden')
  }
}

