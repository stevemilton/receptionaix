/**
 * API Usage Tracking
 *
 * Log external API calls for cost tracking and analytics.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export type ApiName = 'claude' | 'firecrawl' | 'twilio' | 'google_places';

export interface ApiUsageLog {
  merchantId?: string;
  apiName: ApiName;
  endpoint?: string;
  responseStatus: number;
  durationMs: number;
  tokensInput?: number;
  tokensOutput?: number;
  minutesUsed?: number;
  pagesScraped?: number;
  context?: Record<string, unknown>;
}

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.warn('[API Usage] Supabase URL or SERVICE_ROLE_KEY not configured, usage tracking disabled');
    return null;
  }

  supabaseClient = createClient(url, key);
  return supabaseClient;
}

/**
 * Log an API call for usage tracking
 */
export async function logApiUsage(log: ApiUsageLog): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase.rpc('log_api_usage', {
      p_merchant_id: log.merchantId || null,
      p_api_name: log.apiName,
      p_endpoint: log.endpoint || null,
      p_response_status: log.responseStatus,
      p_duration_ms: log.durationMs,
      p_tokens_input: log.tokensInput || null,
      p_tokens_output: log.tokensOutput || null,
      p_minutes_used: log.minutesUsed || null,
      p_pages_scraped: log.pagesScraped || null,
      p_context: log.context || null,
    });

    if (error) {
      console.error('[API Usage] Failed to log:', error.message);
    }
  } catch (err) {
    console.error('[API Usage] Error logging:', err);
  }
}

/**
 * Wrapper to time and log an API call
 */
export async function withApiUsageTracking<T>(
  apiName: ApiName,
  endpoint: string,
  fn: () => Promise<{ result: T; tokensInput?: number; tokensOutput?: number; pagesScraped?: number }>,
  merchantId?: string
): Promise<T> {
  const startTime = Date.now();
  let responseStatus = 200;

  try {
    const { result, tokensInput, tokensOutput, pagesScraped } = await fn();
    const durationMs = Date.now() - startTime;

    await logApiUsage({
      merchantId,
      apiName,
      endpoint,
      responseStatus,
      durationMs,
      tokensInput,
      tokensOutput,
      pagesScraped,
    });

    return result;
  } catch (error) {
    responseStatus = 500;
    const durationMs = Date.now() - startTime;

    await logApiUsage({
      merchantId,
      apiName,
      endpoint,
      responseStatus,
      durationMs,
      context: { error: String(error) },
    });

    throw error;
  }
}

/**
 * Get usage summary for dashboard
 */
export async function getApiUsageSummary(
  days: number = 30
): Promise<{
  byApi: { apiName: string; requests: number; cost: number; successRate: number }[];
  totalCost: number;
  totalRequests: number;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { byApi: [], totalCost: 0, totalRequests: 0 };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('api_usage_daily')
    .select('api_name, total_requests, total_cost_gbp, successful_requests, failed_requests')
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error || !data) {
    console.error('[API Usage] Failed to get summary:', error?.message);
    return { byApi: [], totalCost: 0, totalRequests: 0 };
  }

  // Aggregate by API
  const byApiMap = new Map<string, { requests: number; cost: number; success: number; failed: number }>();

  for (const row of data) {
    const existing = byApiMap.get(row.api_name) || { requests: 0, cost: 0, success: 0, failed: 0 };
    byApiMap.set(row.api_name, {
      requests: existing.requests + row.total_requests,
      cost: existing.cost + Number(row.total_cost_gbp),
      success: existing.success + row.successful_requests,
      failed: existing.failed + row.failed_requests,
    });
  }

  const byApi = Array.from(byApiMap.entries()).map(([apiName, stats]) => ({
    apiName,
    requests: stats.requests,
    cost: stats.cost,
    successRate: stats.requests > 0 ? (stats.success / stats.requests) * 100 : 0,
  }));

  const totalCost = byApi.reduce((sum, api) => sum + api.cost, 0);
  const totalRequests = byApi.reduce((sum, api) => sum + api.requests, 0);

  return { byApi, totalCost, totalRequests };
}
