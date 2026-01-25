-- Add missing columns to merchants table for onboarding

-- Address column
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS address TEXT;

-- Voice and greeting settings
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'Ara';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS greeting TEXT;

-- Google calendar connection status
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;

-- Onboarding completion flag
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for Twilio phone number lookups
CREATE INDEX IF NOT EXISTS idx_merchants_twilio_phone ON merchants(twilio_phone_number);
