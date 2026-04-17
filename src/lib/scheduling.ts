import { addDays, addMinutes, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { fromZonedTime, toZonedTime, format as formatTz } from 'date-fns-tz';

export type AvailabilityWindow = {
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string;  // 'HH:MM:SS'
  end_time: string;
  slot_duration_minutes: number;
  timezone: string;
};

const DEFAULT_TZ = 'America/New_York';

/** Build an array of ISO timestamps representing every available slot
 *  for a given local date (in the business timezone), excluding past times,
 *  blocked dates, and already-booked timestamps.
 */
export function buildSlotsForDate(args: {
  date: Date;
  windows: AvailabilityWindow[];
  bookedISO: string[];
  blockedDates: string[]; // YYYY-MM-DD
  minLeadMinutes?: number;
}): { iso: string; label: string }[] {
  const { date, windows, bookedISO, blockedDates, minLeadMinutes = 60 } = args;
  const tz = windows[0]?.timezone ?? DEFAULT_TZ;

  const dateKey = format(date, 'yyyy-MM-dd');
  if (blockedDates.includes(dateKey)) return [];

  const dow = date.getDay();
  const todaysWindows = windows.filter((w) => w.day_of_week === dow);
  if (todaysWindows.length === 0) return [];

  const bookedSet = new Set(bookedISO.map((s) => new Date(s).toISOString()));
  const earliest = addMinutes(new Date(), minLeadMinutes);
  const slots: { iso: string; label: string }[] = [];

  for (const w of todaysWindows) {
    const [sh, sm] = w.start_time.split(':').map(Number);
    const [eh, em] = w.end_time.split(':').map(Number);
    // Construct local-zoned start/end then convert to UTC instants.
    const localStart = `${dateKey}T${pad(sh)}:${pad(sm)}:00`;
    const localEnd = `${dateKey}T${pad(eh)}:${pad(em)}:00`;
    const startUtc = fromZonedTime(localStart, tz);
    const endUtc = fromZonedTime(localEnd, tz);

    let cursor = startUtc;
    while (isBefore(addMinutes(cursor, w.slot_duration_minutes), endUtc) ||
           +addMinutes(cursor, w.slot_duration_minutes) === +endUtc) {
      if (isAfter(cursor, earliest) && !bookedSet.has(cursor.toISOString())) {
        slots.push({
          iso: cursor.toISOString(),
          label: formatTz(cursor, 'h:mm a', { timeZone: tz }),
        });
      }
      cursor = addMinutes(cursor, w.slot_duration_minutes);
    }
  }

  // Dedupe & sort
  const map = new Map(slots.map((s) => [s.iso, s]));
  return Array.from(map.values()).sort((a, b) => a.iso.localeCompare(b.iso));
}

/** A 14-day picker window starting today. */
export function getDateRange(daysAhead = 14): Date[] {
  const today = startOfDay(new Date());
  return Array.from({ length: daysAhead }, (_, i) => addDays(today, i));
}

export function isDateBookable(args: {
  date: Date;
  windows: AvailabilityWindow[];
  blockedDates: string[];
}): boolean {
  const { date, windows, blockedDates } = args;
  const dateKey = format(date, 'yyyy-MM-dd');
  if (blockedDates.includes(dateKey)) return false;
  return windows.some((w) => w.day_of_week === date.getDay());
}

export function formatSlotLong(iso: string, tz = DEFAULT_TZ): string {
  const d = parseISO(iso);
  const zoned = toZonedTime(d, tz);
  return `${format(zoned, 'EEEE, MMMM d')} at ${formatTz(d, 'h:mm a zzz', { timeZone: tz })}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export { DEFAULT_TZ };
