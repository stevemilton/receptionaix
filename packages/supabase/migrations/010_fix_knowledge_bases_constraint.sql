-- =============================================
-- MIGRATION 010: Fix knowledge_bases unique constraint
-- =============================================
-- The previous migration 006 used "ADD CONSTRAINT IF NOT EXISTS" which
-- is not valid PostgreSQL syntax. This migration adds the constraint properly.

-- Add unique constraint on merchant_id if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_knowledge_bases_merchant'
    AND conrelid = 'knowledge_bases'::regclass
  ) THEN
    ALTER TABLE knowledge_bases
    ADD CONSTRAINT uq_knowledge_bases_merchant UNIQUE (merchant_id);
  END IF;
END $$;
