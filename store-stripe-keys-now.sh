#!/bin/bash

# Quick script to store Stripe secrets - Client ID already found!

echo "💳 Storing Stripe Secrets"
echo "========================="
echo ""
echo "✅ Client ID: ca_TVb7FHd0Ww04yIY4wMjFt7GPDdUdKbko"
echo ""

# Check if Supabase CLI is installed and logged in
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    exit 1
fi

echo "📋 Now we need your API keys from Stripe:"
echo ""
echo "1. Go to: https://dashboard.stripe.com/test/apikeys"
echo "2. Make sure you're in Test Mode (toggle at top right)"
echo "3. Copy your keys:"
echo ""

read -p "Stripe Publishable Key (pk_test_...): " STRIPE_PUBLISHABLE
read -p "Stripe Secret Key (sk_test_...): " STRIPE_SECRET

echo ""
echo "🔐 Storing all 3 secrets in Supabase..."
echo ""

# Store Client ID
supabase secrets set STRIPE_CONNECT_CLIENT_ID="ca_TVb7FHd0Ww04yIY4wMjFt7GPDdUdKbko"

# Store API keys
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE"
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="$STRIPE_SECRET"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All secrets stored successfully!"
    echo ""
    echo "📋 Verifying secrets..."
    supabase secrets list | grep STRIPE
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Phase 1: COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Next step: Phase 2 - Database Schema"
else
    echo ""
    echo "❌ Failed to store secrets."
    echo "Make sure you're logged in: supabase login"
    echo "Make sure you're linked: supabase link --project-ref YOUR_REF"
    exit 1
fi
