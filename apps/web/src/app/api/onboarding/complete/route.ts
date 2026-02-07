import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateCsrfOrigin, csrfForbiddenResponse } from '@/lib/csrf';

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
  if (!validateCsrfOrigin(request)) {
    return csrfForbiddenResponse();
  }

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
    if (!data.businessName || typeof data.businessName !== 'string' || !data.twilioPhoneNumber || typeof data.twilioPhoneNumber !== 'string') {
      return NextResponse.json(
        { error: 'Business name and phone number are required' },
        { status: 400 }
      );
    }

    // Length limits
    if (data.businessName.length > 200 || data.twilioPhoneNumber.length > 20) {
      return NextResponse.json(
        { error: 'Invalid field lengths' },
        { status: 400 }
      );
    }

    // Sanitize arrays — cap sizes and strip unexpected fields
    if (Array.isArray(data.services)) {
      data.services = data.services.slice(0, 50).map(s => ({
        name: String(s.name || '').slice(0, 200),
        description: s.description ? String(s.description).slice(0, 500) : undefined,
        duration: typeof s.duration === 'number' ? s.duration : undefined,
        price: typeof s.price === 'number' ? s.price : undefined,
      }));
    } else {
      data.services = [];
    }

    if (Array.isArray(data.faqs)) {
      data.faqs = data.faqs.slice(0, 50).map(f => ({
        question: String(f.question || '').slice(0, 500),
        answer: String(f.answer || '').slice(0, 2000),
      }));
    } else {
      data.faqs = [];
    }

    // Check for existing merchant
    const { data: existingMerchant, error: checkError } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = row not found, which is fine
      throw checkError;
    }

    let merchantResult;

    // Core fields that exist in the base schema
    const coreFields = {
      business_name: data.businessName,
      business_type: data.businessType,
      address: data.address,
      phone: data.phone,
      twilio_phone_number: data.twilioPhoneNumber,
      voice_id: data.voiceId,
      greeting: data.greeting,
      google_calendar_connected: data.googleCalendarConnected,
      onboarding_completed: true,
    };

    // Fields from later migrations (006 consent, 007 forward_phone)
    // Include them but handle gracefully if columns don't exist yet
    const extendedFields = {
      forward_phone: data.forwardPhone || data.phone || null,
      data_sharing_consent: data.dataSharingConsent || false,
      marketing_consent: data.marketingConsent || false,
      consent_updated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saveMerchant = async (fields: Record<string, any>): Promise<any> => {
      if (existingMerchant) {
        const { data: updated, error: updateError } = await supabase
          .from('merchants')
          .update({ ...fields, updated_at: new Date().toISOString() } as never)
          .eq('id', user.id)
          .select()
          .single();
        if (updateError) throw updateError;
        return updated;
      } else {
        const { data: created, error: createError } = await supabase
          .from('merchants')
          .insert({ id: user.id, email: user.email || '', ...fields } as never)
          .select()
          .single();
        if (createError) throw createError;
        return created;
      }
    };

    try {
      // Try with all fields (including extended migration columns)
      console.log('[Onboarding Complete] Attempting save with all fields...');
      merchantResult = await saveMerchant({ ...coreFields, ...extendedFields });
      console.log('[Onboarding Complete] Save succeeded with all fields');
    } catch (fullError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fe = fullError as any;
      console.warn('[Onboarding Complete] Full save failed:', fe?.message || fe?.code || JSON.stringify(fullError));
      console.log('[Onboarding Complete] Retrying with core fields only...');
      merchantResult = await saveMerchant(coreFields);
      console.log('[Onboarding Complete] Core-only save succeeded');
    }

    // Save knowledge base to separate table using service role to bypass RLS
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient: any = createAdminClient();

    // First check if KB exists for this merchant
    const { data: existingKb } = await adminClient
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
      const { data: updated, error: updateKbError } = await adminClient
        .from('knowledge_bases')
        .update(kbPayload)
        .eq('merchant_id', user.id)
        .select();

      kbResult = updated;
      kbError = updateKbError;
    } else {
      // Insert new knowledge base
      const { data: created, error: createKbError } = await adminClient
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
    console.error('[Onboarding Complete] Error:', JSON.stringify(error, null, 2));
    console.error('[Onboarding Complete] Error type:', typeof error);
    console.error('[Onboarding Complete] Error constructor:', error?.constructor?.name);
    // Supabase errors have .message, .code, .details, .hint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supaErr = error as any;
    const errorMessage = supaErr?.message || (error instanceof Error ? error.message : 'Failed to complete onboarding');
    const errorDetails = supaErr?.details || supaErr?.hint || supaErr?.code || '';
    console.error('[Onboarding Complete] Error message:', errorMessage, 'Details:', errorDetails);
    return NextResponse.json(
      { error: `${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}` },
      { status: 500 }
    );
  }
}
