import { NextResponse } from 'next/server';

interface TwilioNumber {
  phone_number: string;
  friendly_name: string;
  locality?: string;
  region?: string;
}

interface TwilioResponse {
  available_phone_numbers?: TwilioNumber[];
}

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return NextResponse.json(
      { error: 'Twilio credentials not configured' },
      { status: 500 }
    );
  }

  try {
    // Search for available UK mobile numbers
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/GB/Mobile.json?PageSize=5&VoiceEnabled=true`;

    const response = await fetch(url, {
      headers: {
        Authorization:
          'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Twilio API error:', errorText);
      throw new Error('Failed to fetch available numbers');
    }

    const data: TwilioResponse = await response.json();

    const numbers = (data.available_phone_numbers || []).map((num) => ({
      phoneNumber: num.phone_number,
      friendlyName: num.friendly_name,
      locality: num.locality,
      region: num.region,
    }));

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error('Error fetching available numbers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch numbers' },
      { status: 500 }
    );
  }
}
