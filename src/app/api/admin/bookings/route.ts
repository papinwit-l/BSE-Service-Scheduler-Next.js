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
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.date = { gte: d, lt: next };
    }

    if (search) {
      where.OR = [
        { bookingCode: { contains: search.toUpperCase() } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { licensePlate: { contains: search } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
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
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingCode: b.bookingCode,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        licensePlate: b.licensePlate,
        date: b.date.toISOString().split("T")[0],
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        timeBlock: {
          label: b.timeBlock.label,
          time: `${b.timeBlock.startTime}–${b.timeBlock.endTime}`,
        },
        services: b.bookingServices.map((bs) => bs.service.name),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 }
    );
  }
}
