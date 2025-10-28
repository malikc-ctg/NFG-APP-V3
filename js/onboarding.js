import { supabase } from './supabase.js';
import { showToast } from './notifications.js';
import { showLoader, hideLoader } from './loader.js';
import { initCustomDropdowns } from './custom-dropdown.js';

console.log('🔵 Onboarding.js loaded');

// ==========================================
// STATE MANAGEMENT
// ==========================================
let currentStep = 1;
const totalSteps = 4;

const formData = {
  company: {},
  site: {},
  team: []
};

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🔵 Onboarding initialized');
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('❌ No session, redirecting to login');
    window.location.href = './index.html';
    return;
  }

  // Check if user has already completed onboarding
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('onboarding_completed')
    .eq('user_id', session.user.id)
    .single();

  if (profile?.onboarding_completed) {
    console.log('✅ Onboarding already completed, redirecting to dashboard');
    window.location.href = './dashboard.html';
    return;
  }

  // Load saved progress from localStorage
  const savedData = localStorage.getItem('nfg_onboarding_progress');
  if (savedData) {
    const parsed = JSON.parse(savedData);
    Object.assign(formData, parsed);
    populateFormData();
  }

  hideLoader();
  setupEventListeners();
  updateUI();
  
  // Initialize custom dropdowns
  setTimeout(() => {
    initCustomDropdowns();
  }, 100);
});

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Next button
  document.getElementById('next-btn').addEventListener('click', handleNext);

  // Back button
  document.getElementById('back-btn').addEventListener('click', handleBack);

  // Skip button
  document.getElementById('skip-btn').addEventListener('click', handleSkip);

  // Skip all button
  document.getElementById('skip-all-btn').addEventListener('click', handleSkipAll);

  // Add team member button
  document.getElementById('add-team-member').addEventListener('click', addTeamMemberRow);

  // Auto-save on input change
  document.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', saveProgress);
  });
}

// ==========================================
// NAVIGATION
// ==========================================
async function handleNext() {
  console.log(`🔵 Next button clicked on step ${currentStep}`);

  // Validate current step
  if (currentStep === 1) {
    if (!validateStep1()) return;
    saveStep1Data();
  } else if (currentStep === 2) {
    if (!validateStep2()) return;
    saveStep2Data();
    // Create company and site in database
    showLoader('Creating your company...');
    const success = await createCompanyAndSite();
    hideLoader();
    if (!success) return;
  } else if (currentStep === 3) {
    saveStep3Data();
    // Send team invitations
    if (formData.team.length > 0) {
      showLoader('Sending invitations...');
      await sendTeamInvitations();
      hideLoader();
    }
    // Mark onboarding as complete
    await completeOnboarding();
    // Show summary
    showSummary();
  } else if (currentStep === 4) {
    // Go to dashboard
    window.location.href = './dashboard.html';
    return;
  }

  // Move to next step
  if (currentStep < totalSteps) {
    currentStep++;
    updateUI();
  }
}

function handleBack() {
  if (currentStep > 1) {
    currentStep--;
    updateUI();
  }
}

function handleSkip() {
  console.log(`🔵 Skip button clicked on step ${currentStep}`);
  
  if (currentStep === 3) {
    // Skip team setup, go to completion
    currentStep = 4;
    completeOnboarding();
    showSummary();
    updateUI();
  }
}

async function handleSkipAll() {
  console.log('🔵 Skip all setup clicked');
  
  const confirmed = confirm('Are you sure you want to skip setup? You can complete this later in Settings.');
  if (!confirmed) return;

  showLoader('Setting up your account...');
  
  // Mark onboarding as complete (even though skipped)
  const { data: { session } } = await supabase.auth.getSession();
  await supabase
    .from('user_profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', session.user.id);

  localStorage.removeItem('nfg_onboarding_progress');
  
  hideLoader();
  showToast('Setup skipped. You can complete this later in Settings.', 'info');
  
  setTimeout(() => {
    window.location.href = './dashboard.html';
  }, 1000);
}

// ==========================================
// VALIDATION
// ==========================================
function validateStep1() {
  const companyName = document.getElementById('company-name').value.trim();
  const industryType = document.getElementById('industry-type').value;
  const phoneNumber = document.getElementById('phone-number').value.trim();

  if (!companyName) {
    showToast('Please enter your company name', 'error');
    return false;
  }

  if (!industryType) {
    showToast('Please select your industry type', 'error');
    return false;
  }

  if (!phoneNumber) {
    showToast('Please enter your phone number', 'error');
    return false;
  }

  return true;
}

