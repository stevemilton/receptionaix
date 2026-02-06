import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null; // Layout handles redirect
  }

  // Fetch merchant data
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name')
    .eq('id', user.id)
    .single();

  // Fetch subscription info for usage widget
  const { data: merchantSub } = await supabase
    .from('merchants')
    .select('plan_status, plan_tier, billing_period_start')
    .eq('id', user.id)
    .single();

  // Fetch metrics
  const [callsResult, appointmentsResult, messagesResult] = await Promise.all([
    supabase
      .from('calls')
      .select('id, duration_seconds', { count: 'exact' })
      .eq('merchant_id', user.id),
    supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('merchant_id', user.id)
      .eq('status', 'confirmed'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('merchant_id', user.id)
      .eq('read', false),
  ]);

  const totalCalls = callsResult.count || 0;
  const totalAppointments = appointmentsResult.count || 0;
  const unreadMessages = messagesResult.count || 0;

  // Calculate average call duration
  const callDurations = callsResult.data?.map((c: { duration_seconds: number | null }) => c.duration_seconds || 0) || [];
  const avgDuration = callDurations.length > 0
    ? Math.round(callDurations.reduce((a: number, b: number) => a + b, 0) / callDurations.length)
    : 0;
  const avgMinutes = Math.floor(avgDuration / 60);
  const avgSeconds = avgDuration % 60;

  // Get billing period call count for usage widget
  let billingCalls = 0;
  let billingCallLimit = 0;
  if (merchantSub?.billing_period_start) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: billingUsage } = await (supabase as any)
      .rpc('get_merchant_call_count', {
        p_merchant_id: user.id,
        p_period_start: merchantSub.billing_period_start,
      })
      .single();
    if (billingUsage) {
      billingCalls = billingUsage.call_count || 0;
    }
  }
  // Determine limit based on tier
  if (merchantSub?.plan_tier === 'starter') billingCallLimit = 80;
  else if (merchantSub?.plan_tier === 'professional') billingCallLimit = 400;
  else if (merchantSub?.plan_tier === 'enterprise') billingCallLimit = -1;
  else billingCallLimit = 400; // trial default

  // Fetch recent calls
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('id, caller_phone, started_at, duration_seconds, outcome')
    .eq('merchant_id', user.id)
    .order('started_at', { ascending: false })
    .limit(5);

  // Fetch upcoming appointments
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select('id, service_name, start_time, customers(name, phone)')
    .eq('merchant_id', user.id)
    .eq('status', 'confirmed')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {merchant?.business_name}</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="Total Calls" value={totalCalls} />
        <MetricCard title="Appointments" value={totalAppointments} />
        <MetricCard title="Unread Messages" value={unreadMessages} highlight={unreadMessages > 0} />
        <MetricCard title="Avg Call Duration" value={`${avgMinutes}:${avgSeconds.toString().padStart(2, '0')}`} />
      </div>

      {/* Usage Widget */}
      <Link href="/dashboard/usage" className="block mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6 hover:border-primary-300 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900">Calls This Billing Period</h2>
            <span className="text-sm text-primary-600">View details &rarr;</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl font-bold text-gray-900">{billingCalls}</span>
            {billingCallLimit === -1 ? (
              <span className="text-sm text-green-600 font-medium">Unlimited</span>
            ) : (
              <span className="text-sm text-gray-500">/ {billingCallLimit} calls</span>
            )}
          </div>
          {billingCallLimit > 0 && (
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  billingCalls / billingCallLimit >= 1
                    ? 'bg-red-500'
                    : billingCalls / billingCallLimit >= 0.8
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((billingCalls / billingCallLimit) * 100, 100)}%` }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Calls */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recent Calls</h2>
            <Link href="/dashboard/calls" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {recentCalls && recentCalls.length > 0 ? (
            <div className="space-y-3">
              {recentCalls.map((call: CallRecord) => (
                <div key={call.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{formatPhone(call.caller_phone)}</p>
                    <p className="text-sm text-gray-500">{formatDate(call.started_at || '')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{formatDuration(call.duration_seconds)}</p>
                    <StatusBadge status={call.outcome || 'unknown'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No calls yet</p>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Link href="/dashboard/appointments" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {upcomingAppointments.map((apt: any) => (
                <div key={apt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{apt.service_name}</p>
                    <p className="text-sm text-gray-500">
                      {apt.customers?.name || apt.customers?.phone || 'Unknown'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatTime(apt.start_time)}</p>
                    <p className="text-sm text-gray-500">{formatDate(apt.start_time)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No upcoming appointments</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface CallRecord {
  id: string;
  caller_phone: string;
  started_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
}

interface AppointmentRecord {
  id: string;
  service_name: string;
  start_time: string;
  customers: { name: string | null; phone: string } | null;
}

function MetricCard({ title, value, highlight }: { title: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${highlight ? 'border-primary-500' : ''}`}>
      <div className="text-sm text-gray-500 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${highlight ? 'text-primary-600' : ''}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    missed: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  // Format UK numbers
  if (phone.startsWith('+44')) {
    return phone.replace('+44', '0').replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
