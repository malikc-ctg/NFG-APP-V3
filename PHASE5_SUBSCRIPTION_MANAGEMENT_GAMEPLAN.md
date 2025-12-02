# 📋 Phase 5: Subscription Management System - Gameplan

## Goal
Build subscription billing system for platform subscriptions ($99/$149/$599 monthly)

## Overview
Allow companies to subscribe to your platform, manage their plans, upgrade/downgrade, and handle billing cycles.

---

## Tasks Breakdown

### 5.1: Subscription Plans Data
- [ ] Create subscription plans configuration
- [ ] Store plan details (name, price, features)
- [ ] Create helper functions to get plan info

### 5.2: Subscription Selection UI
- [ ] Add subscription section to settings page
- [ ] Display current subscription status
- [ ] Show plan selection cards
- [ ] Display plan features and pricing
- [ ] "Select Plan" buttons

### 5.3: Subscription Creation Logic
- [ ] Create subscription in database
- [ ] Link to company
- [ ] Set billing cycle (monthly/yearly)
- [ ] Set initial status (trialing/active)
- [ ] Store billing dates

### 5.4: Plan Management
- [ ] Upgrade plan functionality
- [ ] Downgrade plan functionality
- [ ] Proration calculations
- [ ] Update subscription in database
- [ ] Handle billing date adjustments

### 5.5: Subscription Status Management
- [ ] Active subscriptions
- [ ] Canceled subscriptions
- [ ] Past due handling
- [ ] Trial period management
- [ ] Expired subscriptions

### 5.6: Subscription UI Components
- [ ] Current plan display
- [ ] Plan comparison table
- [ ] Change plan modal
- [ ] Cancel subscription flow
- [ ] Billing cycle selector (monthly/yearly)

---

## Implementation Order

1. **Start with subscription plans configuration** (5.1)
2. **Build subscription UI** (5.2)
3. **Implement subscription creation** (5.3)
4. **Add plan management** (5.4)
5. **Status management** (5.5)
6. **Polish UI** (5.6)

---

## Files to Create/Modify

### New Files:
- `js/subscription-management.js` - Core subscription logic
- `SUBSCRIPTION_PLANS.sql` - Plan configuration data
- `supabase/functions/create-subscription/index.ts` - Create subscription Edge Function
- `supabase/functions/update-subscription/index.ts` - Update subscription Edge Function
- `supabase/functions/cancel-subscription/index.ts` - Cancel subscription Edge Function

### Modified Files:
- `settings.html` - Add subscription section
- `js/settings.js` - Integrate subscription management

---

## Subscription Plans

| Plan | Price (Monthly) | Features |
|------|----------------|----------|
| Starter | $99 | Basic features |
| Professional | $149 | Advanced features |
| Enterprise | $599 | All features + priority support |

---

## Next Steps

Ready to begin Phase 5.1: Subscription Plans Configuration

