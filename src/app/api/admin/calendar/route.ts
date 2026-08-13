import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM

    const now = new Date();
    const start = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Get all bookings for the month (non-cancelled)
    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: start, lte: end },
        status: { notIn: ["CANCELLED"] },
      },
      select: {
        date: true,
        timeBlockId: true,
        status: true,
      },
    });

    // Get time blocks
    const timeBlocks = await prisma.timeBlock.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        label: true,
        startTime: true,
        endTime: true,
        maxBookings: true,
      },
    });

    // Get closed days + closed dates
    const dayConfigs = await prisma.dayConfig.findMany({
      where: { isClosed: true },
      select: { dayOfWeek: true },
    });

    const closedDates = await prisma.closedDate.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      select: { date: true, reason: true },
    });

    // Build day map: { "2026-08-13": { blockId: count } }
    const dayMap: Record<string, Record<string, number>> = {};
    for (const b of bookings) {
      const dateStr = b.date.toISOString().split("T")[0];
      if (!dayMap[dateStr]) dayMap[dateStr] = {};
      dayMap[dateStr][b.timeBlockId] =
        (dayMap[dateStr][b.timeBlockId] || 0) + 1;
    }

    return NextResponse.json({
      timeBlocks,
      closedDays: dayConfigs.map((d) => d.dayOfWeek),
      closedDates: closedDates.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        reason: d.reason,
      })),
      bookingsByDay: dayMap,
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
