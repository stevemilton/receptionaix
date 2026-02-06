import { createClient } from '@supabase/supabase-js';

// Use any for relay server since we handle types manually
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin = createClient<any>(
  process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'] || '',
  process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export interface MerchantConfig {
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  knowledgeBase: string;
  services: Array<{ name: string; description?: string; duration: number; price: number }>;
  openingHours: Record<string, string>;
  faqs: Array<{ question: string; answer: string }>;
  greeting?: string;
  voiceId?: string;
}

export async function getMerchantConfig(merchantId: string): Promise<MerchantConfig> {
  console.log('[Supabase] Fetching merchant config for:', merchantId);

  // Fetch merchant
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .single();

  if (merchantError || !merchant) {
    console.error('[Supabase] Failed to fetch merchant:', merchantError);
    console.log('[Supabase] Returning DEFAULT config (merchant not found)');
    // Return default config
    return {
      businessName: 'Our Business',
      businessType: 'service provider',
      address: '',
      phone: '',
      knowledgeBase: '',
      services: [],
      openingHours: {
        Monday: '9am - 5pm',
        Tuesday: '9am - 5pm',
        Wednesday: '9am - 5pm',
        Thursday: '9am - 5pm',
        Friday: '9am - 5pm',
      },
      faqs: [],
    };
  }

  console.log('[Supabase] Found merchant:', merchant.business_name);

  // Fetch knowledge base separately
  const { data: kb, error: kbError } = await supabaseAdmin
    .from('knowledge_bases')
    .select('*')
    .eq('merchant_id', merchantId)
    .single();

  if (kbError) {
    console.log('[Supabase] Knowledge base error:', kbError.message);
  }

  console.log('[Supabase] Knowledge base data:', {
    found: !!kb,
    hasServices: !!kb?.services,
    servicesCount: Array.isArray(kb?.services) ? kb.services.length : 0,
    hasOpeningHours: !!kb?.opening_hours,
    openingHoursKeys: kb?.opening_hours ? Object.keys(kb.opening_hours) : [],
    hasFaqs: !!kb?.faqs,
  });

  // Extract services from knowledge base
  const services = Array.isArray(kb?.services)
    ? kb.services
    : (typeof kb?.services === 'object' && kb?.services !== null)
      ? Object.values(kb.services)
      : [];

  // Extract FAQs from knowledge base
  const faqs = Array.isArray(kb?.faqs)
    ? kb.faqs
    : [];

  const openingHours = (kb?.opening_hours as Record<string, string>) || {};
  const address = merchant.address || kb?.google_maps_data?.address || '';
  const phone = merchant.phone || kb?.google_maps_data?.phone || '';

  // Build knowledgeBase text from structured data since the content column is not populated
  const knowledgeParts: string[] = [];
  if (address) {
    knowledgeParts.push(`Address: ${address}`);
  }
  if (phone) {
    knowledgeParts.push(`Phone: ${phone}`);
  }
  if (kb?.google_maps_data?.rating) {
    knowledgeParts.push(`Google Rating: ${kb.google_maps_data.rating}/5 (${kb.google_maps_data.reviewCount || 0} reviews)`);
  }
  const knowledgeBase = kb?.content || knowledgeParts.join('\n');

  const config: MerchantConfig = {
    businessName: merchant.business_name || 'Our Business',
    businessType: merchant.business_type || 'service provider',
    address,
    phone,
    knowledgeBase,
    services: services as Array<{ name: string; description?: string; duration: number; price: number }>,
    openingHours,
    faqs: faqs as Array<{ question: string; answer: string }>,
    greeting: merchant.greeting,
    voiceId: merchant.voice_id,
  };

  console.log('[Supabase] Returning config:', {
    businessName: config.businessName,
    businessType: config.businessType,
    address: config.address,
    servicesCount: config.services.length,
    openingHoursCount: Object.keys(config.openingHours).length,
    faqsCount: config.faqs.length,
    knowledgeBaseLength: config.knowledgeBase.length,
    hasGreeting: !!config.greeting,
    voiceId: config.voiceId,
  });

  return config;
}

interface CallRecord {
  merchantId: string;
  callerPhone: string;
  startedAt: Date;
  endedAt: Date;
  transcript: string;
  durationSeconds: number;
}

export async function saveCallRecord(record: CallRecord): Promise<void> {
  const { error } = await supabaseAdmin.from('calls').insert({
    merchant_id: record.merchantId,
    caller_phone: record.callerPhone,
    started_at: record.startedAt.toISOString(),
    ended_at: record.endedAt.toISOString(),
    transcript: record.transcript,
    duration_seconds: record.durationSeconds,
    outcome: 'completed',
  });

  if (error) {
    console.error('Failed to save call record:', error);
    throw error;
  }
}
