import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { toDateOnly, toDateStr } from "@/lib/date";

/**
 * GET /api/admin/calendar?month=2026-10
 *
 * Month view: per-day booking counts, per-slot usage, and closures.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const monthParam = new URL(request.url).searchParams.get("month");
    const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
      ? (monthParam as string)
      : toDateStr(new Date()).slice(0, 7);

    const start = toDateOnly(`${month}-01`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1); // exclusive

    const [bookings, slots, dayConfigs, closedDates, closures] =
      await Promise.all([
        prisma.booking.findMany({
          where: {
            date: { gte: start, lt: end },
            status: { not: "CANCELLED" },
          },
          select: {
            date: true,
            timeSlotId: true,
            bookingTime: true,
            status: true,
          },
        }),
        prisma.timeSlot.findMany({
          where: { active: true },
          orderBy: { time: "asc" },
          select: { id: true, time: true, period: true, capacity: true },
        }),
        prisma.dayConfig.findMany({
          where: { isClosed: true },
          select: { dayOfWeek: true },
        }),
        prisma.closedDate.findMany({
          where: { date: { gte: start, lt: end } },
          select: { date: true, reason: true },
        }),
        prisma.slotClosure.findMany({
          where: { date: { gte: start, lt: end } },
          select: { date: true, timeSlotId: true, reason: true },
        }),
      ]);

    // { "2026-10-15": { total: 4, slots: { <slotId>: 2 } } }
    const days: Record<
      string,
      { total: number; slots: Record<string, number> }
    > = {};

    for (const b of bookings) {
      const key = toDateStr(b.date);
      if (!days[key]) days[key] = { total: 0, slots: {} };
      days[key].total += 1;
      days[key].slots[b.timeSlotId] = (days[key].slots[b.timeSlotId] || 0) + 1;
    }

    // { "2026-10-20": [<slotId>, …] }
    const slotClosures: Record<string, string[]> = {};
    for (const c of closures) {
      const key = toDateStr(c.date);
      if (!slotClosures[key]) slotClosures[key] = [];
      slotClosures[key].push(c.timeSlotId);
    }

    const dailyCapacity = slots.reduce((sum, s) => sum + s.capacity, 0);

    return NextResponse.json({
      month,
      slots,
      dailyCapacity,
      closedDays: dayConfigs.map((d) => d.dayOfWeek),
      closedDates: closedDates.map((d) => ({
        date: toDateStr(d.date),
        reason: d.reason,
      })),
      slotClosures,
      days,
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/calendar] failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
