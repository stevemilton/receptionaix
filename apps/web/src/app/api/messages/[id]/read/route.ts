import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

/**
 * PUT /api/messages/:id/read — Mark a message as read
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = createAdminClient();
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', id)
    .eq('merchant_id', user.id);

  if (error) {
    console.error('[Messages API] Mark read error:', error);
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
