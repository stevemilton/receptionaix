import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateCsrfOrigin, csrfForbiddenResponse } from '@/lib/csrf';

/**
 * PUT /api/cronofy/calendar
 * Updates the selected calendar for the authenticated merchant.
 */
export async function PUT(request: NextRequest) {
  if (!validateCsrfOrigin(request)) {
    return csrfForbiddenResponse();
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { calendarId } = await request.json();

    if (!calendarId || typeof calendarId !== 'string') {
      return NextResponse.json({ error: 'Calendar ID is required' }, { status: 400 });
    }

    await supabase
      .from('merchants')
      .update({
        cronofy_calendar_id: calendarId,
      } as Record<string, unknown>)
      .eq('id', user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cronofy calendar update error:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    );
  }
}
