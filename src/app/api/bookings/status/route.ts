import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusLookupSchema } from "@/lib/validators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Booking codes are sequential (BSE-2026-000042) and therefore guessable,
 * so a code alone never returns customer data.
 *
 *   GET  ?token=…            — the secret link sent to the customer
 *   POST { code, phone }     — manual lookup, both must match
 */

const SELECT = {
  bookingCode: true,
  customerName: true,
  licensePlate: true,
  carModel: true,
  mileage: true,
  date: true,
  bookingTime: true,
  status: true,
  lineUserId: true,
  customerNote: true,
  serviceStartedAt: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  timeSlot: { select: { period: true } },
  bookingServices: { select: { service: { select: { name: true } } } },
} as const;

type BookingRow = {
  bookingCode: string;
  customerName: string;
  licensePlate: string;
  carModel: string;
  mileage: number;
  date: Date;
  bookingTime: string;
  status: string;
  lineUserId: string | null;
  customerNote: string | null;
  serviceStartedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  timeSlot: { period: string };
  bookingServices: { service: { name: string } }[];
};

function present(booking: BookingRow) {
  return {
    bookingCode: booking.bookingCode,
    customerName: booking.customerName,
    licensePlate: booking.licensePlate,
    carModel: booking.carModel,
    mileage: booking.mileage,
    date: booking.date.toISOString().split("T")[0],
    time: booking.bookingTime,
    period: booking.timeSlot.period,
    status: booking.status,
    lineLinked: !!booking.lineUserId,
    customerNote: booking.customerNote,
    serviceStartedAt: booking.serviceStartedAt?.toISOString() ?? null,
    completedAt: booking.completedAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
    services: booking.bookingServices.map((bs) => bs.service.name),
  };
}

// Deliberately identical for "no such code" and "wrong phone", so the
// endpoint can't be used to discover which booking codes exist.
const NOT_FOUND = "ไม่พบข้อมูลการจอง กรุณาตรวจสอบรหัสจองและเบอร์โทรอีกครั้ง";

/** GET /api/bookings/status?token=… */
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim();

    if (!token) {
      return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });
    }

    const ip = getClientIp(request.headers);
    const { limited } = rateLimit(`status-token:${ip}`, 60, 15 * 60 * 1000);

    if (limited) {
      return NextResponse.json(
        { error: "คำขอมากเกินไป กรุณารอสักครู่" },
        { status: 429 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { accessToken: token },
      select: SELECT,
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบข้อมูลการจอง" }, { status: 404 });
    }

    return NextResponse.json(present(booking));
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}

/** POST /api/bookings/status — body: { code, phone } */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const { limited, resetIn } = rateLimit(
      `status-lookup:${ip}`,
      10,
      15 * 60 * 1000,
    );

    if (limited) {
      return NextResponse.json(
        { error: `คำขอมากเกินไป กรุณารอ ${Math.ceil(resetIn / 60000)} นาที` },
        { status: 429 },
      );
    }

    const parsed = statusLookupSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "ข้อมูลไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const code = parsed.data.code.toUpperCase().trim();
    const phone = parsed.data.phone.trim();

    const booking = await prisma.booking.findUnique({
      where: { bookingCode: code },
      select: { ...SELECT, customerPhone: true },
    });

    if (!booking || booking.customerPhone !== phone) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    return NextResponse.json(present(booking));
  } catch {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 },
    );
  }
}
