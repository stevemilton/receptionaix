import { createClient } from '@/lib/supabase/server';
import {
  formatPhone,
  formatTime,
  formatDateHeader,
  AppointmentStatusBadge,
  PageHeader,
  EmptyState,
  CalendarIcon,
  ClockIcon,
} from '../_components/shared';

export default async function AppointmentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch appointments with customer data, ordered by start_time
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, customers(id, name, phone, email)')
    .eq('merchant_id', user.id)
    .order('start_time', { ascending: true });

  // Separate into upcoming and past
  const now = new Date();
  const upcoming = (appointments || []).filter(a => new Date(a.start_time) >= now && a.status !== 'cancelled');
  const past = (appointments || []).filter(a => new Date(a.start_time) < now || a.status === 'cancelled');

  // Group upcoming by date
  const groupedUpcoming = groupByDate(upcoming);
  const today = new Date().toDateString();

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <PageHeader title="Appointments" subtitle="Bookings made through your AI receptionist" />

      {/* Upcoming Section */}
      {upcoming.length > 0 ? (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming</h2>
          <div className="space-y-6">
            {Object.entries(groupedUpcoming).map(([date, dayAppts]) => (
              <div key={date}>
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {formatDateHeader(date, today)}
                </h3>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="divide-y divide-gray-50">
                    {dayAppts.map((apt) => (
                      <AppointmentRow key={apt.id} appointment={apt} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-10">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming</h2>
          <EmptyState
            icon={CalendarIcon}
            title="No upcoming appointments"
            description="When customers book appointments through your AI receptionist, they will appear here."
          />
        </div>
      )}

      {/* Past Section */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Past & Cancelled</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {past.slice(0, 20).map((apt) => (
                <AppointmentRow key={apt.id} appointment={apt} muted />
              ))}
            </div>
          </div>
          {past.length > 20 && (
            <p className="text-xs text-gray-400 text-center mt-3">
              Showing 20 of {past.length} past appointments
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppointmentRow({ appointment: apt, muted }: { appointment: any; muted?: boolean }) {
  return (
    <div className={`px-5 py-4 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4">
        {/* Time */}
        <div className="w-16 flex-shrink-0 text-center">
          <div className={`text-sm font-semibold ${muted ? 'text-gray-400' : 'text-gray-900'}`}>
            {formatTime(apt.start_time)}
          </div>
          <div className="text-xs text-gray-400">
            {formatTime(apt.end_time)}
          </div>
        </div>

        {/* Divider */}
        <div className="w-0.5 h-10 bg-gray-100 rounded-full flex-shrink-0" />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900">{apt.service_name}</span>
            <AppointmentStatusBadge status={apt.status || 'pending'} />
          </div>
          <div className="text-xs text-gray-500 mt-0.5">
            {apt.customers?.name || formatPhone(apt.customers?.phone || 'Unknown customer')}
            {apt.customers?.phone && apt.customers?.name && (
              <span className="text-gray-400"> &middot; {formatPhone(apt.customers.phone)}</span>
            )}
          </div>
        </div>

        {/* Date (for past appointments) */}
        {muted && (
          <div className="text-xs text-gray-400 flex-shrink-0">
            {new Date(apt.start_time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupByDate(appointments: any[]): Record<string, any[]> {
  return appointments.reduce((groups, apt) => {
    const date = new Date(apt.start_time).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(apt);
    return groups;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any[]>);
}
