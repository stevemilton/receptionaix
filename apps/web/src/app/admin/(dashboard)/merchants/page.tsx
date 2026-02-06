import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

interface Merchant {
  id: string;
  email: string;
  business_name: string;
  business_type: string | null;
  phone: string | null;
  twilio_phone_number: string | null;
  plan_status: string | null;
  trial_ends_at: string | null;
  created_at: string | null;
}

export default async function MerchantsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string };
}) {
  const supabase = await createClient();

  // Build query
  let query = supabase
    .from('merchants')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply status filter
  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('plan_status', searchParams.status);
  }

  // Apply search filter (sanitize to prevent PostgREST filter injection)
  if (searchParams.search) {
    const sanitized = searchParams.search.replace(/[%_\\(),."']/g, '');
    if (sanitized.length > 0 && sanitized.length <= 100) {
      query = query.or(`business_name.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
    }
  }

  const { data: merchants } = await query;

  // Get stats for filters
  const [
    { count: totalCount },
    { count: trialCount },
    { count: activeCount },
    { count: cancelledCount },
  ] = await Promise.all([
    supabase.from('merchants').select('*', { count: 'exact', head: true }),
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('plan_status', 'trial'),
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('plan_status', 'active'),
    supabase.from('merchants').select('*', { count: 'exact', head: true }).eq('plan_status', 'cancelled'),
  ]);

  const currentStatus = searchParams.status || 'all';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Merchants</h1>
        <div className="text-sm text-gray-500">
          {merchants?.length || 0} of {totalCount || 0} merchants
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Status Filters */}
        <div className="flex gap-2">
          <FilterButton href="/admin/merchants" active={currentStatus === 'all'}>
            All ({totalCount || 0})
          </FilterButton>
          <FilterButton href="/admin/merchants?status=trial" active={currentStatus === 'trial'}>
            Trial ({trialCount || 0})
          </FilterButton>
          <FilterButton href="/admin/merchants?status=active" active={currentStatus === 'active'}>
            Active ({activeCount || 0})
          </FilterButton>
          <FilterButton href="/admin/merchants?status=cancelled" active={currentStatus === 'cancelled'}>
            Cancelled ({cancelledCount || 0})
          </FilterButton>
        </div>

        {/* Search */}
        <form className="flex-1 max-w-sm">
          <input
            type="text"
            name="search"
            defaultValue={searchParams.search}
            placeholder="Search by name or email..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </form>
      </div>

      {/* Merchants Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Business
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Phone Number
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {merchants && merchants.length > 0 ? (
              merchants.map((merchant: Merchant) => (
                <tr key={merchant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-gray-900">{merchant.business_name}</p>
                      <p className="text-sm text-gray-500">{merchant.business_type || 'Not specified'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{merchant.email}</p>
                    <p className="text-sm text-gray-500">{merchant.phone || 'No phone'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">
                      {merchant.twilio_phone_number || 'Not assigned'}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={merchant.plan_status || 'unknown'} />
                    {merchant.trial_ends_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Ends: {new Date(merchant.trial_ends_at).toLocaleDateString('en-GB')}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {merchant.created_at
                      ? new Date(merchant.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/merchants/${merchant.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No merchants found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-gray-900 text-white'
          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
      }`}
    >
      {children}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.expired}`}>
      {status}
    </span>
  );
}
