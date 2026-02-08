import { supabaseAdmin } from './supabase-client.js';
import { decryptToken, isEncrypted, encryptToken } from '@receptionalx/shared';
import {
  getFreeBusy,
  refreshAccessToken,
  createEvent,
  deleteEvent,
  computeAvailableSlots,
} from '@receptionalx/cronofy';
import type { CronofyFreeBusyBlock } from '@receptionalx/cronofy';

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

// ---------- Cronofy helper ----------

interface CronofyClient {
  accessToken: string;
  calendarId: string;
}

/**
 * Fetch and decrypt the merchant's Cronofy credentials.
 * Refreshes the access token if it's within 5 minutes of expiry.
 * Returns null if no Cronofy tokens exist for this merchant.
 */
async function getMerchantCronofyClient(merchantId: string): Promise<CronofyClient | null> {
  const { data: merchant } = await supabaseAdmin
    .from('merchants')
    .select('cronofy_access_token, cronofy_refresh_token, cronofy_token_expires_at, cronofy_calendar_id')
    .eq('id', merchantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const m = merchant as any;
  if (!m?.cronofy_access_token || !m?.cronofy_calendar_id) {
    return null;
  }

  // Decrypt tokens
  const rawAccess = m.cronofy_access_token as string;
  let accessToken = isEncrypted(rawAccess)
    ? decryptToken<string>(rawAccess)
    : rawAccess;

  if (!accessToken) return null;

  // Check if token needs refreshing (within 5 min of expiry)
  const expiresAt = m.cronofy_token_expires_at
    ? new Date(m.cronofy_token_expires_at as string).getTime()
    : 0;
  const fiveMinFromNow = Date.now() + 5 * 60 * 1000;

  if (expiresAt > 0 && expiresAt < fiveMinFromNow && m.cronofy_refresh_token) {
    try {
      const rawRefresh = m.cronofy_refresh_token as string;
      const refreshToken = isEncrypted(rawRefresh)
        ? decryptToken<string>(rawRefresh)
        : rawRefresh;

      if (refreshToken) {
        const clientId = process.env['CRONOFY_CLIENT_ID'];
        const clientSecret = process.env['CRONOFY_CLIENT_SECRET'];

        if (clientId && clientSecret) {
          const newTokens = await refreshAccessToken(refreshToken, clientId, clientSecret);
          accessToken = newTokens.access_token;

          // Persist new tokens (fire-and-forget)
          const encryptedAccess = encryptToken(newTokens.access_token) ?? newTokens.access_token;
          const encryptedRefresh = newTokens.refresh_token
            ? (encryptToken(newTokens.refresh_token) ?? newTokens.refresh_token)
            : m.cronofy_refresh_token;
          const newExpiresAt = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
            : m.cronofy_token_expires_at;

          void Promise.resolve(
            supabaseAdmin
              .from('merchants')
              .update({
                cronofy_access_token: encryptedAccess,
                cronofy_refresh_token: encryptedRefresh,
                cronofy_token_expires_at: newExpiresAt,
              } as Record<string, unknown>)
              .eq('id', merchantId)
          ).catch((err: unknown) => console.warn('[Cronofy] Token refresh persist failed:', err));
        }
      }
    } catch (refreshErr) {
      console.warn('[Cronofy] Token refresh failed, using existing token:', refreshErr);
    }
  }

  return {
    accessToken,
    calendarId: m.cronofy_calendar_id as string,
  };
}

// ---------- Mock slots fallback ----------

function getMockSlots(date: string): string[] {
  return [
    `${date}T09:00:00`,
    `${date}T10:00:00`,
    `${date}T11:00:00`,
    `${date}T14:00:00`,
    `${date}T15:00:00`,
    `${date}T16:00:00`,
  ];
}

// ---------- Tool dispatcher ----------

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

// ---------- Tool implementations ----------

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
  _service?: string
): Promise<{ slots?: string[]; error?: string }> {
  // Try Cronofy-based availability first
  try {
    const cronofyClient = await getMerchantCronofyClient(merchantId);

    if (!cronofyClient) {
      // No Cronofy tokens — return mock slots (backward compat)
      console.log(`[checkAvailability] No Cronofy client for merchant ${merchantId}, using mock slots`);
      return { slots: getMockSlots(date) };
    }

    // Get merchant's opening hours from knowledge base
    const { data: kb } = await supabaseAdmin
      .from('knowledge_bases')
      .select('opening_hours')
      .eq('merchant_id', merchantId)
      .single();

    const openingHours = (kb?.opening_hours as Record<string, string>) || null;

    // Query Cronofy free/busy for the date
    const fromDate = date;
    const toDate = date; // same day
    const freeBusyResponse = await getFreeBusy(
      cronofyClient.accessToken,
      fromDate,
      toDate,
      'Europe/London'
    );

    const busyBlocks: CronofyFreeBusyBlock[] = freeBusyResponse.free_busy || [];

    // Compute available slots
    const slots = computeAvailableSlots(date, busyBlocks, openingHours, 30);

    if (slots.length === 0 && !openingHours) {
      // No opening hours and no slots → fall back to mock
      console.log(`[checkAvailability] No opening hours for merchant ${merchantId}, using mock slots`);
      return { slots: getMockSlots(date) };
    }

    return { slots };
  } catch (err) {
    // On any Cronofy error, fall back to mock slots
    console.warn(`[checkAvailability] Cronofy error for merchant ${merchantId}, falling back to mock slots:`, err);
    return { slots: getMockSlots(date) };
  }
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

  // Create appointment in Supabase
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

  // Create event in merchant's calendar via Cronofy (fire-and-forget — don't fail if this errors)
  try {
    const cronofyClient = await getMerchantCronofyClient(merchantId);
    if (cronofyClient) {
      const eventId = `receptionai-${appointment.id}`;

      await createEvent(cronofyClient.accessToken, cronofyClient.calendarId, {
        event_id: eventId,
        summary: service,
        description: `Booked by ReceptionAI\nCustomer: ${customerName || customerPhone}\nPhone: ${customerPhone}`,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        tzid: 'Europe/London',
      });

      // Save the calendar event ID on the appointment
      await supabaseAdmin
        .from('appointments')
        .update({ calendar_event_id: eventId } as Record<string, unknown>)
        .eq('id', appointment.id);

      console.log(`[createBooking] Cronofy event created: ${eventId}`);
    }
  } catch (calErr) {
    // Log but don't fail — the Supabase appointment is already created
    console.warn('[createBooking] Cronofy event creation failed (appointment still saved):', calErr);
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

  // Build query for appointments — include calendar_event_id for Cronofy cleanup
  let query = supabaseAdmin
    .from('appointments')
    .select('id, calendar_event_id')
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

  // Delete the calendar event via Cronofy (fire-and-forget)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calEventId = (firstAppointment as any).calendar_event_id;
  if (calEventId) {
    try {
      const cronofyClient = await getMerchantCronofyClient(merchantId);
      if (cronofyClient) {
        await deleteEvent(cronofyClient.accessToken, cronofyClient.calendarId, calEventId);
        console.log(`[cancelBooking] Cronofy event deleted: ${calEventId}`);
      }
    } catch (calErr) {
      console.warn('[cancelBooking] Cronofy event deletion failed (appointment already cancelled):', calErr);
    }
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
