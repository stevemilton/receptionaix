import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  formatPhone,
  formatDuration,
  formatDateTime,
  OutcomeBadge,
  PageHeader,
  EmptyState,
  PhoneIcon,
} from '../_components/shared';

export default async function CallsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: calls } = await supabase
    .from('calls')
    .select('id, caller_phone, started_at, duration_seconds, outcome, summary, customers(name)')
    .eq('merchant_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl">
      <PageHeader title="Calls" subtitle="All incoming calls handled by your AI receptionist" />

      {calls && calls.length > 0 ? (
        <>
          {/* Mobile: Card layout */}
          <div className="sm:hidden space-y-3">
            {calls.map((call) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const c = call as any;
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/calls/${c.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {c.customers?.name || formatPhone(c.caller_phone)}
                    </span>
                    <OutcomeBadge outcome={c.outcome || 'message'} />
                  </div>
                  {c.summary && (
                    <p className="text-xs text-gray-500 truncate mb-2">{c.summary}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>{formatDateTime(c.started_at || '')}</span>
                    <span>&middot;</span>
                    <span>{formatDuration(c.duration_seconds)}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caller</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outcome</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Summary</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {calls.map((call) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const c = call as any;
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <PhoneIcon className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {c.customers?.name || formatPhone(c.caller_phone)}
                              </div>
                              {c.customers?.name && (
                                <div className="text-xs text-gray-400">{formatPhone(c.caller_phone)}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-gray-900">{formatDateTime(c.started_at || '')}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600">{formatDuration(c.duration_seconds)}</span>
                        </td>
                        <td className="px-5 py-4">
                          <OutcomeBadge outcome={c.outcome || 'message'} />
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <p className="text-sm text-gray-500 max-w-xs truncate">{c.summary || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/dashboard/calls/${c.id}`}
                            className="text-sm font-medium text-primary-600 hover:text-primary-700"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          icon={PhoneIcon}
          title="No calls yet"
          description="When customers call your AI receptionist, their calls will appear here with full transcripts and summaries."
        />
      )}
    </div>
  );
}
