import type { CronofyFreeBusyBlock } from './types.js';

/**
 * Opening hours format from knowledge base:
 *   { monday: "9:00 AM - 6:00 PM", tuesday: "Closed", ... }
 */
type OpeningHours = Record<string, string>;

interface TimeRange {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
}

const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday',
  'thursday', 'friday', 'saturday',
] as const;

/**
 * Parse a time string like "9:00 AM" or "5:30 PM" into minutes from midnight.
 */
function parseTime(timeStr: string): number | null {
  const trimmed = timeStr.trim().toUpperCase();

  // Match "9:00 AM", "10:30 PM", "9AM", "5PM", etc.
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (!match) {
    // Try 24h format: "09:00", "17:30"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
      const hours = parseInt(match24[1]!, 10);
      const minutes = parseInt(match24[2]!, 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return hours * 60 + minutes;
      }
    }
    return null;
  }

  let hours = parseInt(match[1]!, 10);
  const minutes = parseInt(match[2] || '0', 10);
  const period = match[3]!;

  if (hours === 12) {
    hours = period === 'AM' ? 0 : 12;
  } else if (period === 'PM') {
    hours += 12;
  }

  return hours * 60 + minutes;
}

/**
 * Parse an opening hours string like "9:00 AM - 6:00 PM" into a TimeRange.
 * Returns null if closed or unparseable.
 */
function parseOpeningHoursEntry(entry: string): TimeRange | null {
  const lower = entry.trim().toLowerCase();
  if (lower === 'closed' || lower === '' || lower === 'n/a') {
    return null;
  }

  // Split on dash/en-dash/em-dash with optional spaces
  const parts = entry.split(/\s*[-–—]\s*/);
  if (parts.length !== 2) return null;

  const start = parseTime(parts[0]!);
  const end = parseTime(parts[1]!);

  if (start === null || end === null || start >= end) return null;

  return { start, end };
}

/**
 * Convert a Cronofy free/busy block into a TimeRange (minutes from midnight)
 * for a specific date. Clamps to the given date's boundaries.
 */
function busyBlockToRange(
  block: CronofyFreeBusyBlock,
  dateStr: string,
  tzOffset: number
): TimeRange | null {
  const blockStart = new Date(block.start);
  const blockEnd = new Date(block.end);
  const dayStart = new Date(`${dateStr}T00:00:00`);
  const dayEnd = new Date(`${dateStr}T23:59:59`);

  // Adjust for timezone offset (minutes)
  dayStart.setMinutes(dayStart.getMinutes() + tzOffset);
  dayEnd.setMinutes(dayEnd.getMinutes() + tzOffset);

  // Skip blocks entirely outside our date
  if (blockEnd <= dayStart || blockStart >= dayEnd) return null;

  // Clamp to the date boundaries
  const effectiveStart = blockStart < dayStart ? dayStart : blockStart;
  const effectiveEnd = blockEnd > dayEnd ? dayEnd : blockEnd;

  const startMinutes = effectiveStart.getHours() * 60 + effectiveStart.getMinutes();
  const endMinutes = effectiveEnd.getHours() * 60 + effectiveEnd.getMinutes();

  if (startMinutes >= endMinutes) return null;

  return { start: startMinutes, end: endMinutes };
}

/**
 * Subtract busy ranges from a free range, returning remaining free segments.
 */
function subtractBusyFromFree(
  free: TimeRange,
  busyRanges: TimeRange[]
): TimeRange[] {
  // Sort busy ranges by start time
  const sorted = [...busyRanges].sort((a, b) => a.start - b.start);

  const result: TimeRange[] = [];
  let cursor = free.start;

  for (const busy of sorted) {
    // Skip busy blocks entirely before cursor
    if (busy.end <= cursor) continue;
    // Stop if busy block starts after free range ends
    if (busy.start >= free.end) break;

    // There's a free gap before this busy block
    if (busy.start > cursor) {
      result.push({ start: cursor, end: Math.min(busy.start, free.end) });
    }

    cursor = Math.max(cursor, busy.end);
  }

  // Remaining free time after all busy blocks
  if (cursor < free.end) {
    result.push({ start: cursor, end: free.end });
  }

  return result;
}

/**
 * Divide free time ranges into fixed-duration slots.
 */
function generateSlots(
  freeRanges: TimeRange[],
  slotDurationMinutes: number
): number[] {
  const slots: number[] = [];

  for (const range of freeRanges) {
    let cursor = range.start;
    while (cursor + slotDurationMinutes <= range.end) {
      slots.push(cursor);
      cursor += slotDurationMinutes;
    }
  }

  return slots;
}

/**
 * Convert minutes from midnight to an ISO datetime string.
 */
function minutesToISOTime(dateStr: string, minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

/**
 * Compute available appointment slots for a given date.
 *
 * 1. Looks up opening hours for the day of week
 * 2. Subtracts Cronofy busy blocks
 * 3. Divides remaining free time into slots
 *
 * @param dateStr - Date in YYYY-MM-DD format
 * @param busyBlocks - Busy periods from Cronofy free/busy API
 * @param openingHours - Merchant's opening hours from knowledge base
 * @param slotDurationMinutes - Duration of each slot (default 30)
 * @returns Array of ISO datetime strings for available slots
 */
export function computeAvailableSlots(
  dateStr: string,
  busyBlocks: CronofyFreeBusyBlock[],
  openingHours: OpeningHours | null,
  slotDurationMinutes: number = 30
): string[] {
  if (!openingHours) {
    // No opening hours defined — return empty (caller should use mock slots)
    return [];
  }

  // Determine day of week
  const date = new Date(`${dateStr}T12:00:00Z`); // noon UTC to avoid DST issues
  const dayIndex = date.getUTCDay();
  const dayName = DAY_NAMES[dayIndex]!;

  // Look up opening hours for this day
  const hoursEntry = openingHours[dayName];
  if (!hoursEntry) return [];

  const openRange = parseOpeningHoursEntry(hoursEntry);
  if (!openRange) return []; // Closed

  // Convert busy blocks to time ranges for this date
  const busyRanges: TimeRange[] = [];
  for (const block of busyBlocks) {
    if (block.free_busy_status === 'free') continue; // Only subtract busy/tentative
    const range = busyBlockToRange(block, dateStr, 0);
    if (range) {
      busyRanges.push(range);
    }
  }

  // Subtract busy from open hours
  const freeRanges = subtractBusyFromFree(openRange, busyRanges);

  // Generate slots
  const slotMinutes = generateSlots(freeRanges, slotDurationMinutes);

  // Convert to ISO strings
  return slotMinutes.map((m) => minutesToISOTime(dateStr, m));
}
