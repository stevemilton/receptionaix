import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateCsrfOrigin, csrfForbiddenResponse } from '@/lib/csrf';

export async function POST(request: Request) {
  if (!validateCsrfOrigin(request)) {
    return csrfForbiddenResponse();
  }

  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/auth/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'), {
    status: 302,
  });
}
