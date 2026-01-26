-- =============================================
-- MIGRATION 006: Merchant Consent + Master KB Fix
-- =============================================
-- 1. Add consent columns to merchants
-- 2. Fix master KB deduplication (unique constraints)
-- 3. Gate sync trigger on data_sharing_consent
-- 4. Properly increment frequency/source_merchant_count on upsert

-- =============================================
-- 1. ADD CONSENT COLUMNS TO MERCHANTS
-- =============================================
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS data_sharing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS consent_updated_at TIMESTAMPTZ;

-- =============================================
-- 2. ADD MISSING COLUMN TO MASTER_SERVICE_TEMPLATES
-- =============================================
ALTER TABLE master_service_templates
  ADD COLUMN IF NOT EXISTS source_merchant_count INTEGER DEFAULT 1;

-- =============================================
-- 3. ADD UNIQUE CONSTRAINT ON KNOWLEDGE_BASES
-- =============================================
-- Required for onboarding upsert to work correctly
ALTER TABLE knowledge_bases
  ADD CONSTRAINT IF NOT EXISTS uq_knowledge_bases_merchant UNIQUE (merchant_id);

-- =============================================
-- 4. DEDUPLICATE EXISTING MASTER KB DATA
-- =============================================
-- Remove duplicate services, keeping the one with the highest id (most recent)
DELETE FROM master_service_templates a
USING master_service_templates b
WHERE a.id < b.id
  AND a.business_type_id = b.business_type_id
  AND a.service_name = b.service_name;

-- Remove duplicate FAQs, keeping the one with the highest id (most recent)
DELETE FROM master_faq_patterns a
USING master_faq_patterns b
WHERE a.id < b.id
  AND a.business_type_id = b.business_type_id
  AND a.question_pattern = b.question_pattern;

-- =============================================
-- 5. ADD UNIQUE CONSTRAINTS FOR DEDUPLICATION
-- =============================================
ALTER TABLE master_service_templates
  ADD CONSTRAINT uq_master_services_type_name
  UNIQUE (business_type_id, service_name);

ALTER TABLE master_faq_patterns
  ADD CONSTRAINT uq_master_faqs_type_question
  UNIQUE (business_type_id, question_pattern);

-- =============================================
-- 6. REPLACE SYNC TRIGGER FUNCTION
-- =============================================
-- Now checks consent before syncing and uses proper upsert
CREATE OR REPLACE FUNCTION sync_to_master_kb()
RETURNS TRIGGER AS $$
DECLARE
  type_id UUID;
  merchant_consent BOOLEAN;
  merchant_consent_ts TIMESTAMPTZ;
  service JSONB;
  faq JSONB;
BEGIN
  -- Check merchant consent before syncing
  SELECT data_sharing_consent, consent_updated_at
  INTO merchant_consent, merchant_consent_ts
  FROM merchants
  WHERE id = NEW.merchant_id;

  -- If merchant has not opted in, skip master KB sync entirely
  IF NOT COALESCE(merchant_consent, FALSE) THEN
    RETURN NEW;
  END IF;

  -- Get or create business type
  SELECT normalize_business_type(
    COALESCE(
      (SELECT business_type FROM merchants WHERE id = NEW.merchant_id),
      'other'
    )
  ) INTO type_id;

  -- Sync services with proper upsert (increment on conflict)
  IF NEW.services IS NOT NULL THEN
    FOR service IN SELECT * FROM jsonb_array_elements(NEW.services)
    LOOP
      INSERT INTO master_service_templates (
        business_type_id, service_name, description,
        typical_duration_mins, typical_price_gbp,
        frequency, source_merchant_count
      )
      VALUES (
        type_id,
        service->>'name',
        service->>'description',
        (service->>'duration')::INTEGER,
        (service->>'price')::DECIMAL,
        1, 1
      )
      ON CONFLICT (business_type_id, service_name)
      DO UPDATE SET
        frequency = master_service_templates.frequency + 1,
        source_merchant_count = master_service_templates.source_merchant_count + 1,
        description = COALESCE(EXCLUDED.description, master_service_templates.description),
        typical_duration_mins = COALESCE(EXCLUDED.typical_duration_mins, master_service_templates.typical_duration_mins),
        typical_price_gbp = COALESCE(EXCLUDED.typical_price_gbp, master_service_templates.typical_price_gbp),
        updated_at = NOW();

      -- Track contribution for GDPR compliance
      INSERT INTO master_kb_contributions (
        merchant_id, business_type_id, contribution_type,
        anonymized, consent_given_at
      )
      VALUES (
        NEW.merchant_id, type_id, 'service',
        TRUE, merchant_consent_ts
      );
    END LOOP;
  END IF;

  -- Sync FAQs with proper upsert (increment on conflict)
  IF NEW.faqs IS NOT NULL THEN
    FOR faq IN SELECT * FROM jsonb_array_elements(NEW.faqs)
    LOOP
      INSERT INTO master_faq_patterns (
        business_type_id, question_pattern, suggested_answer,
        frequency, source_merchant_count
      )
      VALUES (
        type_id,
        faq->>'question',
        faq->>'answer',
        1, 1
      )
      ON CONFLICT (business_type_id, question_pattern)
      DO UPDATE SET
        frequency = master_faq_patterns.frequency + 1,
        source_merchant_count = master_faq_patterns.source_merchant_count + 1,
        suggested_answer = COALESCE(EXCLUDED.suggested_answer, master_faq_patterns.suggested_answer),
        updated_at = NOW();

      -- Track contribution for GDPR compliance
      INSERT INTO master_kb_contributions (
        merchant_id, business_type_id, contribution_type,
        anonymized, consent_given_at
      )
      VALUES (
        NEW.merchant_id, type_id, 'faq',
        TRUE, merchant_consent_ts
      );
    END LOOP;
  END IF;

  -- Update merchant count (only count consenting merchants)
  UPDATE business_types
  SET merchant_count = (
    SELECT COUNT(DISTINCT kb.merchant_id)
    FROM knowledge_bases kb
    JOIN merchants m ON kb.merchant_id = m.id
    WHERE m.data_sharing_consent = TRUE
      AND normalize_business_type(COALESCE(m.business_type, 'other')) = type_id
  )
  WHERE id = type_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
