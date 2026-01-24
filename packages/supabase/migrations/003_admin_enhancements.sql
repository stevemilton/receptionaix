-- =============================================
-- ADMIN ENHANCEMENTS
-- =============================================

-- Add email field to admin_users for login
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create index for email lookup
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);

-- =============================================
-- ADMIN RLS POLICIES
-- =============================================

-- Enable RLS on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can read their own record
CREATE POLICY "Admins can view own record" ON admin_users
  FOR SELECT USING (user_id = auth.uid());

-- Admins can view all merchants (for admin dashboard)
CREATE POLICY "Admins can view all merchants" ON merchants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view all calls
CREATE POLICY "Admins can view all calls" ON calls
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments" ON appointments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view all customers
CREATE POLICY "Admins can view all customers" ON customers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view all messages
CREATE POLICY "Admins can view all messages" ON messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view all knowledge bases
CREATE POLICY "Admins can view all knowledge_bases" ON knowledge_bases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can view call errors
CREATE POLICY "Admins can view all call_errors" ON call_errors
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
