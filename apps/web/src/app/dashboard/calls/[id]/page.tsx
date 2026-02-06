import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface CallRecord {
  id: string;
  caller_phone: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript: string | null;
  summary: string | null;
  outcome: string | null;
  recording_url: string | null;
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: call, error } = await supabase
    .from('calls')
    .select('*')
    .eq('id', id)
    .eq('merchant_id', user.id)
    .single();

  if (error || !call) {
    notFound();
  }

  const typedCall = call as CallRecord;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/dashboard/calls"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to calls
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
        <p className="text-gray-600">
          {formatPhone(typedCall.caller_phone)} • {formatDateTime(typedCall.started_at || '')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Call Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Call Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500">Caller</dt>
                <dd className="text-sm font-medium text-gray-900">{formatPhone(typedCall.caller_phone)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Date & Time</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDateTime(typedCall.started_at || '')}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Duration</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDuration(typedCall.duration_seconds)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd><StatusBadge status={typedCall.outcome || 'unknown'} /></dd>
              </div>
            </dl>
          </div>

          {typedCall.summary && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Summary</h2>
              <p className="text-sm text-gray-700">{typedCall.summary}</p>
            </div>
          )}

          {typedCall.recording_url && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Recording</h2>
              <audio controls className="w-full">
                <source src={typedCall.recording_url} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        {/* Transcript */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Transcript</h2>
            {typedCall.transcript ? (
              <div className="space-y-4">
                {parseTranscript(typedCall.transcript).map((entry, i) => (
                  <div
                    key={i}
                    className={`flex gap-3 ${entry.speaker === 'assistant' ? '' : 'flex-row-reverse'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        entry.speaker === 'assistant'
                          ? 'bg-primary-100 text-primary-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {entry.speaker === 'assistant' ? 'AI' : 'C'}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        entry.speaker === 'assistant'
                          ? 'bg-primary-50 text-gray-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{entry.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No transcript available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TranscriptEntry {
  speaker: 'user' | 'assistant';
  text: string;
}

function parseTranscript(transcript: string): TranscriptEntry[] {
  const lines = transcript.split('\n').filter(line => line.trim());
  return lines.map(line => {
    if (line.startsWith('user:') || line.startsWith('User:')) {
      return { speaker: 'user' as const, text: line.replace(/^(user|User):\s*/, '') };
    }
    if (line.startsWith('assistant:') || line.startsWith('Assistant:')) {
      return { speaker: 'assistant' as const, text: line.replace(/^(assistant|Assistant):\s*/, '') };
    }
    // Default to assistant if no prefix
    return { speaker: 'assistant' as const, text: line };
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    booking: 'bg-green-100 text-green-800',
    message: 'bg-blue-100 text-blue-800',
    cancellation: 'bg-orange-100 text-orange-800',
    transfer: 'bg-purple-100 text-purple-800',
    missed: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    answered: 'bg-green-100 text-green-800',
  };
  const labels: Record<string, string> = {
    booking: 'Booking',
    message: 'Message',
    cancellation: 'Cancellation',
    transfer: 'Transfer',
    missed: 'Missed',
    completed: 'Completed',
    answered: 'Answered',
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {labels[status] || status}
    </span>
  );
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  if (phone.startsWith('+44')) {
    return phone.replace('+44', '0').replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}
