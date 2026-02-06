/**
 * Shared dashboard components and utilities.
 * Eliminates duplication across dashboard pages.
 */

// ── Format Utilities ──────────────────────────────────────────────────────────

export function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  if (phone.startsWith('+44')) {
    const digits = phone.replace('+44', '0');
    // UK mobile: 07xxx xxx xxx
    if (digits.startsWith('07')) {
      return digits.replace(/(\d{5})(\d{3})(\d{3})/, '$1 $2 $3');
    }
    // UK landline: 0xxxx xxx xxx
    return digits.replace(/(\d{4,5})(\d{3})(\d{3,4})/, '$1 $2 $3');
  }
  return phone;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDurationLong(seconds: number | null): string {
  if (!seconds) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function formatDateHeader(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toDateString()) return 'Tomorrow';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateStr);
}

// ── Shared Components ─────────────────────────────────────────────────────────

export function OutcomeBadge({ outcome }: { outcome: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    booking: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Booking' },
    message: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Message' },
    cancellation: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Cancellation' },
    transfer: { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Transfer' },
    missed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Missed' },
  };
  const c = config[outcome] || { bg: 'bg-gray-50', text: 'text-gray-600', label: outcome };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

export function AppointmentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    confirmed: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
    completed: { bg: 'bg-gray-100', text: 'text-gray-600' },
    no_show: { bg: 'bg-amber-50', text: 'text-amber-700' },
    pending: { bg: 'bg-blue-50', text: 'text-blue-700' },
  };
  const c = config[status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    high: { bg: 'bg-red-50', text: 'text-red-700' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700' },
    low: { bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  const c = config[urgency] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {urgency}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
      <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
      <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{title}</h1>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-3 sm:p-5 ${accent ? 'border-primary-200 ring-1 ring-primary-100' : 'border-gray-200'}`}>
      <div className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</div>
      <div className={`text-xl sm:text-2xl font-bold mt-1 ${accent ? 'text-primary-600' : 'text-gray-900'}`}>{value}</div>
      {sublabel && <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">{sublabel}</div>}
    </div>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

export function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

export function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

export function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

export function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function InboxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

export function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
