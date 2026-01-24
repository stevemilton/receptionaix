import { createClient } from '@/lib/supabase/server';

interface AppointmentRecord {
  id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: string;
  notes: string | null;
  customers: {
    id: string;
    name: string | null;
    phone: string;
    email: string | null;
  } | null;
}

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: appointments } = await (supabase as any)
    .from('appointments')
    .select('*, customers(id, name, phone, email)')
    .eq('merchant_id', user.id)
    .order('start_time', { ascending: true });

  // Group appointments by date
  const groupedAppointments = groupByDate(appointments || []);
  const today = new Date().toDateString();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
        <p className="text-gray-600">Manage your calendar and bookings</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        <FilterButton active>All</FilterButton>
        <FilterButton>Upcoming</FilterButton>
        <FilterButton>Past</FilterButton>
        <FilterButton>Cancelled</FilterButton>
      </div>

      {appointments && appointments.length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedAppointments).map(([date, dayAppointments]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                {formatDateHeader(date, today)}
              </h2>
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {(dayAppointments as AppointmentRecord[]).map((apt) => (
                    <div key={apt.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="text-center min-w-[60px]">
                            <div className="text-lg font-semibold text-gray-900">
                              {formatTime(apt.start_time)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatTime(apt.end_time)}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{apt.service_name}</h3>
                            <p className="text-sm text-gray-600">
                              {apt.customers?.name || apt.customers?.phone || 'Unknown customer'}
                            </p>
                            {apt.customers?.phone && (
                              <p className="text-sm text-gray-500">{apt.customers.phone}</p>
                            )}
                            {apt.notes && (
                              <p className="text-sm text-gray-500 mt-1">{apt.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={apt.status} />
                          <button className="text-gray-400 hover:text-gray-600">
                            <MoreIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No appointments yet</h3>
          <p className="text-gray-500">
            When customers book appointments through your AI receptionist, they will appear here.
          </p>
        </div>
      )}
    </div>
  );
}

function FilterButton({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active
          ? 'bg-primary-100 text-primary-700'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStyle = (s: string) => {
    switch (s) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'no_show': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStyle(status)}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function groupByDate(appointments: AppointmentRecord[]): Record<string, AppointmentRecord[]> {
  return appointments.reduce((groups, apt) => {
    const date = new Date(apt.start_time).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(apt);
    return groups;
  }, {} as Record<string, AppointmentRecord[]>);
}

function formatDateHeader(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStr === tomorrow.toDateString()) return 'Tomorrow';

  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function MoreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
  );
}
