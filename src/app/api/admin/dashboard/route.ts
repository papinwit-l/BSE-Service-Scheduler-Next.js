import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's bookings with details
    const todayBookings = await prisma.booking.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        timeBlock: {
          select: { label: true, startTime: true, endTime: true },
        },
        bookingServices: {
          include: {
            service: { select: { name: true } },
          },
        },
      },
      orderBy: [{ timeBlock: { sortOrder: "asc" } }, { createdAt: "asc" }],
    });

    // Status counts (all time)
    const [
      totalAll,
      totalPending,
      totalConfirmed,
      totalCompleted,
      totalCancelled,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: "PENDING" } }),
      prisma.booking.count({ where: { status: "CONFIRMED" } }),
      prisma.booking.count({ where: { status: "COMPLETED" } }),
      prisma.booking.count({ where: { status: "CANCELLED" } }),
    ]);

    // Today's count
    const todayCount = todayBookings.length;
    const todayPending = todayBookings.filter(
      (b) => b.status === "PENDING",
    ).length;
    const todayConfirmed = todayBookings.filter(
      (b) => b.status === "CONFIRMED",
    ).length;

    // This week's count
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekCount = await prisma.booking.count({
      where: {
        date: { gte: weekStart, lt: weekEnd },
        status: { notIn: ["CANCELLED"] },
      },
    });

    return NextResponse.json({
      stats: {
        today: {
          total: todayCount,
          pending: todayPending,
          confirmed: todayConfirmed,
        },
        week: weekCount,
        all: {
          total: totalAll,
          pending: totalPending,
          confirmed: totalConfirmed,
          completed: totalCompleted,
          cancelled: totalCancelled,
        },
      },
      todayBookings: todayBookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        licensePlate: b.licensePlate,
        status: b.status,
        timeBlock: {
          label: b.timeBlock.label,
          time: `${b.timeBlock.startTime}–${b.timeBlock.endTime}`,
        },
        services: b.bookingServices.map((bs) => bs.service.name),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
