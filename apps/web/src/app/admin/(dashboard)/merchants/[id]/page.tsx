import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

interface Call {
  id: string;
  caller_phone: string;
  started_at: string | null;
  duration_seconds: number | null;
  outcome: string | null;
}

interface Appointment {
  id: string;
  service_name: string;
  start_time: string;
  status: string | null;
}

export default async function MerchantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  // Get merchant details
  const { data: merchant, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !merchant) {
    notFound();
  }

  // Get related data
  const [
    { data: knowledgeBase },
    { data: recentCalls },
    { data: recentAppointments },
    { count: totalCalls },
    { count: totalAppointments },
    { count: totalCustomers },
  ] = await Promise.all([
    supabase.from('knowledge_bases').select('*').eq('merchant_id', params.id).single(),
    supabase.from('calls').select('*').eq('merchant_id', params.id).order('started_at', { ascending: false }).limit(5),
    supabase.from('appointments').select('*').eq('merchant_id', params.id).order('start_time', { ascending: false }).limit(5),
    supabase.from('calls').select('*', { count: 'exact', head: true }).eq('merchant_id', params.id),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('merchant_id', params.id),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('merchant_id', params.id),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link href="/admin/merchants" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Merchants
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{merchant.business_name}</h1>
          <p className="text-gray-500">{merchant.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <ImpersonateButton merchantId={merchant.id} />
          <StatusBadge status={merchant.plan_status || 'unknown'} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Business Details */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Business Details</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Business Type</dt>
                <dd className="font-medium">{merchant.business_type || 'Not specified'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Phone</dt>
                <dd className="font-medium">{merchant.phone || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Website</dt>
                <dd className="font-medium">{merchant.website || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Twilio Number</dt>
                <dd className="font-medium">{merchant.twilio_phone_number || 'Not assigned'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Google Calendar</dt>
                <dd className="font-medium">
                  {merchant.google_calendar_token ? 'Connected' : 'Not connected'}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="font-medium">
                  {merchant.created_at
                    ? new Date(merchant.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Knowledge Base */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Knowledge Base</h2>
            {knowledgeBase ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(knowledgeBase.services)
                      ? (knowledgeBase.services as unknown as Array<{ name: string }>).map((service, i: number) => (
                          <span key={i} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {service.name}
                          </span>
                        ))
                      : <span className="text-gray-500">No services defined</span>}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">FAQs</h3>
                  <p className="text-sm text-gray-600">
                    {Array.isArray(knowledgeBase.faqs) ? knowledgeBase.faqs.length : 0} FAQs configured
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No knowledge base configured</p>
            )}
          </div>

          {/* Recent Calls */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Calls</h2>
              <span className="text-sm text-gray-500">{totalCalls || 0} total</span>
            </div>
            {recentCalls && recentCalls.length > 0 ? (
              <div className="space-y-3">
                {recentCalls.map((call: Call) => (
                  <div key={call.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{call.caller_phone}</p>
                      <p className="text-sm text-gray-500">
                        {call.started_at ? new Date(call.started_at).toLocaleString('en-GB') : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s` : '-'}
                      </p>
                      <p className="text-xs text-gray-500">{call.outcome || 'unknown'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No calls yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Statistics</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Calls</span>
                <span className="font-bold">{totalCalls || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Appointments</span>
                <span className="font-bold">{totalAppointments || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Customers</span>
                <span className="font-bold">{totalCustomers || 0}</span>
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Subscription</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={merchant.plan_status || 'unknown'} />
              </div>
              {merchant.trial_ends_at && (
                <div>
                  <p className="text-sm text-gray-500">Ends</p>
                  <p className="font-medium">
                    {new Date(merchant.trial_ends_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Appointments</h2>
              <span className="text-sm text-gray-500">{totalAppointments || 0} total</span>
            </div>
            {recentAppointments && recentAppointments.length > 0 ? (
              <div className="space-y-3">
                {recentAppointments.map((apt: Appointment) => (
                  <div key={apt.id} className="py-2 border-b last:border-0">
                    <p className="font-medium">{apt.service_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(apt.start_time).toLocaleString('en-GB')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No appointments</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpersonateButton({ merchantId }: { merchantId: string }) {
  return (
    <a
      href={`/dashboard?impersonate=${merchantId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors"
    >
      Impersonate
    </a>
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
    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${styles[status] || styles.expired}`}>
      {status}
    </span>
  );
}
