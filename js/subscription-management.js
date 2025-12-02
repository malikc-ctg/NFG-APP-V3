/**
 * Subscription Management Module
 * Handles platform subscription plans, selection, and management
 */

import { supabase } from './supabase.js'
import { toast } from './notifications.js'

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    priceAnnual: 990, // $99/month * 10 months (2 months free)
    description: 'Perfect for small facilities',
    features: [
      'Up to 5 sites',
      'Unlimited jobs',
      'Basic reporting',
      'Mobile app access',
      'Email support'
    ]
  },
  professional: {
    name: 'Professional',
    price: 149,
    priceAnnual: 1490, // $149/month * 10 months
    description: 'Ideal for growing businesses',
    features: [
      'Up to 20 sites',
      'Unlimited jobs',
      'Advanced reporting',
      'Mobile app access',
      'Priority email support',
      'Custom branding',
      'API access'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    price: 599,
    priceAnnual: 5990, // $599/month * 10 months
    description: 'For large organizations',
    features: [
      'Unlimited sites',
      'Unlimited jobs',
      'Advanced analytics',
      'Mobile app access',
      '24/7 priority support',
      'Custom branding',
      'Full API access',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee'
    ]
  }
}

let currentSubscription = null
let currentCompany = null

/**
 * Initialize subscription management
 */
export async function initSubscriptionManagement() {
  try {
    // Get current user and company
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile?.company_id) {
      console.warn('[Subscription] No company found for user')
      return
    }

    currentCompany = { id: userProfile.company_id }

    // Load current subscription
    await loadCurrentSubscription()

    // Render subscription UI
    renderSubscriptionSection()

  } catch (error) {
    console.error('[Subscription] Initialization error:', error)
  }
}

/**
 * Load current subscription for company
 */
async function loadCurrentSubscription() {
  try {
    const { data, error } = await supabase
      .from('platform_subscriptions')
      .select('*')
      .eq('company_id', currentCompany.id)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw error
    currentSubscription = data
  } catch (error) {
    console.error('[Subscription] Error loading subscription:', error)
    currentSubscription = null
  }
}

/**
 * Render subscription section in settings page
 */
function renderSubscriptionSection() {
  const container = document.getElementById('subscription-section')
  if (!container) return

  const currentPlan = currentSubscription?.plan_name || null
  const billingCycle = currentSubscription?.billing_cycle || 'monthly'
  const status = currentSubscription?.status || 'none'
  const nextBillingDate = currentSubscription?.current_period_end
    ? new Date(currentSubscription.current_period_end).toLocaleDateString()
    : null

  container.innerHTML = `
    <div class="bg-white dark:bg-gray-800 border border-nfgray dark:border-gray-700 rounded-xl p-6 shadow-nfg">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h3 class="text-xl font-semibold text-nfgtext dark:text-gray-100">Subscription</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your platform subscription</p>
        </div>
        ${status === 'active' ? `
          <span class="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Active
          </span>
        ` : `
          <span class="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400">
            No Active Subscription
          </span>
        `}
      </div>

      ${currentSubscription ? renderCurrentSubscription(currentSubscription, nextBillingDate) : renderPlanSelection(billingCycle)}

      ${currentSubscription && status === 'active' ? renderManageSubscription(currentSubscription) : ''}
    </div>
  `
}

/**
 * Render current subscription info
 */
