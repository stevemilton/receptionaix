import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@receptionalx/shared';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle error from Google
  if (error) {
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code) {
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('error', 'Google OAuth not configured');
    return NextResponse.redirect(redirectUrl.toString());
  }

  try {
    // Get the authenticated user from the session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
      redirectUrl.searchParams.set('error', 'Not authenticated');
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Save tokens server-side in the merchants table (never expose to client)
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    const tokenPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
    };

    // Encrypt tokens at rest if TOKEN_ENCRYPTION_KEY is configured
    const encrypted = encryptToken(tokenPayload);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('merchants')
      .update({
        google_calendar_token: encrypted ?? tokenPayload,
        google_calendar_connected: true,
      })
      .eq('id', user.id);

    // Redirect back with success flag only — no tokens in URL
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('success', 'true');

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'OAuth callback failed'
    );
    return NextResponse.redirect(redirectUrl.toString());
  }
}
