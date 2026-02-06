-- =============================================
-- MIGRATION 011: Fix knowledge_bases RLS policies
-- =============================================
-- The kb_belong_to_merchant policy from migration 002 was not applied
-- to the live database. This migration ensures the policy exists,
-- allowing merchants to read/write their own knowledge base.

-- Ensure RLS is enabled (idempotent)
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the merchant policy to ensure it exists
-- (DROP IF EXISTS is safe even if the policy doesn't exist yet)
DROP POLICY IF EXISTS "kb_belong_to_merchant" ON knowledge_bases;
CREATE POLICY "kb_belong_to_merchant" ON knowledge_bases
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Ensure admin view policy exists too
DROP POLICY IF EXISTS "kb_admin_view" ON knowledge_bases;
CREATE POLICY "kb_admin_view" ON knowledge_bases
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Also ensure the admin policy from migration 003 exists
DROP POLICY IF EXISTS "Admins can view all knowledge_bases" ON knowledge_bases;
CREATE POLICY "Admins can view all knowledge_bases" ON knowledge_bases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );
