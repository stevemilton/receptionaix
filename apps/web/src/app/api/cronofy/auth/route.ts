import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@receptionalx/cronofy';

/**
 * GET /api/cronofy/auth
 * Redirects the user to Cronofy's OAuth page where they pick their
 * calendar provider (Google, Outlook, Office 365, iCloud, Exchange).
 */
export async function GET() {
  const clientId = process.env.CRONOFY_CLIENT_ID;
  const redirectUri = process.env.CRONOFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Cronofy OAuth not configured' },
      { status: 500 }
    );
  }

  const authUrl = buildAuthUrl(
    clientId,
    redirectUri,
    'read_free_busy create_event delete_event read_events list_calendars',
  );

  return NextResponse.redirect(authUrl);
}
