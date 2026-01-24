import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data: OnboardingData = await request.json();

    // Validate required fields
    if (!data.businessName || !data.twilioPhoneNumber) {
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
          voice_id: data.voiceId,
          greeting: data.greeting,
          google_calendar_connected: data.googleCalendarConnected,
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
          voice_id: data.voiceId,
          greeting: data.greeting,
          google_calendar_connected: data.googleCalendarConnected,
          onboarding_completed: true,
        })
        .select()
        .single();

      if (createError) throw createError;
      merchantResult = created;
    }

    // Save knowledge base to separate table
    const { error: kbError } = await supabaseAny
      .from('knowledge_bases')
      .upsert({
        merchant_id: user.id,
        services: data.services,
        faqs: data.faqs,
        opening_hours: data.openingHours || {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'merchant_id',
      });

    if (kbError) {
      console.error('Knowledge base save error:', kbError);
      // Don't fail the whole request, merchant is already created
    }

    return NextResponse.json({
      success: true,
      merchant: merchantResult,
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
