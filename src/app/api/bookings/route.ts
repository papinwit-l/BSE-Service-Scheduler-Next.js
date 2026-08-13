import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validators";
import { generateBookingCode } from "@/lib/booking-code";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isBot, isValidOrigin, sanitize } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    // ─── Security: Origin validation ───
    if (!isValidOrigin(request.headers)) {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
    }

    // ─── Security: Rate limiting (5 bookings per IP per hour) ───
    const clientIp = getClientIp(request.headers);
    const { limited, remaining, resetIn } = rateLimit(
      `booking:${clientIp}`,
      5,
      60 * 60 * 1000, // 1 hour
    );

    if (limited) {
      const retryAfter = Math.ceil(resetIn / 1000);
      return NextResponse.json(
        { error: `คำขอมากเกินไป กรุณารอ ${Math.ceil(retryAfter / 60)} นาที` },
        {
          status: 429,
          headers: { "Retry-After": retryAfter.toString() },
        },
      );
    }

    const body = await request.json();

    // ─── Security: Honeypot check ───
    if (isBot(body)) {
      // Return fake success to not tip off the bot
      return NextResponse.json(
        { bookingCode: "BK-000000", id: "fake", status: "PENDING" },
        { status: 201 },
      );
    }

    // Validate input
    const result = bookingSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json({ errors }, { status: 400 });
    }

    const {
      customerName: rawName,
      customerPhone: rawPhone,
      licensePlate: rawPlate,
      date,
      timeBlockId,
      serviceIds,
      notes: rawNotes,
    } = result.data;

    // ─── Security: Sanitize user input ───
    const customerName = sanitize(rawName);
    const customerPhone = sanitize(rawPhone);
    const licensePlate = sanitize(rawPlate);
    const notes = rawNotes ? sanitize(rawNotes) : undefined;

    const bookingDate = new Date(date);

    // Verify the date is not closed
    const dayOfWeek = bookingDate.getDay();
    const dayConfig = await prisma.dayConfig.findUnique({
      where: { dayOfWeek },
    });

    if (dayConfig?.isClosed) {
      return NextResponse.json(
        { error: "วันที่เลือกเป็นวันหยุด" },
        { status: 400 },
      );
    }

    const closedDate = await prisma.closedDate.findUnique({
      where: { date: bookingDate },
    });

    if (closedDate) {
      return NextResponse.json(
        { error: `วันที่เลือกเป็นวันหยุด: ${closedDate.reason || ""}` },
        { status: 400 },
      );
    }

    // Verify slot availability
    const timeBlock = await prisma.timeBlock.findUnique({
      where: { id: timeBlockId },
    });

    if (!timeBlock || !timeBlock.active) {
      return NextResponse.json(
        { error: "ช่วงเวลาที่เลือกไม่พร้อมให้บริการ" },
        { status: 400 },
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
        { status: 400 },
      );
    }

    // Verify services exist
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, active: true },
    });

    if (services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "บริการบางรายการไม่พร้อมให้บริการ" },
        { status: 400 },
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
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถสร้างการจองได้ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
