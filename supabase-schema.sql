-- Family Schedule Assistant Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  gmail_access_token TEXT,
  gmail_refresh_token TEXT,
  gmail_connected_at TIMESTAMPTZ,
  last_email_sync TIMESTAMPTZ,
  stripe_customer_id TEXT,
  subscription_tier TEXT CHECK (subscription_tier IN ('basic', 'premium')),
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  end_time TIME,
  location TEXT,
  category TEXT, -- sports, lessons, appointments, school, etc.
  child_name TEXT,
  source_email_id TEXT, -- Gmail message ID
  source_email_subject TEXT,
  requires_action BOOLEAN DEFAULT false,
  action_deadline DATE,
  is_confirmed BOOLEAN DEFAULT false, -- User has confirmed the extracted event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email processing log
CREATE TABLE IF NOT EXISTS email_processing_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  subject TEXT,
  from_email TEXT,
  received_date TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  events_extracted INTEGER DEFAULT 0,
  processing_status TEXT CHECK (processing_status IN ('pending', 'processed', 'error', 'skipped')),
  error_message TEXT,
  ai_response JSONB -- Store the full AI extraction response
);

-- Reminders sent log
CREATE TABLE IF NOT EXISTS reminders_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN ('email', 'sms', 'digest')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'failed')),
  error_message TEXT
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_reminders_enabled BOOLEAN DEFAULT true,
  sms_reminders_enabled BOOLEAN DEFAULT false,
  reminder_hours_before INTEGER DEFAULT 24, -- How many hours before event to send reminder
  weekly_digest_enabled BOOLEAN DEFAULT true,
  weekly_digest_day TEXT DEFAULT 'sunday', -- Day of week for digest
  auto_scan_emails BOOLEAN DEFAULT true,
  scan_interval_hours INTEGER DEFAULT 6, -- How often to scan emails
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_user_date ON events(user_id, event_date);
CREATE INDEX IF NOT EXISTS idx_events_confirmed ON events(is_confirmed);
CREATE INDEX IF NOT EXISTS idx_email_log_user ON email_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_message ON email_processing_log(gmail_message_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Events policies
CREATE POLICY "Users can view own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- Email processing log policies
CREATE POLICY "Users can view own email log" ON email_processing_log
  FOR SELECT USING (auth.uid() = user_id);

-- Reminders sent policies
CREATE POLICY "Users can view own reminders" ON reminders_sent
  FOR SELECT USING (auth.uid() = user_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create default preferences when user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create preferences on user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
