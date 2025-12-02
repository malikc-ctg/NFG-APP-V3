#!/bin/bash

# NFG Recurring Billing Cron Job Setup Script
# This script helps you set up the cron job for automated subscription billing

echo "🔧 NFG Recurring Billing - Cron Job Setup"
echo "=========================================="
echo ""

# Get the CRON_SECRET from Supabase
echo "📋 Your Cron Configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Endpoint URL:"
echo "https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing"
echo ""
echo "🔐 HTTP Header (X-Cron-Secret):"
# Try to get from Supabase secrets (if accessible)
CRON_SECRET=$(supabase secrets list 2>/dev/null | grep CRON_SECRET | awk '{print $2}' || echo "Check Supabase Dashboard → Settings → Edge Functions Secrets")
echo "$CRON_SECRET"
echo ""
echo "⏰ Recommended Schedule:"
echo "Daily at 9:00 AM UTC"
echo "(Cron expression: 0 9 * * *)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ask which service to use
echo "Choose a cron service:"
echo "1) cron-job.org (Free, Recommended)"
echo "2) EasyCron (Free tier)"
echo "3) GitHub Actions (Free for public repos)"
echo "4) Show manual instructions"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo "📝 Setting up cron-job.org..."
    echo ""
    echo "1. Go to: https://cron-job.org/"
    echo "2. Sign up for free account"
    echo "3. Click 'Create cronjob'"
    echo "4. Fill in:"
    echo "   - Title: NFG Recurring Billing"
    echo "   - Address: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing"
    echo "   - Schedule: Every day at 9:00 AM UTC"
    echo "   - Request method: POST"
    echo "   - Request headers: X-Cron-Secret: $CRON_SECRET"
    echo "5. Click 'Create cronjob'"
    echo ""
    echo "✅ Done! Your cron job will run daily."
    ;;
  2)
    echo ""
    echo "📝 Setting up EasyCron..."
    echo ""
    echo "1. Go to: https://www.easycron.com/"
    echo "2. Sign up for free account"
    echo "3. Click 'Add New Cron Job'"
    echo "4. Fill in:"
    echo "   - Cron Job Name: NFG Recurring Billing"
    echo "   - URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing"
    echo "   - HTTP Method: POST"
    echo "   - HTTP Headers: X-Cron-Secret: $CRON_SECRET"
    echo "   - Cron Expression: 0 9 * * *"
    echo "5. Click 'Add'"
    echo ""
    echo "✅ Done! Your cron job will run daily."
    ;;
  3)
    echo ""
    echo "📝 Setting up GitHub Actions..."
    echo ""
    echo "Creating GitHub Actions workflow file..."
    
    # Create .github/workflows directory if it doesn't exist
    mkdir -p .github/workflows
    
    cat > .github/workflows/recurring-billing.yml << EOF
name: Recurring Billing

on:
  schedule:
    - cron: '0 9 * * *' # Daily at 9 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  process-billing:
    runs-on: ubuntu-latest
    steps:
      - name: Process Recurring Billing
        run: |
          curl -X POST \
            -H "X-Cron-Secret: \${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing
EOF
    
    echo "✅ Created .github/workflows/recurring-billing.yml"
    echo ""
    echo "Next steps:"
    echo "1. Add CRON_SECRET to GitHub Secrets:"
    echo "   - Go to your repo → Settings → Secrets → Actions"
    echo "   - Click 'New repository secret'"
    echo "   - Name: CRON_SECRET"
    echo "   - Value: $CRON_SECRET"
    echo "   - Click 'Add secret'"
    echo ""
    echo "2. Commit and push this file:"
    echo "   git add .github/workflows/recurring-billing.yml"
    echo "   git commit -m 'Add recurring billing cron job'"
    echo "   git push"
    echo ""
    echo "✅ Done! GitHub Actions will run daily."
    ;;
  4)
    echo ""
    echo "📖 Manual Setup Instructions:"
    echo ""
    echo "Use any HTTP cron service with these settings:"
    echo ""
    echo "URL: https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing"
    echo "Method: POST"
    echo "Header: X-Cron-Secret: $CRON_SECRET"
    echo "Schedule: Daily at 9:00 AM UTC (0 9 * * *)"
    echo ""
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🧪 Test your cron job manually:"
echo "curl -X POST -H 'X-Cron-Secret: $CRON_SECRET' https://zqcbldgheimqrnqmbbed.supabase.co/functions/v1/process-recurring-billing"
echo ""

