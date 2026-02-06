import { createClient } from './server';
import { createClient as createSupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '@receptionalx/types';

type TypedSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getAuthenticatedUser(request: Request): Promise<{ user: User | null; supabase: TypedSupabaseClient }> {
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
    const tokenSupabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );
    const { data: { user: tokenUser } } = await tokenSupabase.auth.getUser(token);
    return { user: tokenUser, supabase: tokenSupabase as unknown as TypedSupabaseClient };
  }

  return { user: null, supabase: cookieSupabase };
}
