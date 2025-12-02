#!/bin/bash

# Phase 1 Verification Script
# Checks if Stripe secrets are properly configured

echo "🔍 Phase 1: Verifying Stripe Setup"
echo "=================================="
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
echo "🔐 Checking Supabase login..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase."
    echo "Please run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Check for Stripe secrets
echo "📋 Checking Stripe secrets..."
echo ""

STRIPE_SECRET=$(supabase secrets list 2>/dev/null | grep -i "STRIPE_PLATFORM_SECRET_KEY" || echo "")
STRIPE_PUBLISHABLE=$(supabase secrets list 2>/dev/null | grep -i "STRIPE_PLATFORM_PUBLISHABLE_KEY" || echo "")
STRIPE_CLIENT_ID=$(supabase secrets list 2>/dev/null | grep -i "STRIPE_CONNECT_CLIENT_ID" || echo "")

# Check each secret
if [ -z "$STRIPE_SECRET" ]; then
    echo "❌ STRIPE_PLATFORM_SECRET_KEY - NOT SET"
else
    echo "✅ STRIPE_PLATFORM_SECRET_KEY - SET"
fi

if [ -z "$STRIPE_PUBLISHABLE" ]; then
    echo "❌ STRIPE_PLATFORM_PUBLISHABLE_KEY - NOT SET"
else
    echo "✅ STRIPE_PLATFORM_PUBLISHABLE_KEY - SET"
fi

if [ -z "$STRIPE_CLIENT_ID" ]; then
    echo "❌ STRIPE_CONNECT_CLIENT_ID - NOT SET"
else
    echo "✅ STRIPE_CONNECT_CLIENT_ID - SET"
fi

echo ""

# Summary
if [ -n "$STRIPE_SECRET" ] && [ -n "$STRIPE_PUBLISHABLE" ] && [ -n "$STRIPE_CLIENT_ID" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Phase 1: COMPLETE!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "All Stripe secrets are configured."
    echo "Ready to proceed to Phase 2: Database Schema"
    echo ""
    exit 0
else
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⚠️  Phase 1: INCOMPLETE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Missing secrets. Please run:"
    echo "  ./setup-payment-gateways.sh"
    echo ""
    echo "Or follow: PHASE1_QUICK_START.md"
    echo ""
    exit 1
fi
