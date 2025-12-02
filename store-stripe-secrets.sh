#!/bin/bash

# Quick script to store Stripe secrets

echo "💳 Storing Stripe Secrets"
echo "========================="
echo ""

# Client ID is already known
STRIPE_CLIENT_ID="ca_TVb7FHd0Ww04yIY4wMjFt7GPDdUdKbko"

echo "✅ Client ID found: $STRIPE_CLIENT_ID"
echo ""

# Get API keys from user
echo "Now we need your API keys from Stripe Dashboard:"
echo "1. Go to: Developers → API Keys"
echo "2. Make sure you're in Test Mode"
echo "3. Copy your keys"
echo ""

read -p "Stripe Publishable Key (pk_test_...): " STRIPE_PUBLISHABLE
read -p "Stripe Secret Key (sk_test_...): " STRIPE_SECRET

echo ""
echo "🔐 Storing secrets in Supabase..."
echo ""

# Store secrets
supabase secrets set STRIPE_CONNECT_CLIENT_ID="$STRIPE_CLIENT_ID"
supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE"
supabase secrets set STRIPE_PLATFORM_SECRET_KEY="$STRIPE_SECRET"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All secrets stored successfully!"
    echo ""
    echo "Verifying..."
    supabase secrets list | grep STRIPE
    echo ""
    echo "✅ Phase 1: COMPLETE!"
else
    echo "❌ Failed to store secrets. Check your Supabase connection."
    exit 1
fi
