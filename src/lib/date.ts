/**
 * Date helpers for Asia/Bangkok (UTC+7, no DST — a fixed offset is safe).
 *
 * Booking.date is `@db.Date`, which MySQL stores without time or zone and
 * Prisma returns as midnight UTC. So date-only values are always built and
 * compared at T00:00:00.000Z, never with `new Date(str)` on a full timestamp.
 */

const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

/** "2026-10-15" → Date at 2026-10-15T00:00:00.000Z, for @db.Date columns. */
export function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Date → "2026-10-15" */
export function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today in Bangkok as "2026-10-15". */
export function bangkokTodayStr(): string {
  return new Date(Date.now() + BKK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Today in Bangkok as a date-only Date. */
export function bangkokToday(): Date {
  return toDateOnly(bangkokTodayStr());
}

/** Current year in Bangkok — used for the booking code. */
export function bangkokYear(): number {
  return Number(bangkokTodayStr().slice(0, 4));
}

/** Add days to a "YYYY-MM-DD" string. */
export function addDaysStr(dateStr: string, days: number): string {
  const d = toDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/**
 * The exact instant a slot starts, e.g. ("2026-10-15", "09:30") →
 * 2026-10-15T09:30+07:00. Used for lead-time checks.
 */
export function slotInstant(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00+07:00`);
}

/** Day of week for a date-only string: 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(dateStr: string): number {
  return toDateOnly(dateStr).getUTCDay();
}

/** Monday of the week containing dateStr (Sunday is the holiday). */
export function startOfWeekStr(dateStr: string): string {
  const dow = dayOfWeek(dateStr);
  const backToMonday = dow === 0 ? 6 : dow - 1;
  return addDaysStr(dateStr, -backToMonday);
}

/** True for a well-formed "YYYY-MM-DD" that is a real calendar date. */
export function isValidDateStr(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = toDateOnly(dateStr);
  return !Number.isNaN(d.getTime()) && toDateStr(d) === dateStr;
}
