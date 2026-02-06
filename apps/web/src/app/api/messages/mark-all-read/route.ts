import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

/**
 * PUT /api/messages/mark-all-read — Mark all messages as read for the merchant
 */
export async function PUT(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('merchant_id', user.id)
    .eq('read', false);

  if (error) {
    console.error('[Messages API] Mark all read error:', error);
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
