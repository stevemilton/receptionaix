import { supabaseAdmin } from './supabase-client.js';

/** Validate that a param is a non-empty string. */
function requireString(params: Record<string, unknown>, key: string): string | null {
  const val = params[key];
  return typeof val === 'string' && val.length > 0 ? val : null;
}

/** Read an optional string param. */
function optionalString(params: Record<string, unknown>, key: string): string | undefined {
  const val = params[key];
  return typeof val === 'string' && val.length > 0 ? val : undefined;
}

export async function executeToolCall(
  merchantId: string,
  toolName: string,
  params: Record<string, unknown>
): Promise<unknown> {
  console.log(`Executing tool: ${toolName}`, params);

  switch (toolName) {
    case 'lookupCustomer': {
      const phone = requireString(params, 'phone');
      if (!phone) return { error: 'Missing required parameter: phone' };
      return await lookupCustomer(merchantId, phone);
    }

    case 'checkAvailability': {
      const date = requireString(params, 'date');
      if (!date) return { error: 'Missing required parameter: date' };
      return await checkAvailability(merchantId, date, optionalString(params, 'service'));
    }

    case 'createBooking': {
      if (!requireString(params, 'customerPhone') || !requireString(params, 'service') || !requireString(params, 'dateTime')) {
        return { error: 'Missing required parameters: customerPhone, service, dateTime' };
      }
      return await createBooking(merchantId, params);
    }

    case 'cancelBooking': {
      if (!requireString(params, 'customerPhone')) {
        return { error: 'Missing required parameter: customerPhone' };
      }
      return await cancelBooking(merchantId, params);
    }

    case 'takeMessage': {
      if (!requireString(params, 'callerPhone') || !requireString(params, 'message')) {
        return { error: 'Missing required parameters: callerPhone, message' };
      }
      return await takeMessage(merchantId, params);
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

async function lookupCustomer(
  merchantId: string,
  phone: string
): Promise<{ found: boolean; customer?: CustomerInfo }> {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('phone', phone)
    .single();

  if (error || !data) {
    return { found: false };
  }

  return {
    found: true,
    customer: {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
    },
  };
}

interface CustomerInfo {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
}

async function checkAvailability(
  merchantId: string,
  date: string,
  service?: string
): Promise<{ slots?: string[]; error?: string }> {
  // Get merchant's calendar settings
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('google_calendar_token, settings')
    .eq('id', merchantId)
    .single();

  if (!merchant?.google_calendar_token) {
    // Return mock slots if no calendar connected
    return {
      slots: [
        `${date}T09:00:00`,
        `${date}T10:00:00`,
        `${date}T11:00:00`,
        `${date}T14:00:00`,
        `${date}T15:00:00`,
        `${date}T16:00:00`,
      ],
    };
  }

  // TODO: Integrate with Google Calendar API
  return {
    slots: [
      `${date}T09:00:00`,
      `${date}T10:30:00`,
      `${date}T14:00:00`,
      `${date}T15:30:00`,
    ],
  };
}

async function createBooking(
  merchantId: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; appointment?: AppointmentInfo; error?: string }> {
  const { customerPhone, customerName, service, dateTime } = params as {
    customerPhone: string;
    customerName?: string;
    service: string;
    dateTime: string;
  };

  // Find or create customer
  let { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('phone', customerPhone)
    .single();

  if (!customer) {
    const { data: newCustomer, error } = await supabaseAdmin
      .from('customers')
      .insert({
        merchant_id: merchantId,
        phone: customerPhone,
        name: customerName || null,
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: 'Failed to create customer' };
    }
    customer = newCustomer;
  }

  // Create appointment
  const startTime = new Date(dateTime);
  const endTime = new Date(startTime.getTime() + 30 * 60000);

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({
      merchant_id: merchantId,
      customer_id: customer.id,
      service_name: service,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    appointment: {
      id: appointment.id,
      service,
      dateTime,
      customerName: customerName || customerPhone,
    },
  };
}

interface AppointmentInfo {
  id: string;
  service: string;
  dateTime: string;
  customerName: string;
}

async function cancelBooking(
  merchantId: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const { customerPhone, appointmentDate } = params as {
    customerPhone: string;
    appointmentDate?: string;
  };

  // Find the customer first
  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('phone', customerPhone)
    .single();

  if (!customer) {
    return { success: false, error: 'Customer not found' };
  }

  // Build query for appointments
  let query = supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('merchant_id', merchantId)
    .eq('customer_id', customer.id)
    .eq('status', 'confirmed');

  if (appointmentDate) {
    query = query
      .gte('start_time', `${appointmentDate}T00:00:00`)
      .lt('start_time', `${appointmentDate}T23:59:59`);
  }

  const { data: appointments } = await query;

  if (!appointments || appointments.length === 0) {
    return { success: false, error: 'No appointment found' };
  }

  // Cancel the first matching appointment
  const firstAppointment = appointments[0];
  if (!firstAppointment) {
    return { success: false, error: 'No appointment found' };
  }

  const { error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', firstAppointment.id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

async function takeMessage(
  merchantId: string,
  params: Record<string, unknown>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { callerName, callerPhone, message, urgency } = params as {
    callerName?: string;
    callerPhone: string;
    message: string;
    urgency?: 'low' | 'medium' | 'high';
  };

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({
      merchant_id: merchantId,
      caller_name: callerName || null,
      caller_phone: callerPhone,
      content: message,
      urgency: urgency || 'medium',
      read: false,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data.id };
}
