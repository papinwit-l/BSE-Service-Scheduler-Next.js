import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStatusUpdate } from "@/lib/line";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        timeBlock: true,
        bookingServices: {
          include: { service: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    if (!booking.lineUserId) {
      return NextResponse.json(
        { error: "ลูกค้ายังไม่ได้เชื่อมต่อ LINE" },
        { status: 400 }
      );
    }

    const success = await sendStatusUpdate(booking.lineUserId, {
      bookingCode: booking.bookingCode,
      status: booking.status,
      customerName: booking.customerName,
      date: booking.date.toISOString().split("T")[0],
      timeBlock: `${booking.timeBlock.label} (${booking.timeBlock.startTime}–${booking.timeBlock.endTime})`,
      services: booking.bookingServices.map((bs) => bs.service.name),
    });

    if (success) {
      return NextResponse.json({ sent: true });
    } else {
      return NextResponse.json(
        { error: "ส่งแจ้งเตือนไม่สำเร็จ" },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด" },
      { status: 500 }
    );
  }
}