function validateStep2() {
  const siteName = document.getElementById('site-name').value.trim();
  const siteAddress = document.getElementById('site-address').value.trim();
  const squareFootage = document.getElementById('square-footage').value;

  if (!siteName) {
    showToast('Please enter the site name', 'error');
    return false;
  }

  if (!siteAddress) {
    showToast('Please enter the site address', 'error');
    return false;
  }

  if (!squareFootage || squareFootage <= 0) {
    showToast('Please enter a valid square footage', 'error');
    return false;
  }

  return true;
}

// ==========================================
// DATA MANAGEMENT
// ==========================================
function saveStep1Data() {
  formData.company = {
    name: document.getElementById('company-name').value.trim(),
    industry: document.getElementById('industry-type').value,
    size: document.getElementById('company-size').value,
    phone: document.getElementById('phone-number').value.trim()
  };
  saveProgress();
}

function saveStep2Data() {
  formData.site = {
    name: document.getElementById('site-name').value.trim(),
    address: document.getElementById('site-address').value.trim(),
    sqft: parseInt(document.getElementById('square-footage').value),
    type: document.getElementById('site-type').value,
    contactPerson: document.getElementById('contact-person').value.trim(),
    contactPhone: document.getElementById('contact-phone').value.trim()
  };
  saveProgress();
}

function saveStep3Data() {
  const rows = document.querySelectorAll('.team-member-row');
  formData.team = [];
  
  rows.forEach(row => {
    const email = row.querySelector('input[type="email"]').value.trim();
    const role = row.querySelector('select').value;
    
    if (email) {
      formData.team.push({ email, role });
    }
  });
  
  saveProgress();
}

function saveProgress() {
  localStorage.setItem('nfg_onboarding_progress', JSON.stringify(formData));
}

function populateFormData() {
  // Populate Step 1
  if (formData.company.name) {
    document.getElementById('company-name').value = formData.company.name;
    document.getElementById('industry-type').value = formData.company.industry;
    document.getElementById('company-size').value = formData.company.size || '';
    document.getElementById('phone-number').value = formData.company.phone;
  }

  // Populate Step 2
  if (formData.site.name) {
    document.getElementById('site-name').value = formData.site.name;
    document.getElementById('site-address').value = formData.site.address;
    document.getElementById('square-footage').value = formData.site.sqft;
    document.getElementById('site-type').value = formData.site.type || '';
    document.getElementById('contact-person').value = formData.site.contactPerson || '';
    document.getElementById('contact-phone').value = formData.site.contactPhone || '';
  }
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================
async function createCompanyAndSite() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    console.log('🔵 Creating company profile...');

    // 1. Create company profile
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .insert([{
        owner_id: session.user.id,
        company_name: formData.company.name,
        industry_type: formData.company.industry,
        company_size: formData.company.size || null,
        phone_number: formData.company.phone
      }])
      .select()
      .single();

    if (companyError) throw companyError;
    console.log('✅ Company created:', company.id);

    // 2. Update user profile with company_id
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({ company_id: company.id })
      .eq('user_id', session.user.id);

    if (profileError) console.error('⚠️ Profile update error:', profileError);

    // 3. Create first site
    console.log('🔵 Creating first site...');
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .insert([{
        name: formData.site.name,
        address: formData.site.address,
        square_footage: formData.site.sqft,
        site_type: formData.site.type || null,
        contact_person: formData.site.contactPerson || null,
        contact_phone: formData.site.contactPhone || null,
        status: 'Active',
        created_by: session.user.id,
        company_id: company.id
      }])
      .select()
      .single();

    if (siteError) throw siteError;
    console.log('✅ Site created:', site.id);

    showToast('Company and site created successfully!', 'success');
    return true;

  } catch (error) {
    console.error('❌ Error creating company/site:', error);
    showToast(error.message || 'Failed to create company. Please try again.', 'error');
    return false;
  }
}

async function sendTeamInvitations() {
  if (formData.team.length === 0) return;

  console.log('🔵 Sending team invitations...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  // Get company info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id, full_name')
    .eq('user_id', session.user.id)
    .single();

  if (!profile?.company_id) return;

  for (const member of formData.team) {
    try {
      // Create invitation record
      const { error } = await supabase
        .from('user_invitations')
        .insert([{
          email: member.email,
          role: member.role,
          invited_by: session.user.id,
          company_id: profile.company_id
        }]);

      if (error) {
        console.error('❌ Invitation error:', error);
      } else {
        console.log('✅ Invitation sent to:', member.email);
      }
    } catch (err) {
      console.error('❌ Error sending invitation:', err);
    }
  }

  showToast(`${formData.team.length} invitation(s) sent!`, 'success');
}

