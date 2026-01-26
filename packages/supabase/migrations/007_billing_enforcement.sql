-- =============================================
-- BILLING ENFORCEMENT
-- =============================================
-- Adds call limit enforcement, forward phone, billing period tracking,
-- notification logging, and overage support.

-- Forward phone for call forwarding when subscription is invalid
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS forward_phone TEXT;

-- Billing period start (set by Stripe webhook on subscription start/renewal)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ;

-- Stripe overage subscription item ID (for metered billing)
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS stripe_overage_item_id TEXT;

-- =============================================
-- FUNCTION: Count calls in current billing period
-- =============================================
CREATE OR REPLACE FUNCTION get_merchant_call_count(
  p_merchant_id UUID,
  p_period_start TIMESTAMPTZ
)
RETURNS TABLE(call_count INTEGER, total_minutes DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS call_count,
    COALESCE(SUM(duration_seconds) / 60.0, 0)::DECIMAL AS total_minutes
  FROM calls
  WHERE merchant_id = p_merchant_id
    AND started_at >= p_period_start
    AND status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- INDEX: Fast billing period call counting
-- =============================================
CREATE INDEX IF NOT EXISTS idx_calls_merchant_started
  ON calls(merchant_id, started_at)
  WHERE status = 'completed';

-- =============================================
-- NOTIFICATION LOG (deduplication for emails)
-- =============================================
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,  -- 'trial_expiring_3d', 'trial_expiring_1d', 'trial_expired', 'usage_warning_80', 'usage_exceeded'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  billing_period TEXT,              -- e.g. '2026-01' for monthly dedup
  UNIQUE(merchant_id, notification_type, billing_period)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_merchant
  ON notification_log(merchant_id);