function renderCurrentSubscription(subscription, nextBillingDate) {
  const plan = SUBSCRIPTION_PLANS[subscription.plan_name]
  const isAnnual = subscription.billing_cycle === 'yearly'
  const amount = isAnnual ? plan.priceAnnual : plan.price

  return `
    <div class="mb-6 p-4 bg-nfglight dark:bg-gray-700/50 rounded-lg border border-nfgray dark:border-gray-600">
      <div class="flex items-start justify-between">
        <div>
          <h4 class="text-lg font-semibold text-nfgtext dark:text-gray-100">${plan.name} Plan</h4>
          <p class="text-2xl font-bold text-nfgblue dark:text-blue-400 mt-1">
            $${amount.toFixed(2)}/${isAnnual ? 'year' : 'month'}
          </p>
          ${nextBillingDate ? `
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Next billing date: ${nextBillingDate}
            </p>
          ` : ''}
        </div>
        <div class="text-right">
          <p class="text-sm text-gray-500 dark:text-gray-400">Billing Cycle</p>
          <p class="font-medium text-nfgtext dark:text-gray-100 capitalize">${subscription.billing_cycle}</p>
        </div>
      </div>
    </div>
  `
}

/**
 * Render plan selection UI
 */
function renderPlanSelection(billingCycle = 'monthly') {
  const plans = Object.entries(SUBSCRIPTION_PLANS)
  
  return `
    <div class="mb-6">
      <div class="flex items-center justify-center mb-6">
        <div class="inline-flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
          <button 
            id="billing-cycle-monthly"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'monthly' 
                ? 'bg-white dark:bg-gray-600 text-nfgblue dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-nfgtext dark:hover:text-gray-200'
            }"
          >
            Monthly
          </button>
          <button 
            id="billing-cycle-yearly"
            class="px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              billingCycle === 'yearly' 
                ? 'bg-white dark:bg-gray-600 text-nfgblue dark:text-blue-400 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-nfgtext dark:hover:text-gray-200'
            }"
          >
            Yearly <span class="text-xs text-green-600 dark:text-green-400">(Save 17%)</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${plans.map(([key, plan]) => renderPlanCard(key, plan, billingCycle)).join('')}
      </div>
    </div>
  `
}

/**
 * Render individual plan card
 */
function renderPlanCard(planKey, plan, billingCycle) {
  const isAnnual = billingCycle === 'yearly'
  const price = isAnnual ? plan.priceAnnual : plan.price
  const pricePerMonth = isAnnual ? (plan.priceAnnual / 12).toFixed(2) : plan.price
  const isCurrentPlan = currentSubscription?.plan_name === planKey

  return `
    <div class="border-2 rounded-xl p-6 ${
      isCurrentPlan 
        ? 'border-nfgblue dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-nfgray dark:border-gray-600 hover:border-nfgblue dark:hover:border-blue-500 transition-colors'
    }">
      <div class="text-center mb-4">
        <h4 class="text-xl font-semibold text-nfgtext dark:text-gray-100">${plan.name}</h4>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${plan.description}</p>
      </div>

      <div class="text-center mb-6">
        <p class="text-3xl font-bold text-nfgblue dark:text-blue-400">
          $${pricePerMonth}
          <span class="text-lg font-normal text-gray-500 dark:text-gray-400">/month</span>
        </p>
        ${isAnnual ? `
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Billed annually (${price.toFixed(2)}/year)
          </p>
        ` : ''}
      </div>

      <ul class="space-y-3 mb-6">
        ${plan.features.map(feature => `
          <li class="flex items-start gap-2">
            <i data-lucide="check" class="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"></i>
            <span class="text-sm text-gray-600 dark:text-gray-300">${feature}</span>
          </li>
        `).join('')}
      </ul>

      ${isCurrentPlan ? `
        <button 
          disabled
          class="w-full px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed font-medium"
        >
          Current Plan
        </button>
      ` : `
        <button 
          onclick="selectPlan('${planKey}', '${billingCycle}')"
          class="w-full px-4 py-2 rounded-lg bg-nfgblue hover:bg-blue-700 text-white font-medium transition-colors"
        >
          Select Plan
        </button>
      `}
    </div>
  `
}

/**
 * Render subscription management options
 */
