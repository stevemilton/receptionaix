/** Response from Cronofy token exchange or refresh */
export interface CronofyTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  account_id: string;
  sub: string;
  linking_profile: {
    provider_name: string;
    profile_id: string;
    profile_name: string;
  };
}

/** A single free/busy block from Cronofy */
export interface CronofyFreeBusyBlock {
  calendar_id: string;
  start: string;
  end: string;
  free_busy_status: 'busy' | 'tentative' | 'free' | 'unknown';
}

/** Response from the free/busy endpoint */
export interface CronofyFreeBusyResponse {
  pages: { current: number; total: number };
  free_busy: CronofyFreeBusyBlock[];
}

/** A calendar from Cronofy */
export interface CronofyCalendar {
  calendar_id: string;
  calendar_name: string;
  provider_name: string;
  profile_id: string;
  profile_name: string;
  calendar_readonly: boolean;
  calendar_deleted: boolean;
  calendar_primary: boolean;
}

/** Response from the list calendars endpoint */
export interface CronofyListCalendarsResponse {
  calendars: CronofyCalendar[];
}

/** Stored Cronofy tokens (decrypted form) */
export interface CronofyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
  accountId: string;
  provider: string;
  calendarId: string | null;
}

/** Event data for creating a calendar event */
export interface CronofyEventData {
  event_id: string;
  summary: string;
  description?: string;
  start: string; // ISO 8601
  end: string;   // ISO 8601
  tzid?: string;
  location?: {
    description: string;
  };
}
