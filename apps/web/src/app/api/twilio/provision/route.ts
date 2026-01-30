import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

interface TwilioIncomingNumber {
  sid: string;
  phone_number: string;
  friendly_name: string;
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: 'Twilio credentials not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Purchase the phone number
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;

    // Configure webhooks for the phone number
    const webhookUrl = `${appUrl}/api/twilio/incoming`;

    // Bundle SID for UK regulatory compliance
    const bundleSid = process.env.TWILIO_BUNDLE_SID;

    const params = new URLSearchParams({
      PhoneNumber: phoneNumber,
      VoiceUrl: webhookUrl,
      VoiceMethod: 'POST',
      FriendlyName: 'ReceptionAI Line',
    });

    // Add bundle SID if available (required for UK mobile numbers)
    if (bundleSid) {
      params.append('BundleSid', bundleSid);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio provision error:', errorText);
      throw new Error('Failed to provision phone number');
    }

    const data: TwilioIncomingNumber = await response.json();

    return NextResponse.json({
      phoneNumber: data.phone_number,
      sid: data.sid,
      friendlyName: data.friendly_name,
    });
  } catch (error) {
    console.error('Error provisioning number:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision number' },
      { status: 500 }
    );
  }
}
