/**
 * Payment Gateway Connection Module
 * Handles payment gateway selection and connection for companies
 */

import { supabase } from './supabase.js'
import { toast } from './notifications.js'

let currentCompanyProfile = null;
let selectedGateway = null;

/**
 * Initialize payment gateway connection UI
 */
export async function initPaymentGatewayConnection() {
  console.log('[Payment Gateway] Initializing...');
  
  try {
    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('[Payment Gateway] User not authenticated');
      return;
    }

    // Get user profile to find company
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      console.error('[Payment Gateway] Could not find company:', profileError);
      toast.error('Could not load company information');
      return;
    }

    // Get company profile
    const { data: company, error: companyError } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', userProfile.company_id)
      .single();

    if (companyError) {
      console.error('[Payment Gateway] Error loading company:', companyError);
      toast.error('Failed to load company profile');
      return;
    }

    currentCompanyProfile = company;
    selectedGateway = company.payment_gateway || null;

    // Render current gateway status
    renderCurrentGatewayStatus();

    // Setup event listeners
    setupEventListeners();

    // Check for OAuth callback in URL
    checkOAuthCallback();

    console.log('[Payment Gateway] Initialized successfully');
  } catch (error) {
    console.error('[Payment Gateway] Initialization error:', error);
    toast.error('Failed to initialize payment gateway settings');
  }
}

/**
 * Render current gateway status
 */
