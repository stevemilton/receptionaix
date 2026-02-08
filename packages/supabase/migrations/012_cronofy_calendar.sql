-- Migration 012: Add Cronofy calendar integration columns
-- Replaces Google Calendar-only integration with unified calendar via Cronofy

-- Add Cronofy-specific columns to merchants
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS cronofy_access_token TEXT,
  ADD COLUMN IF NOT EXISTS cronofy_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS cronofy_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cronofy_account_id TEXT,
  ADD COLUMN IF NOT EXISTS cronofy_calendar_id TEXT,
  ADD COLUMN IF NOT EXISTS cronofy_provider TEXT,
  ADD COLUMN IF NOT EXISTS calendar_connected BOOLEAN DEFAULT FALSE;

-- Add calendar_event_id to appointments (provider-agnostic event ID)
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Migrate existing Google Calendar connection status
UPDATE merchants SET calendar_connected = google_calendar_connected
  WHERE google_calendar_connected = true;
