-- =============================================
-- API USAGE TRACKING
-- =============================================
-- Track usage of external APIs for cost management and analytics

CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  api_name TEXT NOT NULL,           -- 'claude', 'firecrawl', 'twilio', 'google_places'
  endpoint TEXT,                    -- e.g., '/v1/messages', 'calls', 'scrape'

  -- Request details
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_status INTEGER,          -- HTTP status code
  duration_ms INTEGER,              -- How long the request took

  -- Usage metrics (varies by API)
  tokens_input INTEGER,             -- Claude: input tokens
  tokens_output INTEGER,            -- Claude: output tokens
  minutes_used DECIMAL(10, 2),      -- Twilio: call minutes
  pages_scraped INTEGER,            -- Firecrawl: pages
  requests_count INTEGER DEFAULT 1, -- General: number of API calls

  -- Cost tracking (in GBP)
  estimated_cost_gbp DECIMAL(10, 6),

  -- Context
  context JSONB,                    -- Additional context (call_id, knowledge_base_id, etc.)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DAILY AGGREGATES (for faster dashboard queries)
-- =============================================
CREATE TABLE api_usage_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  api_name TEXT NOT NULL,

  -- Aggregated metrics
  total_requests INTEGER DEFAULT 0,
  total_tokens_input INTEGER DEFAULT 0,
  total_tokens_output INTEGER DEFAULT 0,
  total_minutes DECIMAL(10, 2) DEFAULT 0,
  total_pages INTEGER DEFAULT 0,
  total_cost_gbp DECIMAL(10, 4) DEFAULT 0,

  -- Success/failure tracking
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  avg_duration_ms INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, api_name)
);

-- =============================================
-- API COST RATES (configurable)
-- =============================================
CREATE TABLE api_cost_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_name TEXT UNIQUE NOT NULL,
  rate_type TEXT NOT NULL,          -- 'per_token', 'per_minute', 'per_request', 'per_page'

  -- Rates in GBP
  input_rate DECIMAL(12, 8),        -- e.g., cost per input token
  output_rate DECIMAL(12, 8),       -- e.g., cost per output token
  base_rate DECIMAL(12, 8),         -- e.g., cost per request/minute/page

  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default rates (approximate, in GBP)
INSERT INTO api_cost_rates (api_name, rate_type, input_rate, output_rate, base_rate, notes) VALUES
  ('claude', 'per_token', 0.0000024, 0.000012, NULL, 'Claude Sonnet 4: $3/M input, $15/M output'),
  ('firecrawl', 'per_page', NULL, NULL, 0.008, 'Firecrawl: ~$0.01/page'),
  ('twilio', 'per_minute', NULL, NULL, 0.015, 'Twilio UK voice: ~£0.015/min'),
  ('google_places', 'per_request', NULL, NULL, 0.025, 'Places API: ~$0.032/request');

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_api_usage_merchant ON api_usage(merchant_id);
CREATE INDEX idx_api_usage_api_name ON api_usage(api_name);
CREATE INDEX idx_api_usage_timestamp ON api_usage(request_timestamp);
CREATE INDEX idx_api_usage_daily_date ON api_usage_daily(date);
CREATE INDEX idx_api_usage_daily_api ON api_usage_daily(api_name);

-- =============================================
-- FUNCTION: Log API usage
-- =============================================
CREATE OR REPLACE FUNCTION log_api_usage(
  p_merchant_id UUID,
  p_api_name TEXT,
  p_endpoint TEXT,
  p_response_status INTEGER,
  p_duration_ms INTEGER,
  p_tokens_input INTEGER DEFAULT NULL,
  p_tokens_output INTEGER DEFAULT NULL,
  p_minutes_used DECIMAL DEFAULT NULL,
  p_pages_scraped INTEGER DEFAULT NULL,
  p_context JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_usage_id UUID;
  v_cost DECIMAL(10, 6);
  v_rate RECORD;
BEGIN
  -- Get rate for this API
  SELECT * INTO v_rate FROM api_cost_rates WHERE api_name = p_api_name;

  -- Calculate cost based on rate type
  IF v_rate IS NOT NULL THEN
    CASE v_rate.rate_type
      WHEN 'per_token' THEN
        v_cost := COALESCE(p_tokens_input, 0) * COALESCE(v_rate.input_rate, 0) +
                  COALESCE(p_tokens_output, 0) * COALESCE(v_rate.output_rate, 0);
      WHEN 'per_minute' THEN
        v_cost := COALESCE(p_minutes_used, 0) * COALESCE(v_rate.base_rate, 0);
      WHEN 'per_page' THEN
        v_cost := COALESCE(p_pages_scraped, 1) * COALESCE(v_rate.base_rate, 0);
      WHEN 'per_request' THEN
        v_cost := COALESCE(v_rate.base_rate, 0);
      ELSE
        v_cost := 0;
    END CASE;
  ELSE
    v_cost := 0;
  END IF;

  -- Insert usage record
  INSERT INTO api_usage (
    merchant_id, api_name, endpoint, response_status, duration_ms,
    tokens_input, tokens_output, minutes_used, pages_scraped,
    estimated_cost_gbp, context
  )
  VALUES (
    p_merchant_id, p_api_name, p_endpoint, p_response_status, p_duration_ms,
    p_tokens_input, p_tokens_output, p_minutes_used, p_pages_scraped,
    v_cost, p_context
  )
  RETURNING id INTO v_usage_id;

  -- Update daily aggregate
  INSERT INTO api_usage_daily (
    date, api_name, total_requests, total_tokens_input, total_tokens_output,
    total_minutes, total_pages, total_cost_gbp,
    successful_requests, failed_requests, avg_duration_ms
  )
  VALUES (
    CURRENT_DATE, p_api_name, 1,
    COALESCE(p_tokens_input, 0), COALESCE(p_tokens_output, 0),
    COALESCE(p_minutes_used, 0), COALESCE(p_pages_scraped, 0),
    v_cost,
    CASE WHEN p_response_status < 400 THEN 1 ELSE 0 END,
    CASE WHEN p_response_status >= 400 THEN 1 ELSE 0 END,
    p_duration_ms
  )
  ON CONFLICT (date, api_name) DO UPDATE SET
    total_requests = api_usage_daily.total_requests + 1,
    total_tokens_input = api_usage_daily.total_tokens_input + COALESCE(p_tokens_input, 0),
    total_tokens_output = api_usage_daily.total_tokens_output + COALESCE(p_tokens_output, 0),
    total_minutes = api_usage_daily.total_minutes + COALESCE(p_minutes_used, 0),
    total_pages = api_usage_daily.total_pages + COALESCE(p_pages_scraped, 0),
    total_cost_gbp = api_usage_daily.total_cost_gbp + v_cost,
    successful_requests = api_usage_daily.successful_requests +
      CASE WHEN p_response_status < 400 THEN 1 ELSE 0 END,
    failed_requests = api_usage_daily.failed_requests +
      CASE WHEN p_response_status >= 400 THEN 1 ELSE 0 END,
    avg_duration_ms = (api_usage_daily.avg_duration_ms * api_usage_daily.total_requests + p_duration_ms) /
      (api_usage_daily.total_requests + 1),
    updated_at = NOW();

  RETURN v_usage_id;
END;
$$ LANGUAGE plpgsql;
