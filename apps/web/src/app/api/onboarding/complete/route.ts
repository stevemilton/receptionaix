import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';
import { createClient } from '@supabase/supabase-js';

// Service role client for server-side operations that bypass RLS
const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface OnboardingData {
  businessName: string;
  businessType: string;
  address: string;
  phone: string;
  services: Array<{
    name: string;
    description?: string;
    duration?: number;
    price?: number;
  }>;
  openingHours?: Record<string, string>;
  greeting: string;
  voiceId: string;
  googleCalendarConnected: boolean;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  twilioPhoneNumber: string | null;
  forwardPhone?: string;
  dataSharingConsent?: boolean;
  marketingConsent?: boolean;
}

export async function POST(request: Request) {
  const { user, supabase } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data: OnboardingData = await request.json();

    console.log('[Onboarding Complete] User ID:', user.id);
    console.log('[Onboarding Complete] User email:', user.email);
    console.log('[Onboarding Complete] Received data summary:', {
      businessName: data.businessName,
      businessType: data.businessType,
      twilioPhoneNumber: data.twilioPhoneNumber,
      services_count: data.services?.length || 0,
      faqs_count: data.faqs?.length || 0,
      has_opening_hours: !!data.openingHours && Object.keys(data.openingHours).length > 0,
      opening_hours_keys: data.openingHours ? Object.keys(data.openingHours) : [],
      dataSharingConsent: data.dataSharingConsent,
    });
    console.log('[Onboarding Complete] Full services:', JSON.stringify(data.services, null, 2));
    console.log('[Onboarding Complete] Full FAQs:', JSON.stringify(data.faqs, null, 2));
    console.log('[Onboarding Complete] Full openingHours:', JSON.stringify(data.openingHours, null, 2));

    // Validate required fields
    if (!data.businessName || !data.twilioPhoneNumber) {
      console.log('[Onboarding Complete] Validation failed - missing fields:', {
        businessName: !!data.businessName,
        twilioPhoneNumber: !!data.twilioPhoneNumber
      });
      return NextResponse.json(
        { error: 'Business name and phone number are required' },
        { status: 400 }
      );
    }

    // Check for existing merchant
    interface MerchantRow {
      id: string;
    }
    const { data: existingMerchant, error: checkError } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', user.id)
      .single<MerchantRow>();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = row not found, which is fine
      throw checkError;
    }

    let merchantResult;

    // Cast to any to work around Supabase types not being regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any;

    if (existingMerchant) {
      // Update existing merchant
      const { data: updated, error: updateError } = await supabaseAny
        .from('merchants')
        .update({
          business_name: data.businessName,
          business_type: data.businessType,
          address: data.address,
          phone: data.phone,
          twilio_phone_number: data.twilioPhoneNumber,
          forward_phone: data.forwardPhone || data.phone || null,
          voice_id: data.voiceId,
          greeting: data.greeting,
          google_calendar_connected: data.googleCalendarConnected,
          data_sharing_consent: data.dataSharingConsent || false,
          marketing_consent: data.marketingConsent || false,
          consent_updated_at: new Date().toISOString(),
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      merchantResult = updated;
    } else {
      // Create new merchant
      const { data: created, error: createError } = await supabaseAny
        .from('merchants')
        .insert({
          id: user.id,
          email: user.email || '',
          business_name: data.businessName,
          business_type: data.businessType,
          address: data.address,
          phone: data.phone,
          twilio_phone_number: data.twilioPhoneNumber,
          forward_phone: data.forwardPhone || data.phone || null,
          voice_id: data.voiceId,
          greeting: data.greeting,
          google_calendar_connected: data.googleCalendarConnected,
          data_sharing_consent: data.dataSharingConsent || false,
          marketing_consent: data.marketingConsent || false,
          consent_updated_at: new Date().toISOString(),
          onboarding_completed: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      merchantResult = created;
    }

    // Save knowledge base to separate table using service role to bypass RLS
    // First check if KB exists for this merchant
    const { data: existingKb } = await serviceSupabase
      .from('knowledge_bases')
      .select('id')
      .eq('merchant_id', user.id)
      .single();

    const kbPayload = {
      services: data.services || [],
      faqs: data.faqs || [],
      opening_hours: data.openingHours || {},
      updated_at: new Date().toISOString(),
    };

    console.log('[Onboarding Complete] Knowledge base payload:', JSON.stringify(kbPayload, null, 2));
    console.log('[Onboarding Complete] Existing KB:', existingKb ? 'yes' : 'no');

    let kbResult;
    let kbError;

    if (existingKb) {
      // Update existing knowledge base
      const { data: updated, error: updateKbError } = await serviceSupabase
        .from('knowledge_bases')
        .update(kbPayload)
        .eq('merchant_id', user.id)
        .select();

      kbResult = updated;
      kbError = updateKbError;
    } else {
      // Insert new knowledge base
      const { data: created, error: createKbError } = await serviceSupabase
        .from('knowledge_bases')
        .insert({
          merchant_id: user.id,
          ...kbPayload,
        })
        .select();

      kbResult = created;
      kbError = createKbError;
    }

    if (kbError) {
      console.error('[Onboarding Complete] Knowledge base save error:', kbError);
      console.error('[Onboarding Complete] KB error details:', JSON.stringify(kbError, null, 2));
      // Log but don't fail - merchant is already created
    } else {
      console.log('[Onboarding Complete] Knowledge base saved successfully:', kbResult);
    }

    // If user consented to data sharing, the database trigger will sync to master KB
    if (data.dataSharingConsent) {
      console.log('[Onboarding Complete] Data sharing consent given - master KB sync will be triggered');
    }

    return NextResponse.json({
      success: true,
      merchant: merchantResult,
    });
  } catch (error) {
    console.error('[Onboarding Complete] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
    console.error('[Onboarding Complete] Error message:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
