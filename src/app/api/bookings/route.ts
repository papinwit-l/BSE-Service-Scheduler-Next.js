import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bookingSchema } from "@/lib/validators";
import { generateBookingCode, generateAccessToken } from "@/lib/booking-code";
import {
  getAvailability,
  checkSlot,
  WARNING_MESSAGES,
} from "@/lib/availability";
import { getSettings } from "@/lib/settings";
import { toDateOnly } from "@/lib/date";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { isBot, isValidOrigin, sanitize } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    if (!isValidOrigin(request.headers)) {
      return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
    }

    // 5 bookings per IP per hour
    const clientIp = getClientIp(request.headers);
    const { limited, resetIn } = rateLimit(
      `booking:${clientIp}`,
      5,
      60 * 60 * 1000,
    );

    if (limited) {
      const retryAfter = Math.ceil(resetIn / 1000);
      return NextResponse.json(
        { error: `คำขอมากเกินไป กรุณารอ ${Math.ceil(retryAfter / 60)} นาที` },
        { status: 429, headers: { "Retry-After": retryAfter.toString() } },
      );
    }

    const body = await request.json();

    // Honeypot — answer like a success so the bot doesn't retry
    if (isBot(body)) {
      return NextResponse.json(
        { bookingCode: "BSE-0000-000000", id: "fake", status: "PENDING" },
        { status: 201 },
      );
    }

    const result = bookingSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      return NextResponse.json({ errors }, { status: 400 });
    }

    const data = result.data;
    const settings = await getSettings();

    const customerName = sanitize(data.customerName);
    const customerPhone = sanitize(data.customerPhone);
    const licensePlate = sanitize(data.licensePlate);
    const customerNote = data.customerNote ? sanitize(data.customerNote) : null;
    const bodyNo = data.bodyNo ? sanitize(data.bodyNo) : null;

    // "Required" lives here, not in the schema, so admin can flip it
    // in settings without a migration.
    if (settings.require_body_no && !bodyNo) {
      return NextResponse.json(
        { errors: [{ field: "bodyNo", message: "กรุณากรอกเลขตัวถัง" }] },
        { status: 400 },
      );
    }

    // ─── Car model: snapshot the name either way ───
    let carModel: string;
    let carModelId: string | null = null;

    if (data.carModelId?.trim()) {
      const model = await prisma.carModel.findFirst({
        where: { id: data.carModelId, active: true },
        select: { id: true, name: true },
      });

      if (!model) {
        return NextResponse.json(
          { errors: [{ field: "carModelId", message: "ไม่พบรุ่นรถที่เลือก" }] },
          { status: 400 },
        );
      }

      carModel = model.name;
      carModelId = model.id;
    } else {
      carModel = sanitize(data.carModelOther ?? "");

      if (!carModel) {
        return NextResponse.json(
          { errors: [{ field: "carModelOther", message: "กรุณาระบุรุ่นรถ" }] },
          { status: 400 },
        );
      }
    }

    // ─── Services must exist and be active ───
    const services = await prisma.service.findMany({
      where: { id: { in: data.serviceIds }, active: true },
      select: { id: true },
    });

    if (services.length !== data.serviceIds.length) {
      return NextResponse.json(
        { error: "บริการบางรายการไม่พร้อมให้บริการ" },
        { status: 400 },
      );
    }

    // ─── Date-level rules, for a readable error message ───
    const availability = await getAvailability({
      dateStr: data.date,
      serviceIds: data.serviceIds,
    });

    if (availability.closed || availability.noCommonSlots) {
      return NextResponse.json(
        { error: availability.reason || "ไม่สามารถจองวันนี้ได้" },
        { status: 400 },
      );
    }

    // ─── Create ───
    // The slot is re-checked under a row lock inside the transaction: the
    // seat may have gone between page load and submit.
    const booking = await prisma.$transaction(async (tx) => {
      const check = await checkSlot(tx, {
        dateStr: data.date,
        timeSlotId: data.timeSlotId,
        serviceIds: data.serviceIds,
      });

      if (!check.ok || !check.time) {
        throw new SlotUnavailable(
          check.warnings.includes("CAPACITY")
            ? "ช่วงเวลานี้เพิ่งเต็ม กรุณาเลือกเวลาอื่น"
            : WARNING_MESSAGES[check.warnings[0]] ||
                "ช่วงเวลาไม่พร้อมให้บริการ",
        );
      }

      const bookingCode = await generateBookingCode(tx);

      return tx.booking.create({
        data: {
          bookingCode,
          accessToken: generateAccessToken(),
          customerName,
          customerPhone,
          licensePlate,
          carModel,
          carModelId,
          bodyNo,
          mileage: data.mileage,
          date: toDateOnly(data.date),
          bookingTime: check.time, // snapshot
          timeSlotId: data.timeSlotId,
          customerNote,
          bookingServices: {
            create: data.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
        select: {
          id: true,
          bookingCode: true,
          accessToken: true,
          status: true,
        },
      });
    });

    return NextResponse.json(
      {
        id: booking.id,
        bookingCode: booking.bookingCode,
        accessToken: booking.accessToken,
        status: booking.status,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof SlotUnavailable) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    console.error("[bookings] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างการจองได้ กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}

class SlotUnavailable extends Error {}
