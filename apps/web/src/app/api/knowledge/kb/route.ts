import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser } from '@/lib/supabase/api-auth';

/**
 * GET /api/knowledge/kb — Fetch the merchant's knowledge base
 * Uses admin client to bypass RLS (auth verified via session).
 */
export async function GET(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('knowledge_bases')
    .select('*')
    .eq('merchant_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows (new merchant with no KB yet)
    console.error('[KB API] Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge base' }, { status: 500 });
  }

  return NextResponse.json({ data: data || null });
}

/**
 * PUT /api/knowledge/kb — Save the merchant's knowledge base
 * Uses admin client to bypass RLS (auth verified via session).
 */
export async function PUT(request: Request) {
  const { user } = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { services, faqs, opening_hours } = body;

  // Basic validation
  if (!Array.isArray(services) || !Array.isArray(faqs) || typeof opening_hours !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Cap sizes to prevent abuse
  if (services.length > 50 || faqs.length > 50) {
    return NextResponse.json({ error: 'Too many items (max 50 each)' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Check if KB exists
  const { data: existing } = await supabase
    .from('knowledge_bases')
    .select('id')
    .eq('merchant_id', user.id)
    .single();

  if (existing) {
    // Update
    const { error } = await supabase
      .from('knowledge_bases')
      .update({
        services,
        faqs,
        opening_hours,
        updated_at: new Date().toISOString(),
      })
      .eq('merchant_id', user.id);

    if (error) {
      console.error('[KB API] Update error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
  } else {
    // Insert
    const { error } = await supabase
      .from('knowledge_bases')
      .insert({
        merchant_id: user.id,
        services,
        faqs,
        opening_hours,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[KB API] Insert error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
