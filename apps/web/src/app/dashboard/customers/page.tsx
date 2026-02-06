import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  formatPhone,
  formatDate,
  getInitials,
  PageHeader,
  EmptyState,
  UsersIcon,
  PhoneIcon,
  CalendarIcon,
} from '../_components/shared';

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Fetch customers
  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false });

  // Get appointment counts and call counts per customer
  const customerIds = customers?.map(c => c.id) || [];

  const [appointmentCountsResult, callCountsResult] = await Promise.all([
    customerIds.length > 0
      ? supabase.from('appointments').select('customer_id').in('customer_id', customerIds)
      : Promise.resolve({ data: [] }),
    customerIds.length > 0
      ? supabase.from('calls').select('customer_id').in('customer_id', customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aptCounts = (appointmentCountsResult.data || []).reduce((acc: Record<string, number>, row: any) => {
    if (row.customer_id) acc[row.customer_id] = (acc[row.customer_id] || 0) + 1;
    return acc;
  }, {});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callCounts = (callCountsResult.data || []).reduce((acc: Record<string, number>, row: any) => {
    if (row.customer_id) acc[row.customer_id] = (acc[row.customer_id] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 lg:p-8 max-w-7xl">
      <PageHeader title="Customers" subtitle="People who have contacted your business" />

      {customers && customers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => {
            const name = customer.name || 'Unknown';
            const apptCount = aptCounts[customer.id] || 0;
            const callCount = callCounts[customer.id] || 0;

            return (
              <div key={customer.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
                {/* Customer Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary-600">
                      {getInitials(name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{name}</div>
                    <div className="text-xs text-gray-500">{formatPhone(customer.phone)}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-3">
                  <div className="flex items-center gap-1.5">
                    <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{callCount} call{callCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">{apptCount} appt{apptCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Added {formatDate(customer.created_at || '')}</span>
                  {customer.email && (
                    <span className="text-xs text-gray-400 truncate ml-2">{customer.email}</span>
                  )}
                </div>

                {customer.notes && (
                  <p className="text-xs text-gray-500 mt-2 italic">{customer.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={UsersIcon}
          title="No customers yet"
          description="When callers interact with your AI receptionist, they will automatically be added as customers."
        />
      )}
    </div>
  );
}
