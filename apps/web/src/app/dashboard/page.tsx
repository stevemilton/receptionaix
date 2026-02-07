import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  formatPhone,
  formatDuration,
  timeAgo,
  OutcomeBadge,
  UrgencyBadge,
  MetricCard,
  PhoneIcon,
  CalendarIcon,
  MessageIcon,
  ClockIcon,
  ChevronRightIcon,
} from './_components/shared';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch all dashboard data in parallel
  const [
    merchantResult,
    callsResult,
    appointmentsResult,
    messagesResult,
    recentCallsResult,
    upcomingApptsResult,
    unreadMessagesResult,
  ] = await Promise.all([
    supabase.from('merchants').select('business_name, plan_tier, plan_status').eq('id', user.id).single(),
    supabase.from('calls').select('id, duration_seconds', { count: 'exact' }).eq('merchant_id', user.id),
    supabase.from('appointments').select('id', { count: 'exact' }).eq('merchant_id', user.id).eq('status', 'confirmed'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('messages').select('id', { count: 'exact' }).eq('merchant_id', user.id).eq('read', false),
    supabase
      .from('calls')
      .select('id, caller_phone, started_at, duration_seconds, outcome, summary, customer_id, customers(name)')
      .eq('merchant_id', user.id)
      .order('started_at', { ascending: false })
      .limit(8),
    supabase
      .from('appointments')
      .select('id, service_name, start_time, end_time, status, customers(name, phone)')
      .eq('merchant_id', user.id)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('messages')
      .select('id, caller_name, caller_phone, content, urgency, created_at, read')
      .eq('merchant_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const merchant = merchantResult.data;
  const totalCalls = callsResult.count || 0;
  const totalAppointments = appointmentsResult.count || 0;
  const unreadCount = messagesResult.count || 0;

  // Average call duration
  const durations = callsResult.data?.map((c: { duration_seconds: number | null }) => c.duration_seconds || 0) || [];
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
    : 0;

  const recentCalls = (recentCallsResult.data || []) as CallWithCustomer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upcomingAppts = (upcomingApptsResult.data || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unreadMessages = (unreadMessagesResult.data || []) as any[];

  // Subscription status
  const planStatus = (merchant?.plan_status as string) || 'trial';
  const planTier = (merchant?.plan_tier as string) || null;
  const showSubscriptionBanner = !planTier || planStatus === 'trial' || planStatus === 'expired' || planStatus === 'cancelled';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      {/* Subscription Banner */}
      {showSubscriptionBanner && (
        <div className={`mb-4 sm:mb-6 rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 ${
          planStatus === 'expired' || planStatus === 'cancelled'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            planStatus === 'expired' || planStatus === 'cancelled'
              ? 'bg-red-100'
              : 'bg-amber-100'
          }`}>
            <svg className={`w-5 h-5 ${
              planStatus === 'expired' || planStatus === 'cancelled' ? 'text-red-600' : 'text-amber-600'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold ${
              planStatus === 'expired' || planStatus === 'cancelled' ? 'text-red-900' : 'text-amber-900'
            }`}>
              {planStatus === 'expired' || planStatus === 'cancelled'
                ? 'Your subscription has ended'
                : 'You\u2019re on a free trial'}
            </h3>
            <p className={`text-sm mt-0.5 ${
              planStatus === 'expired' || planStatus === 'cancelled' ? 'text-red-700' : 'text-amber-700'
            }`}>
              {planStatus === 'expired' || planStatus === 'cancelled'
                ? 'Subscribe to a plan to keep your AI receptionist active.'
                : 'Choose a plan to ensure uninterrupted service when your trial ends.'}
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${
              planStatus === 'expired' || planStatus === 'cancelled'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            Choose a Plan
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Welcome back{merchant?.business_name ? `, ${merchant.business_name}` : ''}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here&apos;s what&apos;s happening with your AI receptionist</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <MetricCard label="Total Calls" value={totalCalls} sublabel="all time" />
        <MetricCard label="Appointments" value={totalAppointments} sublabel="confirmed" />
        <MetricCard label="Unread Messages" value={unreadCount} accent={unreadCount > 0} />
        <MetricCard label="Avg Duration" value={formatDuration(avgDuration)} sublabel="per call" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent Calls — spans 2 columns on desktop */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Calls</h2>
            <Link href="/dashboard/calls" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View all <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>
          {recentCalls.length > 0 ? (
            <div className="divide-y divide-gray-50">
              {recentCalls.map((call) => (
                <Link key={call.id} href={`/dashboard/calls/${call.id}`} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                    <PhoneIcon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {call.customers?.name || formatPhone(call.caller_phone)}
                      </span>
                      <OutcomeBadge outcome={call.outcome || 'message'} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {call.summary || `${formatDuration(call.duration_seconds)} call`}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {timeAgo(call.started_at || '')}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <PhoneIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No calls yet. When customers ring your AI receptionist, calls will appear here.</p>
            </div>
          )}
        </div>

        {/* Right Column: Upcoming Appointments + Messages */}
        <div className="space-y-4 sm:space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Upcoming</h2>
              <Link href="/dashboard/appointments" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ChevronRightIcon className="w-3 h-3" />
              </Link>
            </div>
            {upcomingAppts.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {upcomingAppts.map((apt) => (
                  <div key={apt.id} className="px-4 sm:px-5 py-3 sm:py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                        <CalendarIcon className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{apt.service_name}</div>
                        <div className="text-xs text-gray-500">
                          {apt.customers?.name || formatPhone(apt.customers?.phone || '')}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <ClockIcon className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">
                            {new Date(apt.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at{' '}
                            {new Date(apt.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center">
                <CalendarIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No upcoming appointments</p>
              </div>
            )}
          </div>

          {/* Unread Messages */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">Messages</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary-600 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <Link href="/dashboard/messages" className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                View all <ChevronRightIcon className="w-3 h-3" />
              </Link>
            </div>
            {unreadMessages.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {unreadMessages.map((msg: MessageRecord) => (
                  <div key={msg.id} className="px-4 sm:px-5 py-3 sm:py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 hidden sm:flex">
                        <MessageIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {msg.caller_name || formatPhone(msg.caller_phone)}
                          </span>
                          <UrgencyBadge urgency={msg.urgency || 'medium'} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{msg.content}</p>
                        <span className="text-xs text-gray-400 mt-1 block">{timeAgo(msg.created_at || '')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center">
                <MessageIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No unread messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallWithCustomer {
  id: string;
  caller_phone: string;
  started_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
  summary: string | null;
  customer_id: string | null;
  customers: { name: string | null } | null;
}

interface MessageRecord {
  id: string;
  caller_name: string | null;
  caller_phone: string;
  content: string;
  urgency: string | null;
  created_at: string | null;
  read: boolean;
}
