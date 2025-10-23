import { supabase } from './supabase.js'
import { renderSites, initializeUI, closeAddSiteModal, setSubmitLoading, showFormError } from './ui.js'

let currentUser = null;
let currentUserProfile = null;

// Get current user and their profile
async function getCurrentUser() {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not authenticated');
    
    currentUser = user;
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }
    
    currentUserProfile = profile;
    console.log('Dashboard - Current user profile:', currentUserProfile);
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Logout functionality
async function handleLogout() {
  await supabase.auth.signOut()
  window.location.href = './index.html'
}

// Fetch and display sites
async function fetchSites() {
  try {
    // Ensure we have current user info
    if (!currentUser) {
      await getCurrentUser();
    }

    if (currentUserProfile && currentUserProfile.role === 'staff') {
      console.log('🔍 Dashboard - Fetching sites for staff user:', currentUser.id);
      
      // For staff, fetch assigned sites
      const { data: assignments, error: assignError } = await supabase
        .from('worker_site_assignments')
        .select('site_id')
        .eq('worker_id', currentUser.id);
      
      console.log('📋 Dashboard - Assignments found:', assignments);
      if (assignError) {
        console.error('❌ Dashboard - Error fetching assignments:', assignError);
        return [];
      }
      if (!assignments || assignments.length === 0) {
        console.warn('⚠️ Dashboard - No site assignments found for this staff member');
        return [];
      }
      
      const siteIds = assignments.map(a => a.site_id);
      console.log('🏢 Dashboard - Fetching sites with IDs:', siteIds);
      
      const { data: sites, error } = await supabase
        .from('sites')
        .select('*')
        .in('id', siteIds)
        .order('name', { ascending: true });
      
      console.log('✅ Dashboard - Sites fetched:', sites);
      if (error) {
        console.error('❌ Dashboard - Error fetching sites:', error);
        return [];
      }
      return sites || [];
    } else {
      // Admin/Client - fetch all sites from Supabase
      const { data: sites, error } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Dashboard - Error fetching sites from Supabase:', error);
        return [];
      }
      
      console.log('Dashboard - Sites fetched:', sites);
      return sites || [];
    }
  } catch (error) {
    console.error('Error fetching sites:', error)
    return []
  }
}

