#!/bin/bash

# Script to add Stripe Redirect URI via API
# Requires Stripe Secret Key

echo "Adding Stripe Redirect URI..."

# Get live secret key from user
read -p "Enter your Stripe LIVE Secret Key (sk_live_...): " STRIPE_SECRET_KEY

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "Error: Secret key required"
    exit 1
fi

REDIRECT_URI="https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/stripe-connect-oauth?action=callback"

echo "Adding redirect URI: $REDIRECT_URI"

# Use Stripe API to update application
curl -X POST https://api.stripe.com/v1/applications \
  -u "$STRIPE_SECRET_KEY:" \
  -d "redirect_uris[]=$REDIRECT_URI" \
  -d "name=NFG Payment Gateway"

echo ""
echo "Done! Check your Stripe Dashboard to verify."
