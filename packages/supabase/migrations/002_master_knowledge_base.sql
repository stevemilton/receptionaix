-- =============================================
-- MASTER KNOWLEDGE BASE TABLES
-- =============================================
-- Aggregated learnings across all merchants, grouped by business type
-- Used to improve AI responses and provide templates for new merchants

-- =============================================
-- BUSINESS TYPES TABLE (canonical list)
-- =============================================
CREATE TABLE business_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,  -- e.g., 'dental_practice', 'hair_salon', 'bakery'
  display_name TEXT NOT NULL, -- e.g., 'Dental Practice', 'Hair Salon', 'Bakery'
  category TEXT,              -- e.g., 'healthcare', 'beauty', 'food_beverage'
  merchant_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed common business types
INSERT INTO business_types (slug, display_name, category) VALUES
  ('dental_practice', 'Dental Practice', 'healthcare'),
  ('hair_salon', 'Hair Salon', 'beauty'),
  ('beauty_salon', 'Beauty Salon', 'beauty'),
  ('spa', 'Spa', 'beauty'),
  ('bakery', 'Bakery', 'food_beverage'),
  ('cafe', 'Café', 'food_beverage'),
  ('restaurant', 'Restaurant', 'food_beverage'),
  ('veterinary', 'Veterinary Practice', 'healthcare'),
  ('physiotherapy', 'Physiotherapy', 'healthcare'),
  ('accountant', 'Accountant', 'professional_services'),
  ('solicitor', 'Solicitor', 'professional_services'),
  ('plumber', 'Plumber', 'trades'),
  ('electrician', 'Electrician', 'trades'),
  ('garage', 'Car Garage', 'automotive'),
  ('gym', 'Gym / Fitness', 'fitness'),
  ('yoga_studio', 'Yoga Studio', 'fitness');

-- =============================================
-- MASTER FAQ PATTERNS
-- =============================================
-- Common questions asked across merchants of the same type
CREATE TABLE master_faq_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  question_pattern TEXT NOT NULL,       -- e.g., "Do you have parking?"
  suggested_answer TEXT,                -- Template answer merchants can customize
  frequency INTEGER DEFAULT 1,          -- How often this question appears
  source_merchant_count INTEGER DEFAULT 1, -- How many merchants have this FAQ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MASTER SERVICE TEMPLATES
-- =============================================
-- Standard services by business type that new merchants can start from
CREATE TABLE master_service_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  description TEXT,
  typical_duration_mins INTEGER,
  typical_price_gbp DECIMAL(10, 2),
  frequency INTEGER DEFAULT 1,          -- How often this service appears
  source_merchant_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MASTER GREETING PATTERNS
-- =============================================
-- Successful greeting styles by business type
CREATE TABLE master_greeting_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  greeting_template TEXT NOT NULL,
  tone TEXT,                            -- e.g., 'friendly', 'professional', 'warm'
  usage_count INTEGER DEFAULT 1,
  avg_call_satisfaction DECIMAL(3, 2),  -- 1.0-5.0 scale
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CALL ANALYTICS BY BUSINESS TYPE
-- =============================================
-- Aggregated call outcome data for learning
CREATE TABLE master_call_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  avg_duration_seconds INTEGER,
  appointment_conversion_rate DECIMAL(5, 4),  -- % of calls that result in booking
  message_rate DECIMAL(5, 4),                 -- % of calls that result in message
  common_intents JSONB,                       -- e.g., {"booking": 45, "hours": 30, "pricing": 25}
  peak_hours JSONB,                           -- e.g., {"9": 15, "10": 25, "14": 20}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_type_id, period_start, period_end)
);

-- =============================================
-- MERCHANT CONTRIBUTION TRACKING
-- =============================================
-- Track which merchants contributed to master KB (for GDPR compliance)
CREATE TABLE master_kb_contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  business_type_id UUID REFERENCES business_types(id) ON DELETE CASCADE,
  contribution_type TEXT NOT NULL,      -- 'faq', 'service', 'greeting', 'call_data'
  contribution_id UUID,                 -- ID of the master_* record
  anonymized BOOLEAN DEFAULT TRUE,      -- Data is anonymized before aggregation
  consent_given_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_master_faq_business_type ON master_faq_patterns(business_type_id);
