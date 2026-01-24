import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@receptionalx/types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  if (
    !user &&
    (request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/onboarding'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/auth/login') ||
      request.nextUrl.pathname.startsWith('/auth/signup'))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Check trial/subscription status for dashboard routes (except billing)
  if (
    user &&
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.nextUrl.pathname.startsWith('/dashboard/billing')
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: merchant } = await (supabase as any)
      .from('merchants')
      .select('subscription_status, subscription_ends_at')
      .eq('id', user.id)
      .single();

    if (merchant) {
      const isExpired =
        merchant.subscription_status === 'cancelled' ||
        merchant.subscription_status === 'expired' ||
        (merchant.subscription_status === 'trial' &&
          merchant.subscription_ends_at &&
          new Date(merchant.subscription_ends_at) < new Date());

      if (isExpired) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard/billing';
        url.searchParams.set('expired', 'true');
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
