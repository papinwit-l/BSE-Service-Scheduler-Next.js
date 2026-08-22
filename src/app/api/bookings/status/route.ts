import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.toUpperCase().trim();

    if (!code) {
      return NextResponse.json({ error: "กรุณากรอกรหัสจอง" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { bookingCode: code },
      select: {
        bookingCode: true,
        customerName: true,
        licensePlate: true,
        date: true,
        status: true,
        lineUserId: true,
        createdAt: true,
        updatedAt: true,
        timeBlock: {
          select: {
            label: true,
            startTime: true,
            endTime: true,
          },
        },
        bookingServices: {
          select: {
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "ไม่พบรหัสจองนี้ กรุณาตรวจสอบอีกครั้ง" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      licensePlate: booking.licensePlate,
      date: booking.date.toISOString().split("T")[0],
      status: booking.status,
      lineLinked: !!booking.lineUserId,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      timeBlock: {
        label: booking.timeBlock.label,
        time: `${booking.timeBlock.startTime}–${booking.timeBlock.endTime}`,
      },
      services: booking.bookingServices.map((bs) => bs.service.name),
    });
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
