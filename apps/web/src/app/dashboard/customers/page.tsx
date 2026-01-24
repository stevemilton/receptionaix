import { createClient } from '@/lib/supabase/server';

interface CustomerRecord {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  appointment_count?: number;
  last_appointment?: string;
}

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabaseAny = supabase as any;

  // Fetch customers with appointment count
  const { data: customers } = await supabaseAny
    .from('customers')
    .select('*')
    .eq('merchant_id', user.id)
    .order('created_at', { ascending: false });

  // Get appointment counts per customer
  const customerIds = customers?.map((c: CustomerRecord) => c.id) || [];
  const { data: appointmentCounts } = customerIds.length > 0
    ? await supabaseAny
        .from('appointments')
        .select('customer_id')
        .in('customer_id', customerIds)
    : { data: [] };

  // Count appointments per customer
  const countsMap = (appointmentCounts || []).reduce((acc: Record<string, number>, apt: { customer_id: string }) => {
    acc[apt.customer_id] = (acc[apt.customer_id] || 0) + 1;
    return acc;
  }, {});

  const customersWithCounts = (customers || []).map((c: CustomerRecord) => ({
    ...c,
    appointment_count: countsMap[c.id] || 0,
  }));

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-600">Manage your customer database</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {customersWithCounts.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Added
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customersWithCounts.map((customer: CustomerRecord) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {getInitials(customer.name || customer.phone)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {customer.name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatPhone(customer.phone)}</div>
                    {customer.email && (
                      <div className="text-sm text-gray-500">{customer.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{customer.appointment_count}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {new Date(customer.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {customer.notes || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No customers yet</h3>
            <p className="text-gray-500">
              When callers interact with your AI receptionist, they will be added as customers.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatPhone(phone: string): string {
  if (!phone) return 'Unknown';
  if (phone.startsWith('+44')) {
    return phone.replace('+44', '0').replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}
