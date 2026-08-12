import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validators";
import { generateBookingCode } from "@/lib/booking-code";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const result = bookingSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json({ errors }, { status: 400 });
    }

    const { customerName, customerPhone, licensePlate, date, timeBlockId, serviceIds, notes } =
      result.data;

    const bookingDate = new Date(date);

    // Verify the date is not closed
    const dayOfWeek = bookingDate.getDay();
    const dayConfig = await prisma.dayConfig.findUnique({
      where: { dayOfWeek },
    });

    if (dayConfig?.isClosed) {
      return NextResponse.json(
        { error: "วันที่เลือกเป็นวันหยุด" },
        { status: 400 }
      );
    }

    const closedDate = await prisma.closedDate.findUnique({
      where: { date: bookingDate },
    });

    if (closedDate) {
      return NextResponse.json(
        { error: `วันที่เลือกเป็นวันหยุด: ${closedDate.reason || ""}` },
        { status: 400 }
      );
    }

    // Verify slot availability
    const timeBlock = await prisma.timeBlock.findUnique({
      where: { id: timeBlockId },
    });

    if (!timeBlock || !timeBlock.active) {
      return NextResponse.json(
        { error: "ช่วงเวลาที่เลือกไม่พร้อมให้บริการ" },
        { status: 400 }
      );
    }

    const currentBookings = await prisma.booking.count({
      where: {
        date: bookingDate,
        timeBlockId,
        status: { notIn: ["CANCELLED"] },
      },
    });

    if (currentBookings >= timeBlock.maxBookings) {
      return NextResponse.json(
        { error: "ช่วงเวลาที่เลือกเต็มแล้ว" },
        { status: 400 }
      );
    }

    // Verify services exist
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "บริการบางรายการไม่พร้อมให้บริการ" },
        { status: 400 }
      );
    }

    // Generate unique booking code with retry
    let bookingCode = generateBookingCode();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await prisma.booking.findUnique({
        where: { bookingCode },
      });
      if (!exists) break;
      bookingCode = generateBookingCode();
      attempts++;
    }

    // Create booking with services
    const booking = await prisma.booking.create({
      data: {
        bookingCode,
        customerName,
        customerPhone,
        licensePlate,
        date: bookingDate,
        timeBlockId,
        notes: notes || null,
        bookingServices: {
          create: serviceIds.map((serviceId) => ({ serviceId })),
        },
      },
      include: {
        timeBlock: true,
        bookingServices: {
          include: { service: true },
        },
      },
    });

    return NextResponse.json(
      {
        bookingCode: booking.bookingCode,
        id: booking.id,
        status: booking.status,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถสร้างการจองได้ กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}
