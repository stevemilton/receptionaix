import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  formatPhone,
  formatDateTime,
  formatDurationLong,
  OutcomeBadge,
  UrgencyBadge,
  ArrowLeftIcon,
  MessageIcon,
  CalendarIcon,
} from '../../_components/shared';

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch call with customer data
  const { data: call, error } = await supabase
    .from('calls')
    .select('*, customers(id, name, phone, email, notes, created_at)')
    .eq('id', id)
    .eq('merchant_id', user.id)
    .single();

  if (error || !call) notFound();

  // Fetch linked messages for this call
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messages } = await (supabase as any)
    .from('messages')
    .select('id, caller_name, caller_phone, content, urgency, created_at, read')
    .eq('call_id', id)
    .order('created_at', { ascending: true });

  // Fetch linked appointments for this call
  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, service_name, start_time, end_time, status')
    .eq('merchant_id', user.id)
    .eq('call_id', id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = call as any;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl">
      {/* Back link */}
      <Link href="/dashboard/calls" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 sm:mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to calls
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {c.customers?.name || formatPhone(c.caller_phone)}
          </h1>
          <OutcomeBadge outcome={c.outcome || 'message'} />
        </div>
        <p className="text-xs sm:text-sm text-gray-500">
          {formatPhone(c.caller_phone)} &middot; {formatDateTime(c.started_at || '')} &middot; {formatDurationLong(c.duration_seconds)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left: Sidebar with call info + linked data */}
        <div className="space-y-4 sm:space-y-6">
          {/* Summary */}
          {c.summary && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-2">Summary</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{c.summary}</p>
            </div>
          )}

          {/* Call Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Call Details</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Caller</dt>
                <dd className="font-medium text-gray-900 text-right">{formatPhone(c.caller_phone)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Date</dt>
                <dd className="font-medium text-gray-900 text-right">{formatDateTime(c.started_at || '')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium text-gray-900">{formatDurationLong(c.duration_seconds)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Outcome</dt>
                <dd><OutcomeBadge outcome={c.outcome || 'message'} /></dd>
              </div>
            </dl>
          </div>

          {/* Customer Card */}
          {c.customers && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Customer</h2>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-600">
                    {(c.customers.name || c.customers.phone || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{c.customers.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{formatPhone(c.customers.phone)}</div>
                </div>
              </div>
              {c.customers.email && (
                <div className="text-xs text-gray-500">{c.customers.email}</div>
              )}
              {c.customers.notes && (
                <p className="text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2">{c.customers.notes}</p>
              )}
            </div>
          )}

          {/* Linked Messages */}
          {messages && messages.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <MessageIcon className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">Messages Left</h2>
              </div>
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {messages.map((msg: any) => (
                  <div key={msg.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {msg.caller_name || formatPhone(msg.caller_phone)}
                      </span>
                      <UrgencyBadge urgency={msg.urgency || 'medium'} />
                    </div>
                    <p className="text-sm text-gray-600">{msg.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked Appointments */}
          {appointments && appointments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">Appointments Made</h2>
              </div>
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-900">{apt.service_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(apt.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {' at '}
                      {new Date(apt.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Transcript */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Transcript</h2>
            {c.transcript ? (
              <div className="space-y-3">
                {parseTranscript(c.transcript).map((entry, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${entry.speaker === 'assistant' ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                        entry.speaker === 'assistant'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.speaker === 'assistant' ? 'AI' : 'C'}
                    </div>
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2 sm:py-2.5 ${
                        entry.speaker === 'assistant'
                          ? 'bg-primary-50 text-gray-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">No transcript available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseTranscript(transcript: string): Array<{ speaker: 'user' | 'assistant'; text: string }> {
  const lines = transcript.split('\n').filter(line => line.trim());
  return lines.map(line => {
    if (line.startsWith('user:') || line.startsWith('User:')) {
      return { speaker: 'user' as const, text: line.replace(/^(user|User):\s*/, '') };
    }
    if (line.startsWith('assistant:') || line.startsWith('Assistant:')) {
      return { speaker: 'assistant' as const, text: line.replace(/^(assistant|Assistant):\s*/, '') };
    }
    return { speaker: 'assistant' as const, text: line };
  });
}