function renderManageSubscription(subscription) {
  return `
    <div class="border-t border-nfgray dark:border-gray-700 pt-6 mt-6">
      <h4 class="text-lg font-semibold text-nfgtext dark:text-gray-100 mb-4">Manage Subscription</h4>
      <div class="flex flex-wrap gap-3">
        ${subscription.plan_name !== 'enterprise' ? `
          <button 
            onclick="upgradePlan()"
            class="px-4 py-2 rounded-lg bg-nfgblue hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Upgrade Plan
          </button>
        ` : ''}
        ${subscription.plan_name !== 'starter' ? `
          <button 
            onclick="downgradePlan()"
            class="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-nfgtext dark:text-gray-100 font-medium transition-colors"
          >
            Downgrade Plan
          </button>
        ` : ''}
        <button 
          onclick="cancelSubscription()"
          class="px-4 py-2 rounded-lg border border-red-300 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 font-medium transition-colors"
        >
          Cancel Subscription
        </button>
      </div>
    </div>
  `
}

/**
 * Select a subscription plan
 */
export async function selectPlan(planName, billingCycle) {
  try {
    toast.info('Creating subscription...')

    // Check if user has payment gateway connected
    const { data: company } = await supabase
      .from('company_profiles')
      .select('payment_gateway, payment_gateway_connected')
      .eq('id', currentCompany.id)
      .single()

    if (!company?.payment_gateway_connected && company?.payment_gateway !== 'manual') {
      toast.error('Please connect a payment gateway first in Payment Settings')
      return
    }

    const plan = SUBSCRIPTION_PLANS[planName]
    const amount = billingCycle === 'yearly' ? plan.priceAnnual : plan.price

    // Calculate billing dates
    const now = new Date()
    const periodStart = now
    const periodEnd = new Date(now)
    if (billingCycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    // Create subscription
    const { data, error } = await supabase
      .from('platform_subscriptions')
      .insert({
        company_id: currentCompany.id,
        plan_name: planName,
        amount: amount,
        currency: 'usd',
        billing_cycle: billingCycle,
        status: 'active', // Will be 'trialing' if we add trial support
        gateway: company?.payment_gateway || 'manual',
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .select()
      .single()

    if (error) throw error

    toast.success('Subscription created successfully!')
    
    // Reload subscription
    await loadCurrentSubscription()
    renderSubscriptionSection()

    // If manual payment, show instructions
    if (company?.payment_gateway === 'manual') {
      toast.info('Subscription created. Please make a manual payment to activate.')
    }

  } catch (error) {
    console.error('[Subscription] Error creating subscription:', error)
    toast.error('Failed to create subscription: ' + error.message)
  }
}

/**
 * Upgrade subscription plan
 */
export async function upgradePlan() {
  // Implementation for Phase 5.4
  toast.info('Upgrade functionality coming soon')
}

/**
 * Downgrade subscription plan
 */
export async function downgradePlan() {
  // Implementation for Phase 5.4
  toast.info('Downgrade functionality coming soon')
}

/**
 * Cancel subscription
 */
export async function cancelSubscription() {
  if (!currentSubscription) return

  const confirmed = confirm(
    `Are you sure you want to cancel your ${SUBSCRIPTION_PLANS[currentSubscription.plan_name].name} subscription? ` +
    'You will continue to have access until the end of your billing period.'
  )

  if (!confirmed) return

  try {
    toast.info('Canceling subscription...')

    const { error } = await supabase
      .from('platform_subscriptions')
      .update({
        cancel_at_period_end: true,
        status: 'active' // Keep active until period ends
      })
      .eq('id', currentSubscription.id)

    if (error) throw error

    toast.success('Subscription will be canceled at the end of the billing period')
    
    await loadCurrentSubscription()
    renderSubscriptionSection()

  } catch (error) {
    console.error('[Subscription] Error canceling subscription:', error)
    toast.error('Failed to cancel subscription: ' + error.message)
  }
}

// Expose functions to window for onclick handlers
window.selectPlan = selectPlan
window.upgradePlan = upgradePlan
window.downgradePlan = downgradePlan
window.cancelSubscription = cancelSubscription

