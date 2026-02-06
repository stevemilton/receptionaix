import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@receptionalx/types';

export function createClient() {
  // Provide placeholder values during build/SSG; real values are available at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
