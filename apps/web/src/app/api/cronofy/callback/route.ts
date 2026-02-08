import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@receptionalx/shared';
import { exchangeCode, listCalendars } from '@receptionalx/cronofy';

/**
 * GET /api/cronofy/callback
 * Handles the OAuth callback from Cronofy.
 * Exchanges the authorization code for tokens, lists calendars,
 * auto-selects the primary calendar, and stores everything encrypted.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Handle error from Cronofy
  if (error) {
    const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl.toString());
  }

  if (!code) {
    const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
    redirectUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(redirectUrl.toString());
  }

  const clientId = process.env.CRONOFY_CLIENT_ID;
  const clientSecret = process.env.CRONOFY_CLIENT_SECRET;
  const redirectUri = process.env.CRONOFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
    redirectUrl.searchParams.set('error', 'Cronofy OAuth not configured');
    return NextResponse.redirect(redirectUrl.toString());
  }

  try {
    // Get the authenticated user from the session cookie
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
      redirectUrl.searchParams.set('error', 'Not authenticated');
      return NextResponse.redirect(redirectUrl.toString());
    }

    // Exchange code for tokens
    const tokens = await exchangeCode(code, clientId, clientSecret, redirectUri);

    // List calendars to pick the primary one
    let calendarId: string | null = null;
    let providerName: string | null = null;

    try {
      const calendarsResponse = await listCalendars(tokens.access_token);
      const calendars = calendarsResponse.calendars || [];

      // Pick the first primary calendar, or fall back to first calendar
      const primary = calendars.find((c) => c.calendar_primary) || calendars[0];
      if (primary) {
        calendarId = primary.calendar_id;
        providerName = primary.provider_name || null;
      }
    } catch (calErr) {
      console.warn('Failed to list Cronofy calendars (will let user pick later):', calErr);
    }

    // Compute token expiry
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Encrypt tokens at rest
    const tokenPayload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
    };
    const encryptedAccess = encryptToken(tokenPayload.access_token) ?? tokenPayload.access_token;
    const encryptedRefresh = tokens.refresh_token
      ? (encryptToken(tokenPayload.refresh_token) ?? tokenPayload.refresh_token)
      : null;

    // Store Cronofy data in the merchants table
    await supabase
      .from('merchants')
      .update({
        cronofy_access_token: encryptedAccess,
        cronofy_refresh_token: encryptedRefresh,
        cronofy_token_expires_at: expiresAt,
        cronofy_account_id: tokens.account_id || null,
        cronofy_calendar_id: calendarId,
        cronofy_provider: providerName,
        calendar_connected: true,
      } as Record<string, unknown>)
      .eq('id', user.id);

    // Redirect back with success flag only — no tokens in URL
    const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
    redirectUrl.searchParams.set('success', 'true');
    if (providerName) {
      redirectUrl.searchParams.set('provider', providerName);
    }

    return NextResponse.redirect(redirectUrl.toString());
  } catch (err) {
    console.error('Cronofy OAuth callback error:', err);
    const redirectUrl = new URL('/onboarding/calendar-connect', appUrl);
    redirectUrl.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'OAuth callback failed'
    );
    return NextResponse.redirect(redirectUrl.toString());
  }
}
