import { createClient } from '@/lib/supabase/server';

interface SubscriptionStats {
  status: string;
  count: number;
}

export default async function RevenueDashboardPage() {
  const supabase = await createClient();

  // Get subscription breakdown
  const { data: merchants } = await supabase
    .from('merchants')
    .select('plan_status, created_at');

  // Calculate subscription stats
  const subscriptionStats: Record<string, number> = (merchants || []).reduce((acc: Record<string, number>, m: { plan_status: string | null }) => {
    const status = m.plan_status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly signups (last 6 months)
  const monthlySignups: { month: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const count = (merchants || []).filter((m: { created_at: string | null }) => {
      if (!m.created_at) return false;
      const created = new Date(m.created_at);
      return created >= monthStart && created <= monthEnd;
    }).length;

    monthlySignups.push({
      month: monthStart.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
      count,
    });
  }

  // Estimated MRR calculation
  const PRICE_PER_ACTIVE = 49; // £49/month per active subscription
  const activeCount = subscriptionStats['active'] || 0;
  const estimatedMRR = activeCount * PRICE_PER_ACTIVE;

  // Trial conversion estimate
  const trialCount = subscriptionStats['trial'] || 0;
  const conversionRate = activeCount > 0 && trialCount > 0
    ? Math.round((activeCount / (activeCount + trialCount)) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Revenue Dashboard</h1>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          label="Estimated MRR"
          value={`£${estimatedMRR.toLocaleString()}`}
          subtext={`${activeCount} active subscriptions @ £${PRICE_PER_ACTIVE}/mo`}
          color="green"
        />
        <MetricCard
          label="Active Subscriptions"
          value={activeCount}
          subtext="Paying customers"
          color="blue"
        />
        <MetricCard
          label="Trial Users"
          value={trialCount}
          subtext="Potential conversions"
          color="yellow"
        />
        <MetricCard
          label="Trial Conversion"
          value={`${conversionRate}%`}
          subtext="Trial to paid rate"
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscription Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-6">Subscription Status</h2>
          <div className="space-y-4">
            {Object.entries(subscriptionStats).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                  <span className="capitalize">{status}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold">{count}</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStatusColor(status)}`}
                      style={{ width: `${(count / (merchants?.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Signups */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-6">Monthly Signups</h2>
          <div className="flex items-end justify-between h-48 gap-2">
            {monthlySignups.map((item) => {
              const maxCount = Math.max(...monthlySignups.map(m => m.count), 1);
              const height = (item.count / maxCount) * 100;
              return (
                <div key={item.month} className="flex-1 flex flex-col items-center">
                  <span className="text-sm font-medium mb-2">{item.count}</span>
                  <div
                    className="w-full bg-primary-500 rounded-t-lg transition-all"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-6">Revenue Projections</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Current MRR</p>
            <p className="text-2xl font-bold text-gray-900">£{estimatedMRR.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">If 50% Trials Convert</p>
            <p className="text-2xl font-bold text-green-600">
              £{((activeCount + Math.floor(trialCount * 0.5)) * PRICE_PER_ACTIVE).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Annual Run Rate</p>
            <p className="text-2xl font-bold text-gray-900">£{(estimatedMRR * 12).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Note */}
      <p className="text-sm text-gray-500 mt-6">
        Note: Revenue calculations are estimates based on subscription status.
        For accurate revenue data, integrate with Stripe Dashboard.
      </p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color,
}: {
  label: string;
  value: string | number;
  subtext: string;
  color: 'green' | 'blue' | 'yellow' | 'purple';
}) {
  const colors = {
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    trial: 'bg-blue-500',
    cancelled: 'bg-red-500',
    expired: 'bg-gray-400',
  };
  return colors[status] || colors.expired;
}
