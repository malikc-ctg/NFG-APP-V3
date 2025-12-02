#!/bin/bash

# Payment Gateway Setup Script for NFG Facilities App
# This script helps you set up Stripe, PayPal, and Square API keys in Supabase secrets

echo "💳 NFG Facilities - Payment Gateway Setup"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "🔐 Checking Supabase login status..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Logging in..."
    supabase login
fi

echo "✅ Logged in to Supabase"
echo ""

# Function to set Stripe secrets
setup_stripe() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Setting up Stripe Connect"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Get your Stripe keys from: https://dashboard.stripe.com/apikeys"
    echo "Get your Connect Client ID from: https://dashboard.stripe.com/settings/connect"
    echo ""
    
    read -p "Stripe Secret Key (sk_test_...): " STRIPE_SECRET
    read -p "Stripe Publishable Key (pk_test_...): " STRIPE_PUBLISHABLE
    read -p "Stripe Connect Client ID (ca_...): " STRIPE_CLIENT_ID
    
    echo ""
    echo "🔐 Setting Stripe secrets..."
    
    supabase secrets set STRIPE_PLATFORM_SECRET_KEY="$STRIPE_SECRET"
    supabase secrets set STRIPE_PLATFORM_PUBLISHABLE_KEY="$STRIPE_PUBLISHABLE"
    supabase secrets set STRIPE_CONNECT_CLIENT_ID="$STRIPE_CLIENT_ID"
    
    if [ $? -eq 0 ]; then
        echo "✅ Stripe secrets set successfully!"
    else
        echo "❌ Failed to set Stripe secrets."
        exit 1
    fi
    echo ""
}

# Function to set PayPal secrets
setup_paypal() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Setting up PayPal Business"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Get your PayPal credentials from: https://developer.paypal.com/dashboard/applications"
    echo ""
    
    read -p "PayPal Client ID: " PAYPAL_CLIENT_ID
    read -p "PayPal Client Secret: " PAYPAL_SECRET
    read -p "PayPal Mode (sandbox/live) [sandbox]: " PAYPAL_MODE
    PAYPAL_MODE=${PAYPAL_MODE:-sandbox}
    
    echo ""
    echo "🔐 Setting PayPal secrets..."
    
    supabase secrets set PAYPAL_CLIENT_ID="$PAYPAL_CLIENT_ID"
    supabase secrets set PAYPAL_CLIENT_SECRET="$PAYPAL_SECRET"
    supabase secrets set PAYPAL_MODE="$PAYPAL_MODE"
    
    if [ $? -eq 0 ]; then
        echo "✅ PayPal secrets set successfully!"
    else
        echo "❌ Failed to set PayPal secrets."
        exit 1
    fi
    echo ""
}

# Function to set Square secrets
setup_square() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Setting up Square Connect"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Get your Square credentials from: https://developer.squareup.com/apps"
    echo ""
    
    read -p "Square Application ID: " SQUARE_APP_ID
    read -p "Square Access Token: " SQUARE_TOKEN
    read -p "Square Environment (sandbox/production) [sandbox]: " SQUARE_ENV
    SQUARE_ENV=${SQUARE_ENV:-sandbox}
    
    echo ""
    echo "🔐 Setting Square secrets..."
    
    supabase secrets set SQUARE_APPLICATION_ID="$SQUARE_APP_ID"
    supabase secrets set SQUARE_ACCESS_TOKEN="$SQUARE_TOKEN"
    supabase secrets set SQUARE_ENVIRONMENT="$SQUARE_ENV"
    
    if [ $? -eq 0 ]; then
        echo "✅ Square secrets set successfully!"
    else
        echo "❌ Failed to set Square secrets."
        exit 1
    fi
    echo ""
}

# Main menu
echo "Which payment gateway would you like to set up?"
echo ""
echo "1) Stripe Connect (Recommended - Start here)"
echo "2) PayPal Business"
echo "3) Square Connect"
echo "4) All of the above"
echo "5) Skip (already set up)"
echo ""
read -p "Enter choice [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        setup_stripe
        ;;
    2)
        setup_paypal
        ;;
    3)
        setup_square
        ;;
    4)
        setup_stripe
        setup_paypal
        setup_square
        ;;
    5)
        echo "✅ Skipping setup. Assuming secrets are already configured."
        ;;
    *)
        echo "❌ Invalid choice."
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Verifying Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# List payment gateway secrets
echo "Payment gateway secrets in Supabase:"
echo ""
supabase secrets list | grep -E "STRIPE|PAYPAL|SQUARE" || echo "⚠️  No payment gateway secrets found"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Review PAYMENT_GATEWAY_SETUP_PHASE1.md for detailed instructions"
echo "2. Proceed to Phase 2: Database Schema Updates"
echo "3. Run the SQL schema file for payment gateways"
echo ""
