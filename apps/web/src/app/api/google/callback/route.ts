import { NextResponse } from 'next/server';

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
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      throw new Error('Failed to exchange authorization code');
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json();

    // Calculate expiration timestamp
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Redirect back to onboarding with tokens
    const redirectUrl = new URL('/onboarding/calendar-connect', process.env.NEXT_PUBLIC_APP_URL);
    redirectUrl.searchParams.set('success', 'true');
    redirectUrl.searchParams.set('access_token', tokens.access_token);
    if (tokens.refresh_token) {
      redirectUrl.searchParams.set('refresh_token', tokens.refresh_token);
    }
    redirectUrl.searchParams.set('expires_at', expiresAt.toString());

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