CREATE INDEX idx_master_services_business_type ON master_service_templates(business_type_id);
CREATE INDEX idx_master_greetings_business_type ON master_greeting_patterns(business_type_id);
CREATE INDEX idx_master_analytics_business_type ON master_call_analytics(business_type_id);
CREATE INDEX idx_master_contributions_merchant ON master_kb_contributions(merchant_id);
CREATE INDEX idx_business_types_category ON business_types(category);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_business_types_updated_at
  BEFORE UPDATE ON business_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_faq_updated_at
  BEFORE UPDATE ON master_faq_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_services_updated_at
  BEFORE UPDATE ON master_service_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_master_greetings_updated_at
  BEFORE UPDATE ON master_greeting_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- HELPER FUNCTION: Normalize business type
-- =============================================
CREATE OR REPLACE FUNCTION normalize_business_type(input_type TEXT)
RETURNS UUID AS $$
DECLARE
  type_id UUID;
  normalized TEXT;
BEGIN
  -- Normalize input (lowercase, replace spaces with underscores)
  normalized := LOWER(REGEXP_REPLACE(input_type, '\s+', '_', 'g'));

  -- Try exact match first
  SELECT id INTO type_id FROM business_types WHERE slug = normalized;

  -- If not found, try partial match
  IF type_id IS NULL THEN
    SELECT id INTO type_id FROM business_types
    WHERE normalized LIKE '%' || slug || '%' OR slug LIKE '%' || normalized || '%'
    LIMIT 1;
  END IF;

  -- If still not found, create a new type
  IF type_id IS NULL THEN
    INSERT INTO business_types (slug, display_name, category)
    VALUES (normalized, input_type, 'other')
    RETURNING id INTO type_id;
  END IF;

  RETURN type_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Sync merchant KB to master
-- =============================================
CREATE OR REPLACE FUNCTION sync_to_master_kb()
RETURNS TRIGGER AS $$
DECLARE
  type_id UUID;
  service JSONB;
  faq JSONB;
BEGIN
  -- Get or create business type
  SELECT normalize_business_type(
    COALESCE(
      (SELECT business_type FROM merchants WHERE id = NEW.merchant_id),
      'other'
    )
  ) INTO type_id;

  -- Sync services to master templates
  IF NEW.services IS NOT NULL THEN
    FOR service IN SELECT * FROM jsonb_array_elements(NEW.services)
    LOOP
      INSERT INTO master_service_templates (
        business_type_id, service_name, description,
        typical_duration_mins, typical_price_gbp, frequency
      )
      VALUES (
        type_id,
        service->>'name',
        service->>'description',
        (service->>'duration')::INTEGER,
        (service->>'price')::DECIMAL,
        1
      )
      ON CONFLICT DO NOTHING;

      -- Track contribution
      INSERT INTO master_kb_contributions (
        merchant_id, business_type_id, contribution_type, anonymized
      )
      VALUES (NEW.merchant_id, type_id, 'service', TRUE);
    END LOOP;
  END IF;

  -- Sync FAQs to master patterns
  IF NEW.faqs IS NOT NULL THEN
    FOR faq IN SELECT * FROM jsonb_array_elements(NEW.faqs)
    LOOP
      INSERT INTO master_faq_patterns (
        business_type_id, question_pattern, suggested_answer, frequency
      )
      VALUES (
        type_id,
        faq->>'question',
        faq->>'answer',
        1
      )
      ON CONFLICT DO NOTHING;

      -- Track contribution
      INSERT INTO master_kb_contributions (
        merchant_id, business_type_id, contribution_type, anonymized
      )
      VALUES (NEW.merchant_id, type_id, 'faq', TRUE);
    END LOOP;
  END IF;

  -- Update merchant count for business type
  UPDATE business_types
  SET merchant_count = (
    SELECT COUNT(DISTINCT merchant_id)
    FROM knowledge_bases kb
    JOIN merchants m ON kb.merchant_id = m.id
    WHERE normalize_business_type(m.business_type) = type_id
  )
  WHERE id = type_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to sync on knowledge_base insert/update
CREATE TRIGGER sync_kb_to_master
  AFTER INSERT OR UPDATE ON knowledge_bases
  FOR EACH ROW EXECUTE FUNCTION sync_to_master_kb();
