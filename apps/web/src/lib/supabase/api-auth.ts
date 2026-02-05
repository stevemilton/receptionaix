import { createClient } from './server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

/**
 * Get authenticated user from either cookie session (web) or Bearer token (mobile)
 * Returns null if not authenticated
 */
export async function getAuthenticatedUser(request: Request): Promise<{ user: User | null; supabase: ReturnType<typeof createSupabaseClient> }> {
  // Try cookie-based auth first (web)
  const cookieSupabase = await createClient();
  const { data: { user: cookieUser } } = await cookieSupabase.auth.getUser();

  if (cookieUser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { user: cookieUser, supabase: cookieSupabase as any };
  }

  // Try Bearer token (mobile)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const tokenSupabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );
    const { data: { user: tokenUser } } = await tokenSupabase.auth.getUser(token);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { user: tokenUser, supabase: tokenSupabase as any };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { user: null, supabase: cookieSupabase as any };
}