async function completeOnboarding() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  await supabase
    .from('user_profiles')
    .update({ onboarding_completed: true })
    .eq('user_id', session.user.id);

  localStorage.removeItem('nfg_onboarding_progress');
  console.log('✅ Onboarding completed');
}

// ==========================================
// UI UPDATES
// ==========================================
function updateUI() {
  // Hide all steps
  document.querySelectorAll('.onboarding-step').forEach(step => {
    step.classList.add('hidden');
  });

  // Show current step
  document.getElementById(`step-${currentStep}`).classList.remove('hidden');

  // Update progress bar
  updateProgressBar();

  // Update buttons
  updateButtons();

  // Reinitialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateProgressBar() {
  const progressText = document.getElementById('progress-text');
  progressText.textContent = `Step ${currentStep} of ${totalSteps}`;

  // Update dots and lines
  for (let i = 1; i <= totalSteps; i++) {
    const dot = document.getElementById(`progress-dot-${i}`);
    const line = document.getElementById(`progress-line-${i}`);

    if (i < currentStep) {
      // Completed
      dot.className = 'w-3 h-3 rounded-full bg-nfgblue dark:bg-blue-400 transition-all';
      if (line) line.className = 'w-12 h-0.5 bg-nfgblue dark:bg-blue-400';
    } else if (i === currentStep) {
      // Current
      dot.className = 'w-3 h-3 rounded-full bg-nfgblue dark:bg-blue-400 transition-all';
      if (line) line.className = 'w-12 h-0.5 bg-gray-300 dark:bg-gray-700';
    } else {
      // Upcoming
      dot.className = 'w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700 transition-all';
      if (line) line.className = 'w-12 h-0.5 bg-gray-300 dark:bg-gray-700';
    }
  }
}

function updateButtons() {
  const backBtn = document.getElementById('back-btn');
  const skipBtn = document.getElementById('skip-btn');
  const skipAllBtn = document.getElementById('skip-all-btn');
  const nextBtn = document.getElementById('next-btn');

  // Back button
  if (currentStep > 1 && currentStep < 4) {
    backBtn.classList.remove('hidden');
  } else {
    backBtn.classList.add('hidden');
  }

  // Skip button (only on step 3)
  if (currentStep === 3) {
    skipBtn.classList.remove('hidden');
  } else {
    skipBtn.classList.add('hidden');
  }

  // Skip all button (only on step 1)
  if (currentStep === 1) {
    skipAllBtn.classList.remove('hidden');
  } else {
    skipAllBtn.classList.add('hidden');
  }

  // Next button text
  if (currentStep === 4) {
    nextBtn.innerHTML = '<span>Go to Dashboard</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
  } else if (currentStep === 3) {
    nextBtn.innerHTML = '<span>Send Invitations</span><i data-lucide="send" class="w-4 h-4"></i>';
  } else {
    nextBtn.innerHTML = '<span>Next</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
  }

  // Reinitialize icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

function showSummary() {
  document.getElementById('summary-company').textContent = formData.company.name;
  document.getElementById('summary-site').textContent = 
    `${formData.site.name} (${formData.site.sqft.toLocaleString()} sq ft)`;
  
  if (formData.team.length > 0) {
    document.getElementById('summary-team').textContent = 
      `${formData.team.length} invitation(s) sent`;
  } else {
    document.getElementById('summary-team').textContent = 'No team members yet';
  }
}

// ==========================================
// TEAM MEMBER MANAGEMENT
// ==========================================
function addTeamMemberRow() {
  const container = document.getElementById('team-members-container');
  
  const row = document.createElement('div');
  row.className = 'team-member-row flex gap-3 mb-3';
  row.innerHTML = `
    <input 
      type="email" 
      placeholder="email@example.com"
      class="flex-1 border border-nfgray dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-nfgblue outline-none"
    />
    <select 
      name="member-role"
      data-custom-dropdown="true"
      class="border border-nfgray dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-xl p-2.5 focus:ring-2 focus:ring-nfgblue outline-none">
      <option value="staff">Staff</option>
      <option value="admin">Admin</option>
    </select>
    <button type="button" class="remove-team-member text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300">
      <i data-lucide="x-circle" class="w-5 h-5"></i>
    </button>
  `;
  
  // Add remove button listener
  row.querySelector('.remove-team-member').addEventListener('click', () => {
    row.remove();
  });
  
  container.appendChild(row);
  
  // Reinitialize custom dropdowns for new row
  initCustomDropdowns();
  
  // Reinitialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }
}