// Create new site
async function createSite(siteData) {
  try {
    console.log('Creating site in Supabase:', siteData);
    const { data: newSite, error } = await supabase
      .from('sites')
      .insert({
        name: siteData.name,
        address: siteData.address,
        status: siteData.status,
        square_footage: siteData.square_footage,
        contact_phone: siteData.contact_phone,
        contact_email: siteData.contact_email,
        notes: siteData.notes
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating site in Supabase:', error);
      throw error;
    }
    
    console.log('✅ Site created in Supabase:', newSite);
    return newSite;
  } catch (error) {
    console.error('Error creating site:', error)
    throw error
  }
}

// Handle site form submission
async function handleSiteFormSubmit(e) {
  e.preventDefault()
  
  const form = e.target
  const formData = new FormData(form)
  
  const siteData = {
    name: formData.get('name'),
    address: formData.get('address'),
    status: formData.get('status'),
    square_footage: formData.get('square_footage') ? parseInt(formData.get('square_footage')) : null,
    contact_phone: formData.get('contact_phone') || null,
    contact_email: formData.get('contact_email') || null,
    notes: formData.get('notes') || null
  }
  
  setSubmitLoading(true)
  
  try {
    await createSite(siteData)
    
    // Refresh the sites list
    const sites = await fetchSites()
    renderSites(sites)
    
    // Also refresh full sites page if it exists
    if (typeof renderSitesFullPage === 'function') {
      renderSitesFullPage(sites)
    }
    
    // Close modal and show success
    closeAddSiteModal()
    
    // Optional: Show success message
    console.log('Site created successfully!')
    
  } catch (error) {
    showFormError(error.message || 'Failed to create site. Please try again.')
  } finally {
    setSubmitLoading(false)
  }
}

// Fetch and display recent jobs
async function fetchRecentJobs() {
  try {
    console.log('📋 Fetching recent jobs...');
    
    // Fetch jobs with site info
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        id, 
        title, 
        status, 
        job_type, 
        scheduled_date,
        site_id,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching recent jobs:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error in UI
      const jobsList = document.getElementById('jobs-list');
      if (jobsList) {
        jobsList.innerHTML = `
          <div class="py-6 text-center text-red-500">
            <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-2"></i>
            <p class="font-medium">Error loading jobs</p>
            <p class="text-sm text-gray-500 mt-1">${error.message || 'Database query failed'}</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
      return;
    }
    
    console.log('📋 Jobs fetched:', jobs);
    
    const jobsList = document.getElementById('jobs-list');
    if (!jobsList) {
      console.error('❌ jobs-list element not found!');
      return;
    }
    
    console.log('📋 Rendering jobs to DOM...');
    
    if (!jobs || jobs.length === 0) {
      console.log('📋 No jobs found, showing empty state');
      jobsList.innerHTML = `
        <div class="py-6 text-center text-gray-500">
          <i data-lucide="clipboard" class="w-12 h-12 mx-auto mb-2 text-gray-300"></i>
          <p>No jobs yet</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    // Fetch site names for all jobs
    const siteIds = [...new Set(jobs.map(j => j.site_id).filter(Boolean))];
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name')
      .in('id', siteIds);
    
    const siteMap = {};
    if (sites) {
      sites.forEach(site => {
        siteMap[site.id] = site.name;
      });
    }
    
    jobsList.innerHTML = jobs.map(job => {
      const siteName = siteMap[job.site_id] || 'Unknown site';
      const statusColors = {
        'pending': 'text-yellow-600',
        'in-progress': 'text-blue-600',
        'completed': 'text-green-600',
        'cancelled': 'text-red-600'
      };
      
      const statusIcons = {
        'pending': 'clock',
        'in-progress': 'play-circle',
        'completed': 'check-circle',
        'cancelled': 'x-circle'
      };
      
      const typeIcons = {
        'cleaning': 'sparkles',
        'maintenance': 'wrench',
        'repair': 'tool',
        'inspection': 'search',
        'emergency': 'alert-circle'
      };
      
      const statusColor = statusColors[job.status] || 'text-gray-600';
      const statusIcon = statusIcons[job.status] || 'circle';
      const typeIcon = typeIcons[job.job_type] || 'clipboard-check';
      const isEmergency = job.job_type === 'emergency';
      
      return `
        <div class="py-3 flex justify-between items-center hover:bg-nfglight/50 transition rounded-lg px-2 cursor-pointer" 
             onclick="window.location.href='jobs.html?job=${job.id}'">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-1.5">
              <i data-lucide="${typeIcon}" class="w-4 h-4 ${isEmergency ? 'text-red-600' : 'text-nfgblue'}"></i>
              ${isEmergency ? '<span class="text-xs font-bold text-red-600">!</span>' : ''}
            </div>
            <div>
              <p class="font-medium text-sm ${isEmergency ? 'text-red-600' : 'text-nfgblue'}">${job.title}</p>
              <p class="text-xs text-gray-500">${siteName}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <i data-lucide="${statusIcon}" class="w-4 h-4 ${statusColor}"></i>
            <span class="text-sm ${statusColor} capitalize">${job.status.replace('-', ' ')}</span>
          </div>
        </div>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
    console.log('📋 Recent Jobs loaded:', jobs.length);
  } catch (error) {
    console.error('Error fetching recent jobs:', error);
  }
}

// Fetch and display upcoming bookings
async function fetchUpcomingBookings() {
  try {
    console.log('📅 Fetching upcoming bookings...');
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch bookings with site info
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select(`
        id, 
        title, 
        status, 
        scheduled_date,
        site_id,
        created_at
      `)
      .eq('status', 'pending')
      .gte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(5);
    
    if (error) {
      console.error('❌ Error fetching upcoming bookings:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Show error in UI
      const bookingsList = document.getElementById('bookings-list');
      if (bookingsList) {
        bookingsList.innerHTML = `
          <div class="py-6 text-center text-red-500">
            <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-2"></i>
            <p class="font-medium">Error loading bookings</p>
            <p class="text-sm text-gray-500 mt-1">${error.message || 'Database query failed'}</p>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
      }
      return;
    }
    
    console.log('📅 Bookings fetched:', bookings);
    
    const bookingsList = document.getElementById('bookings-list');
    if (!bookingsList) {
      console.error('❌ bookings-list element not found!');
      return;
    }
    
    console.log('📅 Rendering bookings to DOM...');
    
    if (!bookings || bookings.length === 0) {
      console.log('📅 No upcoming bookings found, showing empty state');
      bookingsList.innerHTML = `
        <div class="py-6 text-center text-gray-500">
          <i data-lucide="calendar" class="w-12 h-12 mx-auto mb-2 text-gray-300"></i>
          <p>No upcoming bookings</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
    
    // Fetch site names for all bookings
    const siteIds = [...new Set(bookings.map(b => b.site_id).filter(Boolean))];
    const { data: sites } = await supabase
      .from('sites')
      .select('id, name')
      .in('id', siteIds);
    
    const siteMap = {};
    if (sites) {
      sites.forEach(site => {
        siteMap[site.id] = site.name;
      });
    }
    
    bookingsList.innerHTML = bookings.map(booking => {
      const siteName = siteMap[booking.site_id] || 'Unknown site';
      const bookingDate = new Date(booking.scheduled_date);
      const formattedDate = bookingDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: bookingDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      
      return `
        <div class="py-3 flex justify-between items-center hover:bg-nfglight/50 transition rounded-lg px-2 cursor-pointer" 
             onclick="window.location.href='bookings.html'">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <div class="flex items-center gap-1.5 flex-shrink-0">
              <i data-lucide="calendar" class="w-4 h-4 text-nfgblue"></i>
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-sm text-nfgblue truncate">${booking.title}</p>
              <p class="text-xs text-gray-500 truncate">${siteName}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-xs text-gray-600 font-medium">${formattedDate}</span>
          </div>
        </div>
      `;
    }).join('');
    
    if (window.lucide) lucide.createIcons();
    console.log('📅 Upcoming Bookings loaded:', bookings.length);
  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
  }
}

// Fetch and display dashboard statistics
async function fetchDashboardStats() {
  try {
    // Fetch active jobs (pending + in-progress) count
    const { count: activeJobsCount, error: jobsError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'in-progress']);
    
    if (jobsError) {
      console.error('Error fetching active jobs:', jobsError);
    } else {
      const activeJobsEl = document.getElementById('stat-active-jobs');
      if (activeJobsEl) {
        activeJobsEl.textContent = activeJobsCount || 0;
      }
      console.log('📊 Active Jobs:', activeJobsCount);
    }

    // Fetch upcoming bookings count
    const today = new Date().toISOString().split('T')[0];
    const { count: upcomingCount, error: bookingsError } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('scheduled_date', today);
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }
    
    const upcomingEl = document.getElementById('stat-upcoming');
    if (upcomingEl) {
      upcomingEl.textContent = upcomingCount || 0;
    }

    // Fetch emergency requests count
    const { count: emergenciesCount, error: emergError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('job_type', 'emergency')
      .in('status', ['pending', 'in-progress']);
    
    if (emergError) {
      console.error('Error fetching emergencies:', emergError);
    } else {
      const emergenciesEl = document.getElementById('stat-emergencies');
      if (emergenciesEl) {
        emergenciesEl.textContent = emergenciesCount || 0;
      }
      console.log('🚨 Emergency Requests:', emergenciesCount);
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
  }
}

// Initialize dashboard
async function initDashboard() {
  // Get current user first
  await getCurrentUser();
  
  const sites = await fetchSites()
  renderSites(sites)
  initializeUI()
  
  // Fetch and display dashboard statistics
  await fetchDashboardStats()
  
  // Fetch and display recent jobs
  await fetchRecentJobs()
  
  // Fetch and display upcoming bookings
  await fetchUpcomingBookings()
  
  // Hide "New Booking" button for staff users
  if (currentUserProfile && currentUserProfile.role === 'staff') {
    const newBookingBtn = document.getElementById('new-booking-btn');
    if (newBookingBtn) {
      newBookingBtn.style.display = 'none';
    }
  }
  
  // Attach form submit handler
  const form = document.getElementById('add-site-form')
  form?.addEventListener('submit', handleSiteFormSubmit)
  
  // Attach logout handler
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout)
}

// Load dashboard on page load
initDashboard()

