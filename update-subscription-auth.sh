#!/bin/bash
gcloud pubsub subscriptions update gmail-webhook-subscription --push-endpoint=https://family-schedule-mvp.vercel.app/api/gmail-webhook --push-auth-service-account=gmail-push-invoker@manifest-woods-120620.iam.gserviceaccount.com --push-auth-token-audience=https://family-schedule-mvp.vercel.app/api/gmail-webhook --project=manifest-woods-120620
