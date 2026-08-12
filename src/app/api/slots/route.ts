import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json(
        { error: "กรุณาระบุวันที่" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    // Check if this day is closed (weekly config)
    const dayConfig = await prisma.dayConfig.findUnique({
      where: { dayOfWeek },
    });

    if (dayConfig?.isClosed) {
      return NextResponse.json({ closed: true, reason: "วันหยุดประจำสัปดาห์", slots: [] });
    }

    // Check if this specific date is closed (holidays)
    const closedDate = await prisma.closedDate.findUnique({
      where: { date },
    });

    if (closedDate) {
      return NextResponse.json({
        closed: true,
        reason: closedDate.reason || "วันหยุด",
        slots: [],
      });
    }

    // Get active time blocks with booking count for this date
    const timeBlocks = await prisma.timeBlock.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        label: true,
        startTime: true,
        endTime: true,
        maxBookings: true,
        _count: {
          select: {
            bookings: {
              where: {
                date,
                status: { notIn: ["CANCELLED"] },
              },
            },
          },
        },
      },
    });

    const slots = timeBlocks.map((block) => ({
      id: block.id,
      label: block.label,
      startTime: block.startTime,
      endTime: block.endTime,
      maxBookings: block.maxBookings,
      currentBookings: block._count.bookings,
      available: block._count.bookings < block.maxBookings,
    }));

    return NextResponse.json({ closed: false, slots });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดช่วงเวลาได้" },
      { status: 500 }
    );
  }
}
