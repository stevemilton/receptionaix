import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // DEV MODE: Skip auth only when explicitly opted in via env var
  const isDev = process.env.NODE_ENV === 'development'
    && process.env.ADMIN_DEV_BYPASS === 'true';
  let user = null;
  let adminUser = null;

  if (isDev) {
    // Mock admin user for local dev
    adminUser = { email: 'dev@localhost', role: 'admin' };
  } else {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    user = authUser;

    if (!user) {
      redirect('/admin/login');
    }

    // Check if user is admin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single();

    adminUser = data;

    if (!adminUser) {
      redirect('/admin/login');
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/admin" className="text-xl font-bold">
                ReceptionAI Admin
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <NavLink href="/admin">Overview</NavLink>
                <NavLink href="/admin/merchants">Merchants</NavLink>
                <NavLink href="/admin/revenue">Revenue</NavLink>
                <NavLink href="/admin/health">System Health</NavLink>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-300">{adminUser?.email || user?.email || 'Dev Mode'}</span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-gray-300 hover:text-white"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm text-gray-300 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