function renderCurrentGatewayStatus() {
  const statusContainer = document.getElementById('current-gateway-status');
  const nameEl = document.getElementById('current-gateway-name');
  const statusBadgeEl = document.getElementById('current-gateway-details');
  const badgeEl = document.getElementById('current-gateway-status-badge');

  if (!currentCompanyProfile) {
    nameEl.textContent = 'Not set';
    badgeEl.innerHTML = '<span class="text-gray-500">Not configured</span>';
    statusBadgeEl.innerHTML = '<p class="text-sm">No payment gateway configured yet.</p>';
    return;
  }

  const gateway = currentCompanyProfile.payment_gateway || 'manual';
  const connected = currentCompanyProfile.payment_gateway_connected || false;
  const accountStatus = currentCompanyProfile.payment_gateway_account_status || 'pending';
  const accountId = currentCompanyProfile.payment_gateway_account_id;

  // Gateway name display
  const gatewayNames = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    square: 'Square',
    manual: 'Manual Payments'
  };

  nameEl.textContent = gatewayNames[gateway] || 'Unknown';

  // Status badge
  if (gateway === 'manual') {
    badgeEl.innerHTML = '<span class="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Active</span>';
    statusBadgeEl.innerHTML = `
      <p class="text-sm">Payments are recorded manually (cash, check, bank transfer).</p>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">No online payment processing.</p>
    `;
  } else if (connected && accountStatus === 'active') {
    badgeEl.innerHTML = '<span class="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Connected</span>';
    statusBadgeEl.innerHTML = `
      <p class="text-sm">Gateway is connected and active.</p>
      ${accountId ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Account ID: <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded">${accountId.substring(0, 20)}...</code></p>` : ''}
    `;
  } else if (connected && accountStatus !== 'active') {
    badgeEl.innerHTML = `<span class="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">${accountStatus || 'Pending'}</span>`;
    statusBadgeEl.innerHTML = `
      <p class="text-sm">Gateway connection is ${accountStatus || 'pending verification'}.</p>
    `;
  } else {
    badgeEl.innerHTML = '<span class="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">Not Connected</span>';
    statusBadgeEl.innerHTML = `
      <p class="text-sm">Gateway selected but not connected yet.</p>
    `;
  }

  // Update radio selection
  const radioInput = document.getElementById(`gateway-${gateway}`);
  if (radioInput) {
    radioInput.checked = true;
    updateRadioVisual(radioInput);
  }

  // Update action buttons
  updateActionButtons();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Gateway option clicks
  document.querySelectorAll('.gateway-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const gateway = option.dataset.gateway;
      if (gateway === 'paypal' || gateway === 'square') {
        toast.info('PayPal and Square integration coming soon!');
        return;
      }
      selectGateway(gateway);
    });
  });

  // Radio button changes
  document.querySelectorAll('input[name="gateway"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectGateway(e.target.value);
      }
    });
  });

  // Connect button
  document.getElementById('connect-gateway-btn')?.addEventListener('click', handleConnectGateway);
  
  // Disconnect button
  document.getElementById('disconnect-gateway-btn')?.addEventListener('click', handleDisconnectGateway);
  
  // Open dashboard button
  document.getElementById('open-gateway-dashboard-btn')?.addEventListener('click', handleOpenDashboard);
  
  // Save manual button
  document.getElementById('save-manual-btn')?.addEventListener('click', handleSaveManual);
}

/**
 * Select a gateway
 */
function selectGateway(gateway) {
  selectedGateway = gateway;
  
  // Update radio button
  const radioInput = document.getElementById(`gateway-${gateway}`);
  if (radioInput) {
    radioInput.checked = true;
    updateRadioVisual(radioInput);
  }

  // Update action buttons
  updateActionButtons();

  // Update connection status for Stripe
  if (gateway === 'stripe') {
    updateStripeConnectionStatus();
  }
}

/**
 * Update radio button visual state
 */
function updateRadioVisual(radioInput) {
  // Remove checked state from all radios
  document.querySelectorAll('input[name="gateway"]').forEach(radio => {
    const label = radio.parentElement.querySelector('label');
    const dot = label.querySelector('span');
    dot.classList.add('hidden');
    radio.parentElement.parentElement.parentElement.classList.remove('border-nfgblue', 'dark:border-blue-500');
    radio.parentElement.parentElement.parentElement.classList.add('border-nfgray');
  });

  // Add checked state to selected radio
  if (radioInput.checked) {
    const label = radioInput.parentElement.querySelector('label');
    const dot = label.querySelector('span');
    dot.classList.remove('hidden');
    const option = radioInput.closest('.gateway-option');
    option.classList.remove('border-nfgray');
    option.classList.add('border-nfgblue', 'dark:border-blue-500');
  }
}

/**
 * Update action buttons visibility
 */
function updateActionButtons() {
  const connectBtn = document.getElementById('connect-gateway-btn');
  const disconnectBtn = document.getElementById('disconnect-gateway-btn');
  const dashboardBtn = document.getElementById('open-gateway-dashboard-btn');
  const saveManualBtn = document.getElementById('save-manual-btn');

  // Hide all buttons first
  connectBtn?.classList.add('hidden');
  disconnectBtn?.classList.add('hidden');
  dashboardBtn?.classList.add('hidden');
  saveManualBtn?.classList.add('hidden');

  if (!selectedGateway) return;

  const currentGateway = currentCompanyProfile?.payment_gateway;
  const isConnected = currentCompanyProfile?.payment_gateway_connected;

  if (selectedGateway === 'manual') {
    if (currentGateway !== 'manual') {
      saveManualBtn?.classList.remove('hidden');
    }
  } else if (selectedGateway === 'stripe') {
    if (!isConnected || currentGateway !== 'stripe') {
      connectBtn?.classList.remove('hidden');
      connectBtn.innerHTML = '<i data-lucide="link" class="w-4 h-4 inline mr-2"></i>Connect Stripe Account';
      if (window.lucide) window.lucide.createIcons();
    } else {
      disconnectBtn?.classList.remove('hidden');
      dashboardBtn?.classList.remove('hidden');
    }
  }
}

/**
 * Update Stripe connection status
 */
function updateStripeConnectionStatus() {
  const statusContainer = document.getElementById('stripe-connection-status');
  if (!statusContainer) return;

  const currentGateway = currentCompanyProfile?.payment_gateway;
  const isConnected = currentCompanyProfile?.payment_gateway_connected;
  const accountStatus = currentCompanyProfile?.payment_gateway_account_status;

  if (currentGateway === 'stripe' && isConnected) {
    if (accountStatus === 'active') {
      statusContainer.innerHTML = `
        <div class="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
          <i data-lucide="check-circle" class="w-4 h-4"></i>
          <span>Connected and active</span>
        </div>
      `;
    } else {
      statusContainer.innerHTML = `
        <div class="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
          <i data-lucide="alert-circle" class="w-4 h-4"></i>
          <span>Connection ${accountStatus || 'pending'}</span>
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
  } else {
    statusContainer.innerHTML = `
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <i data-lucide="info" class="w-4 h-4"></i>
        <span>Not connected yet</span>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

/**
 * Handle connect gateway (OAuth flow)
 */
async function handleConnectGateway() {
  if (selectedGateway !== 'stripe') {
    toast.error('Only Stripe is available at this time');
    return;
  }

  try {
    toast.info('Preparing Stripe connection...');

    // Call Edge Function to create OAuth link
    const { data, error } = await supabase.functions.invoke('stripe-connect-oauth', {
      body: { action: 'initiate' }
    });
    
    if (error) {
      console.error('[Payment Gateway] OAuth initiation error:', error);
      throw error;
    }
    
    if (data?.url) {
      // Store state for callback verification
      sessionStorage.setItem('stripe_oauth_state', data.state);
      
      // Redirect to Stripe OAuth
      window.location.href = data.url;
    } else {
      throw new Error('No OAuth URL received from server');
    }

  } catch (error) {
    console.error('[Payment Gateway] Connect error:', error);
    toast.error('Failed to initiate connection: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Handle disconnect gateway
 */
async function handleDisconnectGateway() {
  const confirmed = await new Promise((resolve) => {
    if (confirm('Are you sure you want to disconnect your payment gateway? Clients will no longer be able to pay invoices online.')) {
      resolve(true);
    } else {
      resolve(false);
    }
  });

  if (!confirmed) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get company ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.company_id) throw new Error('Company not found');

    // Update company profile
    const { error } = await supabase
      .from('company_profiles')
      .update({
        payment_gateway: null,
        payment_gateway_connected: false,
        payment_gateway_account_id: null,
        payment_gateway_account_status: null,
        payment_gateway_dashboard_link: null,
        payment_gateway_metadata: null
      })
      .eq('id', userProfile.company_id);

    if (error) throw error;

    // Update payment_gateway_connections table
    await supabase
      .from('payment_gateway_connections')
      .update({
        connection_status: 'disconnected',
        disconnected_at: new Date().toISOString()
      })
      .eq('company_id', userProfile.company_id)
      .eq('gateway', selectedGateway);

    toast.success('Payment gateway disconnected successfully');
    
    // Reload company profile
    const { data: company } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', userProfile.company_id)
      .single();

    currentCompanyProfile = company;
    selectedGateway = null;
    renderCurrentGatewayStatus();

  } catch (error) {
    console.error('[Payment Gateway] Disconnect error:', error);
    toast.error('Failed to disconnect gateway: ' + error.message);
  }
}

/**
 * Handle open gateway dashboard
 */
function handleOpenDashboard() {
  const dashboardLink = currentCompanyProfile?.payment_gateway_dashboard_link;
  
  if (dashboardLink) {
    window.open(dashboardLink, '_blank');
  } else {
    toast.warning('Dashboard link not available');
  }
}

/**
 * Handle save manual payment selection
 */
async function handleSaveManual() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get company ID
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.company_id) throw new Error('Company not found');

    // Update company profile to manual
    const { error } = await supabase
      .from('company_profiles')
      .update({
        payment_gateway: 'manual',
        payment_gateway_connected: true, // Manual is always "connected"
        payment_gateway_account_status: 'active'
      })
      .eq('id', userProfile.company_id);

    if (error) throw error;

    toast.success('Manual payments enabled successfully');
    
    // Reload company profile
    const { data: company } = await supabase
      .from('company_profiles')
      .select('*')
      .eq('id', userProfile.company_id)
      .single();

    currentCompanyProfile = company;
    selectedGateway = 'manual';
    renderCurrentGatewayStatus();

  } catch (error) {
    console.error('[Payment Gateway] Save manual error:', error);
    toast.error('Failed to save selection: ' + error.message);
  }
}

/**
 * Check for OAuth callback in URL
 */
async function checkOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');
  const oauthError = urlParams.get('oauth_error');

  // Check if this is a Stripe OAuth callback result
  if (oauthSuccess === 'true') {
    toast.success('Stripe account connected successfully!');
    
    // Reload company profile
    await reloadCompanyProfile();
    
    // Clean up URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (oauthError) {
    const errorMessages = {
      'invalid_session': 'OAuth session expired or invalid. Please try again.',
      'config_error': 'Payment gateway not configured. Please contact support.',
      'failed': 'Failed to connect Stripe account. Please try again.',
    };
    
    toast.error(errorMessages[oauthError] || 'Connection failed. Please try again.');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

/**
 * Reload company profile
 */
async function reloadCompanyProfile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userProfile?.company_id) {
      const { data: company } = await supabase
        .from('company_profiles')
        .select('*')
        .eq('id', userProfile.company_id)
        .single();

      if (company) {
        currentCompanyProfile = company;
        selectedGateway = company.payment_gateway || null;
        renderCurrentGatewayStatus();
      }
    }
  } catch (error) {
    console.error('[Payment Gateway] Error reloading company profile:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if payment gateway section exists
    if (document.getElementById('payment-gateway-section')) {
      initPaymentGatewayConnection();
    }
  });
} else {
  // DOM already loaded
  if (document.getElementById('payment-gateway-section')) {
    initPaymentGatewayConnection();
  }
}

