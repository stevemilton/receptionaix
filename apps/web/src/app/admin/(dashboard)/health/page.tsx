import { createClient } from '@/lib/supabase/server';

interface CallError {
  id: string;
  error_type: string;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  merchant_id: string | null;
}

export default async function SystemHealthPage() {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Get recent call errors
  const { data: recentErrors } = await supabaseAny
    .from('call_errors')
    .select('*, merchants(business_name)')
    .order('created_at', { ascending: false })
    .limit(20);

  // Get error stats (last 24 hours)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const { count: errorsLast24h } = await supabaseAny
    .from('call_errors')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', yesterday.toISOString());

  // Get call stats (last 24 hours)
  const { count: callsLast24h } = await supabaseAny
    .from('calls')
    .select('*', { count: 'exact', head: true })
    .gte('started_at', yesterday.toISOString());

  // Calculate error rate
  const errorRate = callsLast24h && callsLast24h > 0
    ? ((errorsLast24h || 0) / callsLast24h * 100).toFixed(1)
    : '0.0';

  // Group errors by type
  const errorsByType = (recentErrors || []).reduce((acc: Record<string, number>, err: CallError) => {
    acc[err.error_type] = (acc[err.error_type] || 0) + 1;
    return acc;
  }, {});

  // Service status (mock for now - would integrate with actual health checks)
  const services = [
    { name: 'Web App (Vercel)', status: 'operational', url: 'https://receptionai.vercel.app' },
    { name: 'Relay Server (Fly.io)', status: 'operational', url: 'https://receptionai-relay.fly.dev' },
    { name: 'Database (Supabase)', status: 'operational', url: process.env.NEXT_PUBLIC_SUPABASE_URL },
    { name: 'Voice API (Grok)', status: 'operational', url: 'wss://api.x.ai' },
    { name: 'Telephony (Twilio)', status: 'operational', url: 'https://api.twilio.com' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">System Health</h1>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Calls (24h)"
          value={callsLast24h || 0}
          status="good"
        />
        <StatCard
          label="Errors (24h)"
          value={errorsLast24h || 0}
          status={errorsLast24h && errorsLast24h > 10 ? 'warning' : 'good'}
        />
        <StatCard
          label="Error Rate"
          value={`${errorRate}%`}
          status={parseFloat(errorRate) > 5 ? 'critical' : parseFloat(errorRate) > 2 ? 'warning' : 'good'}
        />
        <StatCard
          label="Services"
          value={`${services.filter(s => s.status === 'operational').length}/${services.length}`}
          status="good"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Status */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-6">Service Status</h2>
          <div className="space-y-4">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <StatusIndicator status={service.status as 'operational' | 'degraded' | 'down'} />
                  <span className="font-medium">{service.name}</span>
                </div>
                <span className="text-sm text-gray-500 capitalize">{service.status}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            Last checked: {new Date().toLocaleTimeString('en-GB')}
          </p>
        </div>

        {/* Errors by Type */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-6">Error Distribution</h2>
          {Object.keys(errorsByType).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{type}</span>
                  <span className="font-bold">{count as number}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No errors in the last 24 hours</p>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Errors</h2>
        </div>
        {recentErrors && recentErrors.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Merchant
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentErrors.map((error: CallError & { merchants?: { business_name: string } }) => (
                <tr key={error.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(error.created_at).toLocaleString('en-GB')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-mono bg-red-100 text-red-800 rounded">
                      {error.error_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {error.error_code || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {error.error_message || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {error.merchants?.business_name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-12 text-center text-gray-500">
            No errors recorded
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string | number;
  status: 'good' | 'warning' | 'critical';
}) {
  const colors = {
    good: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-xl border p-6 ${colors[status]}`}>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function StatusIndicator({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  const colors = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
  };

  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${colors[status]}`} />
    </span>
  );
}
