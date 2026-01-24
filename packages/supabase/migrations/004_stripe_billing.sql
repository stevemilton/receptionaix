-- =============================================
-- STRIPE BILLING COLUMNS
-- =============================================

-- Add Stripe columns to merchants table
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS subscription_tier TEXT;

-- Create index for Stripe customer lookup
CREATE INDEX IF NOT EXISTS idx_merchants_stripe_customer ON merchants(stripe_customer_id);

-- Add address and greeting columns if not present
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS greeting TEXT;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS voice_id TEXT DEFAULT 'alloy';
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS google_calendar_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
