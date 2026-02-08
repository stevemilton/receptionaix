import type {
  CronofyTokenResponse,
  CronofyFreeBusyResponse,
  CronofyListCalendarsResponse,
  CronofyEventData,
} from './types.js';

// UK data center for ReceptionAI (UK-focused product)
const BASE_URL = 'https://api-uk.cronofy.com';
const AUTH_URL = 'https://app.cronofy.com';
const REQUEST_TIMEOUT = 15_000;

/**
 * Build the Cronofy OAuth authorization URL.
 * User is redirected here to connect their calendar.
 */
export function buildAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string = 'read_free_busy create_event delete_event',
  state?: string
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
  });
  if (state) {
    params.set('state', state);
  }
  return `${AUTH_URL}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<CronofyTokenResponse> {
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy token exchange failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as never;
}

/**
 * Refresh an expired access token.
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<CronofyTokenResponse> {
  const response = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy token refresh failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as never;
}

/**
 * List all calendars for the authenticated user.
 */
export async function listCalendars(
  accessToken: string
): Promise<CronofyListCalendarsResponse> {
  const response = await fetch(`${BASE_URL}/v1/calendars`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy listCalendars failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as never;
}

/**
 * Get free/busy blocks for a date range.
 * Returns busy periods — subtract from opening hours to get available slots.
 */
export async function getFreeBusy(
  accessToken: string,
  from: string,
  to: string,
  tzid: string = 'Europe/London'
): Promise<CronofyFreeBusyResponse> {
  const params = new URLSearchParams({ from, to, tzid });

  const response = await fetch(`${BASE_URL}/v1/free_busy?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy getFreeBusy failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as never;
}

/**
 * Create or update an event in a calendar.
 * Uses upsert behavior — same event_id updates the existing event.
 */
export async function createEvent(
  accessToken: string,
  calendarId: string,
  event: CronofyEventData
): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy createEvent failed (${response.status}): ${errorText}`);
  }
  // Cronofy returns 202 Accepted with no body
}

/**
 * Delete an event from a calendar.
 */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(`${BASE_URL}/v1/calendars/${calendarId}/events`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ event_id: eventId }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cronofy deleteEvent failed (${response.status}): ${errorText}`);
  }
}
