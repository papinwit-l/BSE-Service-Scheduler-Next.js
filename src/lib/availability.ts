import type { Prisma, SlotPeriod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import {
  addDaysStr,
  bangkokTodayStr,
  dayOfWeek,
  isValidDateStr,
  slotInstant,
  toDateOnly,
} from "@/lib/date";

/** Reasons a slot is unavailable. For admins these come back as warnings. */
export type SlotWarning =
  | "CAPACITY" // slot is full
  | "SERVICE_RESTRICTION" // a selected service isn't offered at this time
  | "LEAD_TIME" // too soon (or already past)
  | "SLOT_CLOSED"; // closed on this date, or the slot is inactive

export type SlotAvailability = {
  id: string;
  time: string;
  period: SlotPeriod;
  capacity: number;
  booked: number;
  available: boolean;
  warnings: SlotWarning[];
};

export type AvailabilityResult = {
  /** The whole date is unavailable — no slots are returned. */
  closed: boolean;
  reason?: string;
  /** Selected services have no time in common (customers only). */
  noCommonSlots?: boolean;
  slots: SlotAvailability[];
};

type Options = {
  dateStr: string;
  serviceIds?: string[];
  /**
   * Admins see every slot with warnings attached instead of exclusions,
   * and are not bound by lead time or the booking window.
   */
  asAdmin?: boolean;
  /** Ignore this booking's own seat when editing it. */
  excludeBookingId?: string;
};

/**
 * Which slots each restricted service allows. Services with
 * restrictSlots = false are unrestricted and impose nothing.
 *
 * Returns null when no restriction applies at all.
 */
async function restrictedSlotIds(
  serviceIds: string[],
  /**
   * The client to query through. MUST be the transaction client when called
   * from inside a transaction: with connection_limit=1 the transaction holds
   * the only connection, so a query on the global client waits for one that
   * can never free, and the transaction dies at pool_timeout.
   */
  client: Prisma.TransactionClient = prisma,
): Promise<Set<string> | null> {
  if (serviceIds.length === 0) return null;

  const services = await client.service.findMany({
    where: { id: { in: serviceIds }, restrictSlots: true },
    select: { serviceTimeSlots: { select: { timeSlotId: true } } },
  });

  if (services.length === 0) return null;

  // Intersection: a slot must be allowed by every restricted service.
  let allowed: string[] | null = null;

  for (const service of services) {
    const ids: string[] = service.serviceTimeSlots.map((s) => s.timeSlotId);

    allowed = allowed === null ? ids : allowed.filter((id) => ids.includes(id));
  }

  return allowed === null ? null : new Set<string>(allowed);
}

/**
 * Slot availability for one date.
 *
 * A slot is available to a customer when all six hold:
 *   1. the weekday is open and the date isn't a holiday
 *   2. the slot is active and not closed on this date
 *   3. every restricted service selected allows this slot
 *   4. it starts at least `booking_lead_hours` from now (Bangkok)
 *   5. the date is within `booking_max_days`
 *   6. bookings (status != CANCELLED) are below capacity
 */
export async function getAvailability({
  dateStr,
  serviceIds = [],
  asAdmin = false,
  excludeBookingId,
}: Options): Promise<AvailabilityResult> {
  if (!isValidDateStr(dateStr)) {
    return { closed: true, reason: "วันที่ไม่ถูกต้อง", slots: [] };
  }

  const date = toDateOnly(dateStr);
  const todayStr = bangkokTodayStr();
  const settings = await getSettings();

  // ── Rule 1: weekday and holiday ──
  const dayConfig = await prisma.dayConfig.findUnique({
    where: { dayOfWeek: dayOfWeek(dateStr) },
  });

  if (dayConfig?.isClosed) {
    return { closed: true, reason: "วันหยุดประจำสัปดาห์", slots: [] };
  }

  const closedDate = await prisma.closedDate.findUnique({ where: { date } });
  if (closedDate) {
    return { closed: true, reason: closedDate.reason || "วันหยุด", slots: [] };
  }

  // ── Rule 5: booking window (customers only) ──
  if (!asAdmin) {
    if (dateStr < todayStr) {
      return { closed: true, reason: "ไม่สามารถจองย้อนหลังได้", slots: [] };
    }

    const maxStr = addDaysStr(todayStr, settings.booking_max_days);
    if (dateStr > maxStr) {
      return {
        closed: true,
        reason: `จองล่วงหน้าได้ไม่เกิน ${settings.booking_max_days} วัน`,
        slots: [],
      };
    }
  }

  // ── Rule 3: service restrictions ──
  const allowedSlotIds = await restrictedSlotIds(serviceIds);

  if (!asAdmin && allowedSlotIds !== null && allowedSlotIds.size === 0) {
    return {
      closed: false,
      noCommonSlots: true,
      reason: "บริการที่เลือกไม่มีช่วงเวลาที่ตรงกัน กรุณาแยกจอง",
      slots: [],
    };
  }

  // ── Slots, closures and booking counts ──
  const bookingFilter: Prisma.BookingWhereInput = {
    date,
    status: { not: "CANCELLED" },
    ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
  };

  const slots = await prisma.timeSlot.findMany({
    where: asAdmin ? {} : { active: true },
    orderBy: { time: "asc" }, // zero-padded, so string order is time order
    select: {
      id: true,
      time: true,
      period: true,
      capacity: true,
      active: true,
      closures: { where: { date }, select: { id: true } },
      _count: { select: { bookings: { where: bookingFilter } } },
    },
  });

  const leadCutoff = Date.now() + settings.booking_lead_hours * 60 * 60 * 1000;

  const result: SlotAvailability[] = slots.map((slot) => {
    const booked = slot._count.bookings;
    const warnings: SlotWarning[] = [];

    if (!slot.active || slot.closures.length > 0) {
      warnings.push("SLOT_CLOSED");
    }

    if (allowedSlotIds !== null && !allowedSlotIds.has(slot.id)) {
      warnings.push("SERVICE_RESTRICTION");
    }

    if (slotInstant(dateStr, slot.time).getTime() < leadCutoff) {
      warnings.push("LEAD_TIME");
    }

    if (booked >= slot.capacity) {
      warnings.push("CAPACITY");
    }

    return {
      id: slot.id,
      time: slot.time,
      period: slot.period,
      capacity: slot.capacity,
      booked,
      // Admins may override capacity and service restrictions, but a closed
      // or inactive slot is never bookable by anyone.
      available: asAdmin
        ? !warnings.includes("SLOT_CLOSED")
        : warnings.length === 0,
      warnings,
    };
  });

  // Customers never see slots they can't pick; admins see everything.
  return {
    closed: false,
    slots: asAdmin ? result : result.filter((s) => s.available),
  };
}

/**
 * Re-check one slot at write time.
 *
 * Call inside the booking transaction, after locking the slot row, so the
 * seat can't be taken between page load and submit.
 */
export async function checkSlot(
  tx: Prisma.TransactionClient,
  opts: {
    dateStr: string;
    timeSlotId: string;
    serviceIds: string[];
    excludeBookingId?: string;
  },
): Promise<{ ok: boolean; warnings: SlotWarning[]; time: string | null }> {
  const date = toDateOnly(opts.dateStr);

  // Row lock: serialises concurrent bookings for this slot.
  await tx.$executeRaw`SELECT id FROM time_slots WHERE id = ${opts.timeSlotId} FOR UPDATE`;

  const slot = await tx.timeSlot.findUnique({
    where: { id: opts.timeSlotId },
    select: { id: true, time: true, capacity: true, active: true },
  });

  if (!slot) return { ok: false, warnings: ["SLOT_CLOSED"], time: null };

  const warnings: SlotWarning[] = [];

  const closure = await tx.slotClosure.findUnique({
    where: { date_timeSlotId: { date, timeSlotId: slot.id } },
    select: { id: true },
  });

  if (!slot.active || closure) warnings.push("SLOT_CLOSED");

  const allowed = await restrictedSlotIds(opts.serviceIds, tx);
  if (allowed !== null && !allowed.has(slot.id)) {
    warnings.push("SERVICE_RESTRICTION");
  }

  const booked = await tx.booking.count({
    where: {
      date,
      timeSlotId: slot.id,
      status: { not: "CANCELLED" },
      ...(opts.excludeBookingId ? { id: { not: opts.excludeBookingId } } : {}),
    },
  });

  if (booked >= slot.capacity) warnings.push("CAPACITY");

  return { ok: warnings.length === 0, warnings, time: slot.time };
}

/** Thai text for a warning, for confirmation dialogs and error messages. */
export const WARNING_MESSAGES: Record<SlotWarning, string> = {
  CAPACITY: "ช่วงเวลานี้เต็มแล้ว ยืนยันจะเพิ่มคิว?",
  SERVICE_RESTRICTION: "บริการนี้ไม่เปิดในช่วงเวลานี้ ยืนยันหรือไม่?",
  LEAD_TIME: "ช่วงเวลานี้ผ่านไปแล้วหรือใกล้เกินไป",
  SLOT_CLOSED: "ช่วงเวลานี้ปิดให้บริการ",
};
