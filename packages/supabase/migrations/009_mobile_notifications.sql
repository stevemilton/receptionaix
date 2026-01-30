-- Add mobile notification columns to merchants table

-- Push notification token from Expo
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS push_token_updated_at TIMESTAMPTZ;

-- Notification preferences
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;

-- Create index for push token lookups (useful for sending notifications)
CREATE INDEX IF NOT EXISTS idx_merchants_push_token ON merchants(push_token) WHERE push_token IS NOT NULL;
