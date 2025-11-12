#!/bin/bash

# Gmail Push Notifications - OIDC Authentication Setup
# This script configures proper authentication for the Pub/Sub push subscription

set -e  # Exit on error

# Configuration
PROJECT_ID="manifest-woods-120620"
WEBHOOK_URL="https://family-schedule-mvp.vercel.app/api/gmail-webhook"
SUBSCRIPTION_NAME="gmail-webhook-subscription"
SERVICE_ACCOUNT_NAME="gmail-push-invoker"

echo "=================================================="
echo "Gmail Push Notifications - OIDC Auth Setup"
echo "=================================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Webhook: $WEBHOOK_URL"
echo "Subscription: $SUBSCRIPTION_NAME"
echo ""

# Step 1: Create service account
echo "Step 1: Creating service account..."
echo "--------------------------------------"

gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
  --display-name="Gmail Push Notification Invoker" \
  --project=$PROJECT_ID \
  2>&1 || {
    if [[ $? -eq 1 ]]; then
      echo "⚠️  Service account may already exist, continuing..."
    else
      echo "❌ Failed to create service account"
      exit 1
    fi
  }

SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "✓ Service account: $SERVICE_ACCOUNT"
echo ""

# Step 2: Update subscription with OIDC authentication
echo "Step 2: Updating Pub/Sub subscription with OIDC auth..."
echo "--------------------------------------"

gcloud pubsub subscriptions update $SUBSCRIPTION_NAME \
  --push-endpoint="$WEBHOOK_URL" \
  --push-auth-service-account=$SERVICE_ACCOUNT \
  --push-auth-token-audience="$WEBHOOK_URL" \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
  echo "✓ Subscription updated successfully!"
else
  echo "❌ Failed to update subscription"
  exit 1
fi

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Send a test email to your connected Gmail account"
echo "2. Wait 10-30 seconds"
echo "3. Check the Review page on production:"
echo "   https://family-schedule-mvp.vercel.app/review"
echo "4. Monitor logs:"
echo "   vercel logs https://family-schedule-mvp.vercel.app"
echo ""
echo "You should see:"
echo "  ✓ [Gmail Webhook] Received push notification"
echo "  ✓ [Gmail Webhook] Triggering scan for: your@email.com"
echo "  ✓ [Gmail Webhook] Scan complete"
echo ""
