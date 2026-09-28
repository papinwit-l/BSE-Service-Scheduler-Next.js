import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import {
  addDaysStr,
  bangkokTodayStr,
  startOfWeekStr,
  toDateOnly,
  toDateStr,
} from "@/lib/date";

/**
 * GET /api/admin/dashboard
 *
 * All ranges are calculated in Bangkok time, and weeks start on Monday
 * (Sunday is the service centre's holiday).
 */
export async function GET() {
  try {
    await requireAdmin();

    const todayStr = bangkokTodayStr();
    const tomorrowStr = addDaysStr(todayStr, 1);

    const thisWeekStart = startOfWeekStr(todayStr);
    const nextWeekStart = addDaysStr(thisWeekStart, 7);
    const weekAfterStart = addDaysStr(thisWeekStart, 14);

    /** Count bookings in [from, to), excluding cancelled. */
    const countRange = (from: string, to: string) =>
      prisma.booking.count({
        where: {
          date: { gte: toDateOnly(from), lt: toDateOnly(to) },
          status: { not: "CANCELLED" },
        },
      });

    const [
      todayCount,
      tomorrowCount,
      thisWeekCount,
      nextWeekCount,
      pendingCount,
      inServiceCount,
    ] = await Promise.all([
      countRange(todayStr, tomorrowStr),
      countRange(tomorrowStr, addDaysStr(tomorrowStr, 1)),
      countRange(thisWeekStart, nextWeekStart),
      countRange(nextWeekStart, weekAfterStart),
      // Pending bookings from today onward are the ones needing a phone call
      prisma.booking.count({
        where: { status: "PENDING", date: { gte: toDateOnly(todayStr) } },
      }),
      prisma.booking.count({ where: { status: "IN_SERVICE" } }),
    ]);

    const listSelect = {
      id: true,
      bookingCode: true,
      customerName: true,
      customerPhone: true,
      licensePlate: true,
      carModel: true,
      date: true,
      bookingTime: true,
      status: true,
      serviceStartedAt: true,
      bookingServices: { select: { service: { select: { name: true } } } },
    } as const;

    const [todayBookings, tomorrowBookings, inService] = await Promise.all([
      prisma.booking.findMany({
        where: { date: toDateOnly(todayStr), status: { not: "CANCELLED" } },
        select: listSelect,
        orderBy: { bookingTime: "asc" },
      }),
      prisma.booking.findMany({
        where: { date: toDateOnly(tomorrowStr), status: { not: "CANCELLED" } },
        select: listSelect,
        orderBy: { bookingTime: "asc" },
        take: 5,
      }),
      // Cars in the shop: these fall outside today's queue but still need
      // attention, sometimes for a week or more.
      prisma.booking.findMany({
        where: { status: "IN_SERVICE" },
        select: listSelect,
        orderBy: { serviceStartedAt: "asc" },
      }),
    ]);

    const present = (b: {
      id: string;
      bookingCode: string;
      customerName: string;
      customerPhone: string;
      licensePlate: string;
      carModel: string;
      date: Date;
      bookingTime: string;
      status: string;
      serviceStartedAt: Date | null;
      bookingServices: { service: { name: string } }[];
    }) => ({
      id: b.id,
      bookingCode: b.bookingCode,
      customerName: b.customerName,
      customerPhone: b.customerPhone,
      licensePlate: b.licensePlate,
      carModel: b.carModel,
      date: toDateStr(b.date),
      time: b.bookingTime,
      status: b.status,
      serviceStartedAt: b.serviceStartedAt?.toISOString() ?? null,
      services: b.bookingServices.map((bs) => bs.service.name),
    });

    return NextResponse.json({
      today: todayStr,
      counts: {
        today: todayCount,
        tomorrow: tomorrowCount,
        thisWeek: thisWeekCount,
        nextWeek: nextWeekCount,
        pending: pendingCount,
        inService: inServiceCount,
      },
      ranges: {
        today: todayStr,
        tomorrow: tomorrowStr,
        thisWeekStart,
        thisWeekEnd: addDaysStr(nextWeekStart, -1),
        nextWeekStart,
        nextWeekEnd: addDaysStr(weekAfterStart, -1),
      },
      todayBookings: todayBookings.map(present),
      tomorrowBookings: tomorrowBookings.map(present),
      inService: inService.map(present),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/dashboard] failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
