import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendStatusUpdate } from "@/lib/line";

export async function GET(
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
          include: {
            service: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "ไม่พบรายการจอง" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      licensePlate: booking.licensePlate,
      date: booking.date.toISOString().split("T")[0],
      status: booking.status,
      lineUserId: booking.lineUserId,
      notes: booking.notes,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      timeBlock: {
        label: booking.timeBlock.label,
        time: `${booking.timeBlock.startTime}–${booking.timeBlock.endTime}`,
      },
      services: booking.bookingServices.map((bs) => ({
        id: bs.service.id,
        name: bs.service.name,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "สถานะไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.update({
      where: { id },
      data: { status },
      include: {
        bookingServices: {
          include: { service: true },
        },
      },
    });

    // Send LINE notification if user has linked LINE
    let lineNotified = false;
    if (booking.lineUserId) {
      lineNotified = await sendStatusUpdate(booking.lineUserId, {
        bookingCode: booking.bookingCode,
        status: booking.status,
        services: booking.bookingServices.map((bs) => bs.service.name),
      });
    }

    return NextResponse.json({
      status: booking.status,
      lineNotified,
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตสถานะได้" },
      { status: 500 }
    );
  }
}
