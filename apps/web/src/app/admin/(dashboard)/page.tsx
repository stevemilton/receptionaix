import { createClient } from '@/lib/supabase/server';

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Get aggregate stats
  const [
    { count: totalMerchants },
    { count: activeMerchants },
    { count: trialMerchants },
    { count: totalCalls },
    { count: totalAppointments },
    { count: callsToday },
    { count: callsThisWeek },
    { count: appointmentsThisMonth },
  ] = await Promise.all([
    supabaseAny.from('merchants').select('*', { count: 'exact', head: true }),
    supabaseAny.from('merchants').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabaseAny.from('merchants').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
    supabaseAny.from('calls').select('*', { count: 'exact', head: true }),
    supabaseAny.from('appointments').select('*', { count: 'exact', head: true }),
    supabaseAny.from('calls').select('*', { count: 'exact', head: true }).gte('started_at', today.toISOString()),
    supabaseAny.from('calls').select('*', { count: 'exact', head: true }).gte('started_at', sevenDaysAgo.toISOString()),
    supabaseAny.from('appointments').select('*', { count: 'exact', head: true }).gte('start_time', startOfMonth.toISOString()),
  ]);

  // Get business type breakdown
  const { data: merchantsByType } = await supabaseAny
    .from('merchants')
    .select('business_type');

  const businessTypeBreakdown = (merchantsByType || []).reduce((acc: Record<string, number>, m: { business_type: string }) => {
    const type = m.business_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Get call performance metrics (last 30 days)
  const { data: recentCalls } = await supabaseAny
    .from('calls')
    .select('duration_seconds, started_at')
    .gte('started_at', thirtyDaysAgo.toISOString());

  const avgCallDuration = recentCalls && recentCalls.length > 0
    ? Math.round(recentCalls.reduce((sum: number, c: { duration_seconds: number }) => sum + (c.duration_seconds || 0), 0) / recentCalls.length)
    : 0;

  // Get appointments created from calls (conversion rate proxy)
  const { count: appointmentsFromCalls } = await supabaseAny
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());

  const conversionRate = recentCalls && recentCalls.length > 0
    ? ((appointmentsFromCalls || 0) / recentCalls.length * 100).toFixed(1)
    : '0.0';

  // Get peak hours (from call data)
  const peakHours = (recentCalls || []).reduce((acc: Record<number, number>, c: { started_at: string }) => {
    const hour = new Date(c.started_at).getHours();
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {});

  const topPeakHour = Object.entries(peakHours).sort((a, b) => b[1] - a[1])[0];

  // Get recent signups
  const { data: recentMerchants } = await supabaseAny
    .from('merchants')
    .select('id, business_name, email, business_type, subscription_status, created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate MRR (assuming £49/month for active, £0 for trial)
  const PRICE_PER_MONTH = 49;
  const mrr = (activeMerchants || 0) * PRICE_PER_MONTH;

  // Get churn (merchants who cancelled in last 30 days)
  const { count: churnedMerchants } = await supabaseAny
    .from('merchants')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'cancelled')
    .gte('updated_at', thirtyDaysAgo.toISOString());

  const churnRate = activeMerchants && activeMerchants > 0
    ? ((churnedMerchants || 0) / activeMerchants * 100).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">ReceptionAI Admin Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Merchants"
          value={totalMerchants || 0}
          subtext={`${activeMerchants || 0} active · ${trialMerchants || 0} trial`}
          trend={recentMerchants?.length ? `+${recentMerchants.length} this week` : undefined}
          trendUp={true}
        />
        <StatCard
          label="Monthly Recurring Revenue"
          value={`£${mrr.toLocaleString()}`}
          subtext={`${activeMerchants || 0} paying merchants`}
          trend={`${churnRate}% churn rate`}
          trendUp={Number(churnRate) < 5}
        />
        <StatCard
          label="Total Calls"
          value={totalCalls || 0}
          subtext={`${callsToday || 0} today · ${callsThisWeek || 0} this week`}
          trend={avgCallDuration ? `${Math.floor(avgCallDuration / 60)}m ${avgCallDuration % 60}s avg` : undefined}
        />
        <StatCard
          label="Appointments Booked"
          value={totalAppointments || 0}
          subtext={`${appointmentsThisMonth || 0} this month`}
          trend={`${conversionRate}% conversion`}
          trendUp={Number(conversionRate) > 10}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Business Type Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Merchants by Business Type</h2>
          <div className="space-y-3">
            {Object.entries(businessTypeBreakdown)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([type, count]) => {
                const percentage = totalMerchants ? Math.round((count as number) / totalMerchants * 100) : 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 capitalize">{type.replace(/_/g, ' ')}</span>
                      <span className="text-gray-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#0891B2] h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(businessTypeBreakdown).length === 0 && (
              <p className="text-gray-500 text-center py-4">No merchants yet</p>
            )}
          </div>
        </div>

        {/* Call Performance */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Call Performance (30 days)</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgCallDuration ? `${Math.floor(avgCallDuration / 60)}:${(avgCallDuration % 60).toString().padStart(2, '0')}` : '0:00'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{conversionRate}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900">
                {topPeakHour ? `${topPeakHour[0]}:00` : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">Calls This Week</p>
              <p className="text-2xl font-bold text-gray-900">{callsThisWeek || 0}</p>
            </div>
          </div>

          {/* Peak Hours Chart */}
          <h3 className="text-sm font-medium text-gray-700 mb-2">Call Volume by Hour</h3>
          <div className="flex items-end space-x-1 h-20">
            {Array.from({ length: 24 }, (_, hour) => {
              const count = peakHours[hour] || 0;
              const maxCount = Math.max(...Object.values(peakHours), 1);
              const height = (count / maxCount) * 100;
              return (
                <div
                  key={hour}
                  className="flex-1 bg-[#0891B2] rounded-t opacity-70 hover:opacity-100 transition-opacity"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${hour}:00 - ${count} calls`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:00</span>
          </div>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Revenue Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">MRR</p>
            <p className="text-3xl font-bold text-gray-900">£{mrr.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ARR (Projected)</p>
            <p className="text-3xl font-bold text-gray-900">£{(mrr * 12).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Revenue/Merchant</p>
            <p className="text-3xl font-bold text-gray-900">£{PRICE_PER_MONTH}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Trial → Paid Rate</p>
            <p className="text-3xl font-bold text-gray-900">
              {trialMerchants && activeMerchants
                ? `${Math.round(activeMerchants / (activeMerchants + trialMerchants) * 100)}%`
                : '0%'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Signups */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Recent Signups</h2>
          <a href="/admin/merchants" className="text-sm text-[#0891B2] hover:underline">
            View all →
          </a>
        </div>
        <div className="divide-y">
          {recentMerchants && recentMerchants.length > 0 ? (
            recentMerchants.map((merchant: {
              id: string;
              business_name: string;
              email: string;
              business_type: string;
              subscription_status: string;
              created_at: string;
            }) => (
              <div key={merchant.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{merchant.business_name}</p>
                  <p className="text-sm text-gray-500">
                    {merchant.email} · <span className="capitalize">{merchant.business_type?.replace(/_/g, ' ') || 'Unknown type'}</span>
                  </p>
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
  trend,
  trendUp,
}: {
  label: string;
  value: number | string;
  subtext: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
      {trend && (
        <p className={`text-xs mt-2 ${trendUp ? 'text-green-600' : trendUp === false ? 'text-red-600' : 'text-gray-500'}`}>
          {trend}
        </p>
      )}
    </div>
  );
}
