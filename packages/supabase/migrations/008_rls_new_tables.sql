-- =============================================
-- RLS POLICIES FOR TABLES ADDED IN MIGRATIONS 002-007
-- =============================================
-- Covers: business_types, master_faq_patterns, master_service_templates,
--         master_greeting_patterns, master_call_analytics,
--         master_kb_contributions, notification_log

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE business_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_faq_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_greeting_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_call_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_kb_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- BUSINESS TYPES (public reference data)
-- =============================================
-- Anyone authenticated can read business types
CREATE POLICY "business_types_read" ON business_types
  FOR SELECT
  USING (true);

-- Only admins can modify business types
CREATE POLICY "business_types_admin_write" ON business_types
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MASTER FAQ PATTERNS (public reference data)
-- =============================================
CREATE POLICY "master_faqs_read" ON master_faq_patterns
  FOR SELECT
  USING (true);

CREATE POLICY "master_faqs_admin_write" ON master_faq_patterns
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MASTER SERVICE TEMPLATES (public reference data)
-- =============================================
CREATE POLICY "master_services_read" ON master_service_templates
  FOR SELECT
  USING (true);

CREATE POLICY "master_services_admin_write" ON master_service_templates
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MASTER GREETING PATTERNS (public reference data)
-- =============================================
CREATE POLICY "master_greetings_read" ON master_greeting_patterns
  FOR SELECT
  USING (true);

CREATE POLICY "master_greetings_admin_write" ON master_greeting_patterns
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MASTER CALL ANALYTICS (public reference data)
-- =============================================
CREATE POLICY "master_analytics_read" ON master_call_analytics
  FOR SELECT
  USING (true);

CREATE POLICY "master_analytics_admin_write" ON master_call_analytics
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MASTER KB CONTRIBUTIONS (merchant sees own, admin sees all)
-- =============================================
CREATE POLICY "contributions_merchant_read" ON master_kb_contributions
  FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY "contributions_admin_read" ON master_kb_contributions
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

CREATE POLICY "contributions_admin_write" ON master_kb_contributions
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- NOTIFICATION LOG (merchant reads own, service role writes)
-- =============================================
CREATE POLICY "notifications_merchant_read" ON notification_log
  FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY "notifications_admin_read" ON notification_log
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
