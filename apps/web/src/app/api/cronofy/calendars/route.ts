import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listCalendars } from '@receptionalx/cronofy';
import { decryptToken, isEncrypted } from '@receptionalx/shared';

/**
 * GET /api/cronofy/calendars
 * Returns the list of calendars for the authenticated merchant.
 * Used in settings to let them pick which calendar to use.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch merchant's Cronofy tokens (columns from migration 012, not yet in generated types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: merchant } = await (supabase as any)
      .from('merchants')
      .select('cronofy_access_token, cronofy_calendar_id')
      .eq('id', user.id)
      .single();

    if (!merchant?.cronofy_access_token) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 400 });
    }

    // Decrypt access token
    const rawToken = merchant.cronofy_access_token as string;
    const accessToken = isEncrypted(rawToken)
      ? decryptToken<string>(rawToken)
      : rawToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to decrypt calendar token' }, { status: 500 });
    }

    const calendarsResponse = await listCalendars(accessToken);

    return NextResponse.json({
      calendars: calendarsResponse.calendars,
      selectedCalendarId: merchant.cronofy_calendar_id,
    });
  } catch (error) {
    console.error('Cronofy calendars error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    );
  }
}
