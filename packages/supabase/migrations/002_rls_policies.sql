-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MERCHANT POLICIES
-- =============================================
-- Merchants can only see and edit their own record
CREATE POLICY "merchants_own_record" ON merchants
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can view all merchants
CREATE POLICY "merchants_admin_view" ON merchants
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- KNOWLEDGE BASE POLICIES
-- =============================================
CREATE POLICY "kb_belong_to_merchant" ON knowledge_bases
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "kb_admin_view" ON knowledge_bases
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- CUSTOMER POLICIES
-- =============================================
CREATE POLICY "customers_belong_to_merchant" ON customers
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "customers_admin_view" ON customers
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- APPOINTMENT POLICIES
-- =============================================
CREATE POLICY "appointments_belong_to_merchant" ON appointments
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "appointments_admin_view" ON appointments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- CALL POLICIES
-- =============================================
CREATE POLICY "calls_belong_to_merchant" ON calls
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "calls_admin_view" ON calls
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- MESSAGE POLICIES
-- =============================================
CREATE POLICY "messages_belong_to_merchant" ON messages
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "messages_admin_view" ON messages
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- CALL ERROR POLICIES
-- =============================================
CREATE POLICY "call_errors_belong_to_merchant" ON call_errors
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "call_errors_admin_view" ON call_errors
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- =============================================
-- ADMIN USER POLICIES
-- =============================================
CREATE POLICY "admin_users_admin_only" ON admin_users
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
