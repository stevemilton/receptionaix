import { createClient } from '@/lib/supabase/server';

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Get aggregate stats
  const [
    { count: totalMerchants },
    { count: activeMerchants },
    { count: totalCalls },
    { count: totalAppointments },
  ] = await Promise.all([
    supabaseAny.from('merchants').select('*', { count: 'exact', head: true }),
    supabaseAny.from('merchants').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabaseAny.from('calls').select('*', { count: 'exact', head: true }),
    supabaseAny.from('appointments').select('*', { count: 'exact', head: true }),
  ]);

  // Get recent signups (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentMerchants } = await supabaseAny
    .from('merchants')
    .select('id, business_name, email, subscription_status, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // Get calls from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: callsToday } = await supabaseAny
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', today.toISOString());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Admin Overview</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Merchants"
          value={totalMerchants || 0}
          subtext={`${activeMerchants || 0} active subscriptions`}
        />
        <StatCard
          label="Total Calls"
          value={totalCalls || 0}
          subtext={`${callsToday || 0} today`}
        />
        <StatCard
          label="Total Appointments"
          value={totalAppointments || 0}
          subtext="All time"
        />
        <StatCard
          label="New Signups (7d)"
          value={recentMerchants?.length || 0}
          subtext="Last 7 days"
        />
      </div>

      {/* Recent Signups */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Signups</h2>
        </div>
        <div className="divide-y">
          {recentMerchants && recentMerchants.length > 0 ? (
            recentMerchants.map((merchant: {
              id: string;
              business_name: string;
              email: string;
              subscription_status: string;
              created_at: string;
            }) => (
              <div key={merchant.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{merchant.business_name}</p>
                  <p className="text-sm text-gray-500">{merchant.email}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    merchant.subscription_status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : merchant.subscription_status === 'trial'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {merchant.subscription_status}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(merchant.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent signups
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: number;
  subtext: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString()}</p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}
