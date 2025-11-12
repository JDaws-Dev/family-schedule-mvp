#!/bin/bash

# Gmail Push Notifications - Create Pub/Sub Subscription with OIDC Auth
# This script creates a new push subscription with proper authentication

set -e  # Exit on error

# Configuration
PROJECT_ID="manifest-woods-120620"
TOPIC_NAME="gmail-notifications"
WEBHOOK_URL="https://family-schedule-mvp.vercel.app/api/gmail-webhook"
SUBSCRIPTION_NAME="gmail-webhook-subscription"
SERVICE_ACCOUNT_NAME="gmail-push-invoker"

echo "=================================================="
echo "Gmail Push Notifications - Create Subscription"
echo "=================================================="
echo ""
echo "Project: $PROJECT_ID"
echo "Topic: $TOPIC_NAME"
echo "Webhook: $WEBHOOK_URL"
echo "Subscription: $SUBSCRIPTION_NAME"
echo ""

# Check if topic exists
echo "Step 1: Verifying Pub/Sub topic exists..."
echo "--------------------------------------"

gcloud pubsub topics describe $TOPIC_NAME \
  --project=$PROJECT_ID \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Topic exists: projects/$PROJECT_ID/topics/$TOPIC_NAME"
else
  echo "❌ Topic does not exist. Creating it..."
  gcloud pubsub topics create $TOPIC_NAME \
    --project=$PROJECT_ID
  echo "✓ Topic created!"
fi
echo ""

# Create service account if it doesn't exist
echo "Step 2: Creating service account..."
echo "--------------------------------------"

SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts describe $SERVICE_ACCOUNT \
  --project=$PROJECT_ID \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ Service account already exists: $SERVICE_ACCOUNT"
else
  echo "Creating service account..."
  gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
    --display-name="Gmail Push Notification Invoker" \
    --project=$PROJECT_ID
  echo "✓ Service account created: $SERVICE_ACCOUNT"
fi
echo ""

# Create subscription with OIDC authentication
echo "Step 3: Creating Pub/Sub subscription with OIDC auth..."
echo "--------------------------------------"

# Check if subscription already exists
gcloud pubsub subscriptions describe $SUBSCRIPTION_NAME \
  --project=$PROJECT_ID \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "⚠️  Subscription already exists. Deleting and recreating..."
  gcloud pubsub subscriptions delete $SUBSCRIPTION_NAME \
    --project=$PROJECT_ID \
    --quiet
  echo "✓ Old subscription deleted"
fi

# Create new subscription with OIDC auth
gcloud pubsub subscriptions create $SUBSCRIPTION_NAME \
  --topic=$TOPIC_NAME \
  --push-endpoint="$WEBHOOK_URL" \
  --push-auth-service-account=$SERVICE_ACCOUNT \
  --push-auth-token-audience="$WEBHOOK_URL" \
  --project=$PROJECT_ID

if [ $? -eq 0 ]; then
  echo "✓ Subscription created successfully with OIDC authentication!"
else
  echo "❌ Failed to create subscription"
  exit 1
fi

echo ""
echo "=================================================="
echo "✅ Setup Complete!"
echo "=================================================="
echo ""
echo "Configuration Summary:"
echo "  Topic: projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo "  Subscription: $SUBSCRIPTION_NAME"
echo "  Webhook: $WEBHOOK_URL"
echo "  Auth: OIDC via $SERVICE_ACCOUNT"
echo ""
echo "Next steps:"
echo "1. Send a test email to your connected Gmail account"
echo "2. Wait 10-30 seconds"
echo "3. Check the Review page on production:"
echo "   https://family-schedule-mvp.vercel.app/review"
echo "4. Monitor logs:"
echo "   vercel logs https://family-schedule-mvp.vercel.app"
echo ""
echo "You should now see successful webhook calls with proper authentication!"
echo ""
