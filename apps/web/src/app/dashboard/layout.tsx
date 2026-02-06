import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardShell } from './_components/dashboard-shell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Handle admin impersonation: validate the user is actually an admin
  const { headers } = await import('next/headers');
  const headersList = await headers();
  const requestUrl = headersList.get('x-url') || '';
  let impersonateId: string | null = null;
  try {
    impersonateId = requestUrl ? new URL(requestUrl).searchParams.get('impersonate') : null;
  } catch {
    // Invalid URL, ignore
  }

  let merchantId = user.id;
  let isImpersonating = false;

  if (impersonateId) {
    // Verify the current user is an admin before allowing impersonation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: adminUser } = await (supabase as any)
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminUser) {
      merchantId = impersonateId;
      isImpersonating = true;
    }
    // If not admin, ignore the impersonate param and show their own dashboard
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, onboarding_completed')
    .eq('id', merchantId)
    .single();

  if (!merchant?.onboarding_completed) {
    if (isImpersonating) {
      // Don't redirect admin to onboarding for a merchant that hasn't completed it
      redirect('/admin/merchants');
    }
    redirect('/onboarding');
  }

  return (
    <DashboardShell
      businessName={merchant.business_name}
      userEmail={user.email || ''}
      isImpersonating={isImpersonating}
      merchantId={merchantId}
    >
      {children}
    </DashboardShell>
  );
}
