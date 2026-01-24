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

interface MerchantConfig {
  businessName: string;
  businessType: string;
  knowledgeBase: string;
  services: Array<{ name: string; duration: number; price: number }>;
  openingHours: Record<string, string>;
  greeting?: string;
  voiceId?: string;
}

export async function getMerchantConfig(merchantId: string): Promise<MerchantConfig> {
  // Fetch merchant
  const { data: merchant, error: merchantError } = await supabaseAdmin
    .from('merchants')
    .select('*')
    .eq('id', merchantId)
    .single();

  if (merchantError || !merchant) {
    console.error('Failed to fetch merchant config:', merchantError);
    // Return default config
    return {
      businessName: 'Our Business',
      businessType: 'service provider',
      knowledgeBase: '',
      services: [],
      openingHours: {
        Monday: '9am - 5pm',
        Tuesday: '9am - 5pm',
        Wednesday: '9am - 5pm',
        Thursday: '9am - 5pm',
        Friday: '9am - 5pm',
      },
    };
  }

  // Fetch knowledge base separately
  const { data: kb } = await supabaseAdmin
    .from('knowledge_bases')
    .select('*')
    .eq('merchant_id', merchantId)
    .single();

  // Extract services from knowledge base
  const services = Array.isArray(kb?.services)
    ? kb.services
    : (typeof kb?.services === 'object' && kb?.services !== null)
      ? Object.values(kb.services)
      : [];

  return {
    businessName: merchant.business_name || 'Our Business',
    businessType: merchant.business_type || 'service provider',
    knowledgeBase: kb?.content || '',
    services: services as Array<{ name: string; duration: number; price: number }>,
    openingHours: (kb?.opening_hours as Record<string, string>) || {},
    greeting: merchant.greeting,
    voiceId: merchant.voice_id,
  };
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
    status: 'completed',
  });

  if (error) {
    console.error('Failed to save call record:', error);
    throw error;
  }
}
