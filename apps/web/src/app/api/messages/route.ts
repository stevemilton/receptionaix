import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

/**
 * GET /api/messages — Fetch all messages for the authenticated merchant
 */
export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[Messages API] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return NextResponse.json({ data });
}
