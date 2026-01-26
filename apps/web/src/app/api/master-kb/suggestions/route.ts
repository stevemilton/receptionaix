import { NextResponse } from 'next/server';
import {
  suggestServicesForNewMerchant,
  suggestFAQsForNewMerchant,
} from '@receptionalx/knowledge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const businessType = searchParams.get('businessType');

  if (!businessType) {
    return NextResponse.json(
      { error: 'businessType query parameter is required' },
      { status: 400 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase configuration missing' },
      { status: 500 }
    );
  }

  try {
    const [services, faqs] = await Promise.all([
      suggestServicesForNewMerchant(supabaseUrl, supabaseKey, businessType),
      suggestFAQsForNewMerchant(supabaseUrl, supabaseKey, businessType),
    ]);

    return NextResponse.json({
      success: true,
      suggestions: { services, faqs },
    });
  } catch (error) {
    console.error('Master KB suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
