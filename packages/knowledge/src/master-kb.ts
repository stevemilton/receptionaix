/**
 * Master Knowledge Base utilities
 *
 * Query aggregated learnings across all merchants by business type.
 * Used to:
 * 1. Provide templates for new merchants during onboarding
 * 2. Improve AI responses based on patterns
 * 3. Generate insights for the ReceptionAI team
 */

import { createClient } from '@supabase/supabase-js';

export interface ServiceTemplate {
  id: string;
  serviceName: string;
  description: string | null;
  typicalDurationMins: number | null;
  typicalPriceGbp: number | null;
  frequency: number;
}

export interface FAQPattern {
  id: string;
  questionPattern: string;
  suggestedAnswer: string | null;
  frequency: number;
  sourceMerchantCount: number;
}

export interface GreetingPattern {
  id: string;
  greetingTemplate: string;
  tone: string | null;
  usageCount: number;
  avgCallSatisfaction: number | null;
}

export interface BusinessTypeInsights {
  businessType: string;
  displayName: string;
  category: string;
  merchantCount: number;
  topServices: ServiceTemplate[];
  topFAQs: FAQPattern[];
  topGreetings: GreetingPattern[];
}

/**
 * Get templates and patterns for a business type
 * Useful for pre-populating new merchant onboarding
 */
export async function getBusinessTypeTemplates(
  supabaseUrl: string,
  supabaseKey: string,
  businessType: string
): Promise<BusinessTypeInsights | null> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Sanitize businessType to prevent PostgREST filter injection
  const sanitized = businessType.replace(/[%_\\(),.\"']/g, '');
  if (!sanitized || sanitized.length > 100) {
    return null;
  }

  // Get business type ID
  const { data: typeData, error: typeError } = await supabase
    .from('business_types')
    .select('*')
    .or(`slug.ilike.%${sanitized}%,display_name.ilike.%${sanitized}%`)
    .limit(1)
    .single();

  if (typeError && typeError.code !== 'PGRST116') {
    console.error('[MasterKB] Error fetching business type:', typeError.message);
  }

  if (!typeData) {
    return null;
  }

  // Get top services
  const { data: services, error: servicesError } = await supabase
    .from('master_service_templates')
    .select('*')
    .eq('business_type_id', typeData.id)
    .order('frequency', { ascending: false })
    .limit(10);

  if (servicesError) {
    console.error('[MasterKB] Error fetching services:', servicesError.message);
  }

  // Get top FAQs
  const { data: faqs, error: faqsError } = await supabase
    .from('master_faq_patterns')
    .select('*')
    .eq('business_type_id', typeData.id)
    .order('frequency', { ascending: false })
    .limit(10);

  if (faqsError) {
    console.error('[MasterKB] Error fetching FAQs:', faqsError.message);
  }

  // Get top greetings
  const { data: greetings, error: greetingsError } = await supabase
    .from('master_greeting_patterns')
    .select('*')
    .eq('business_type_id', typeData.id)
    .order('usage_count', { ascending: false })
    .limit(5);

  if (greetingsError) {
    console.error('[MasterKB] Error fetching greetings:', greetingsError.message);
  }

  return {
    businessType: typeData.slug,
    displayName: typeData.display_name,
    category: typeData.category,
    merchantCount: typeData.merchant_count,
    topServices: (services || []).map(s => ({
      id: s.id,
      serviceName: s.service_name,
      description: s.description,
      typicalDurationMins: s.typical_duration_mins,
      typicalPriceGbp: s.typical_price_gbp,
      frequency: s.frequency,
    })),
    topFAQs: (faqs || []).map(f => ({
      id: f.id,
      questionPattern: f.question_pattern,
      suggestedAnswer: f.suggested_answer,
      frequency: f.frequency,
      sourceMerchantCount: f.source_merchant_count,
    })),
    topGreetings: (greetings || []).map(g => ({
      id: g.id,
      greetingTemplate: g.greeting_template,
      tone: g.tone,
      usageCount: g.usage_count,
      avgCallSatisfaction: g.avg_call_satisfaction,
    })),
  };
}

/**
 * Get all business types with their merchant counts
 */
export async function getBusinessTypes(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ slug: string; displayName: string; category: string; merchantCount: number }[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('business_types')
    .select('slug, display_name, category, merchant_count')
    .order('merchant_count', { ascending: false });

  return (data || []).map(t => ({
    slug: t.slug,
    displayName: t.display_name,
    category: t.category,
    merchantCount: t.merchant_count,
  }));
}

/**
 * Get common FAQs that apply across all business types
 * (e.g., "Do you have parking?", "What are your opening hours?")
 */
export async function getUniversalFAQs(
  supabaseUrl: string,
  supabaseKey: string,
  limit: number = 20
): Promise<FAQPattern[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data } = await supabase
    .from('master_faq_patterns')
    .select('*')
    .order('source_merchant_count', { ascending: false })
    .limit(limit);

  return (data || []).map(f => ({
    id: f.id,
    questionPattern: f.question_pattern,
    suggestedAnswer: f.suggested_answer,
    frequency: f.frequency,
    sourceMerchantCount: f.source_merchant_count,
  }));
}

/**
 * Suggest services for a new merchant based on their business type
 */
export async function suggestServicesForNewMerchant(
  supabaseUrl: string,
  supabaseKey: string,
  businessType: string
): Promise<ServiceTemplate[]> {
  const templates = await getBusinessTypeTemplates(supabaseUrl, supabaseKey, businessType);
  return templates?.topServices || [];
}

/**
 * Suggest FAQs for a new merchant based on their business type
 */
export async function suggestFAQsForNewMerchant(
  supabaseUrl: string,
  supabaseKey: string,
  businessType: string
): Promise<FAQPattern[]> {
  const templates = await getBusinessTypeTemplates(supabaseUrl, supabaseKey, businessType);

  // Get universal FAQs too
  const universalFAQs = await getUniversalFAQs(supabaseUrl, supabaseKey, 5);

  // Combine type-specific + universal, dedupe by question
  const allFAQs = [...(templates?.topFAQs || []), ...universalFAQs];
  const seen = new Set<string>();

  return allFAQs.filter(faq => {
    const normalized = faq.questionPattern.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
