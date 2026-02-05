import { createClient } from './server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { User } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = any;

/**
 * Get authenticated user from either cookie session (web) or Bearer token (mobile).
 * Returns an untyped Supabase client because the hand-written Database type
 * doesn't satisfy the PostgREST generic constraints in supabase-js v2.91.
 * Callers must cast or use `any` until database.ts is regenerated via `supabase gen types`.
 */
export async function getAuthenticatedUser(request: Request): Promise<{ user: User | null; supabase: AnySupabaseClient }> {
  // Try cookie-based auth first (web)
  const cookieSupabase = await createClient();
  const { data: { user: cookieUser } } = await cookieSupabase.auth.getUser();

  if (cookieUser) {
    return { user: cookieUser, supabase: cookieSupabase };
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
    return { user: tokenUser, supabase: tokenSupabase };
  }

  return { user: null, supabase: cookieSupabase };
}
