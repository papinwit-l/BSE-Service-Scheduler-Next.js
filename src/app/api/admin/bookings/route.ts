//api/admin/bookings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import {
  checkSlot,
  WARNING_MESSAGES,
  type SlotWarning,
} from "@/lib/availability";
import { generateBookingCode, generateAccessToken } from "@/lib/booking-code";
import { bangkokToday, toDateOnly, isValidDateStr } from "@/lib/date";
import { sanitize } from "@/lib/security";

const PAGE_SIZE = 20;

const SORT_FIELDS = ["date", "createdAt"] as const;
type SortField = (typeof SORT_FIELDS)[number];

function parseSortField(value: string | null): SortField {
  return SORT_FIELDS.includes(value as SortField)
    ? (value as SortField)
    : "date";
}

function parseSortDir(value: string | null): Prisma.SortOrder {
  return value === "desc" ? "desc" : "asc";
}

function buildOrderBy(
  field: SortField,
  dir: Prisma.SortOrder,
): Prisma.BookingOrderByWithRelationInput[] {
  if (field === "createdAt") return [{ createdAt: dir }];

  // bookingTime is zero-padded ("09:30"), so string order is time order —
  // no join to the slot table needed.
  return [{ date: dir }, { bookingTime: dir }, { createdAt: "asc" }];
}

// ─── GET: list ───

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const date = searchParams.get("date");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const upcoming = searchParams.get("upcoming") === "1";

    const sortField = parseSortField(searchParams.get("sortBy"));
    const sortDir = parseSortDir(searchParams.get("sortDir"));

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const skip = (page - 1) * PAGE_SIZE;

    const where: Prisma.BookingWhereInput = {};

    if (status && status !== "ALL") {
      if (Object.values(BookingStatus).includes(status as BookingStatus)) {
        where.status = status as BookingStatus;
      }
    }

    // The date filter and "upcoming only" both constrain `date`, so they
    // are merged rather than overwriting each other.
    const dateRange: Prisma.DateTimeFilter = {};

    if (date && isValidDateStr(date)) {
      // A single day
      const d = toDateOnly(date);
      const next = new Date(d);
      next.setUTCDate(next.getUTCDate() + 1);
      dateRange.gte = d;
      dateRange.lt = next;
    } else {
      // An inclusive range — used by the dashboard's week cards
      if (from && isValidDateStr(from)) dateRange.gte = toDateOnly(from);
      if (to && isValidDateStr(to)) {
        const t = toDateOnly(to);
        t.setUTCDate(t.getUTCDate() + 1);
        dateRange.lt = t;
      }
    }

    if (upcoming) {
      const today = bangkokToday();
      if (!dateRange.gte || today > (dateRange.gte as Date)) {
        dateRange.gte = today;
      }
    }

    if (Object.keys(dateRange).length > 0) where.date = dateRange;

    if (search) {
      where.OR = [
        { bookingCode: { contains: search.toUpperCase() } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { licensePlate: { contains: search } },
        { carModel: { contains: search } },
      ];
    }

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          timeSlot: { select: { period: true } },
          bookingServices: { include: { service: { select: { name: true } } } },
        },
        orderBy: buildOrderBy(sortField, sortDir),
        skip,
        take: PAGE_SIZE,
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
        carModel: b.carModel,
        date: b.date.toISOString().split("T")[0],
        time: b.bookingTime,
        period: b.timeSlot.period,
        status: b.status,
        createdAt: b.createdAt.toISOString(),
        serviceStartedAt: b.serviceStartedAt?.toISOString() ?? null,
        services: b.bookingServices.map((bs) => bs.service.name),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      sortBy: sortField,
      sortDir,
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/bookings] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}

// ─── POST: admin creates a booking (phone or walk-in) ───

class OverrideRequired extends Error {
  constructor(public warnings: SlotWarning[]) {
    super("override required");
  }
}
class SlotClosed extends Error {}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();

    const {
      customerName,
      customerPhone,
      licensePlate,
      carModelId,
      carModelOther,
      bodyNo,
      mileage,
      date,
      timeSlotId,
      serviceIds,
      customerNote,
      adminNote,
      status = "PENDING",
      confirmOverride = false,
    } = body;

    if (
      !customerName?.trim() ||
      !customerPhone?.trim() ||
      !licensePlate?.trim()
    ) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อ เบอร์โทร และทะเบียนรถ" },
        { status: 400 },
      );
    }

    if (!isValidDateStr(date) || !timeSlotId) {
      return NextResponse.json(
        { error: "กรุณาเลือกวันและเวลา" },
        { status: 400 },
      );
    }

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกบริการอย่างน้อย 1 รายการ" },
        { status: 400 },
      );
    }

    if (!Object.values(BookingStatus).includes(status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }

    // Car model: snapshot the name either way
    let carModel: string;
    let resolvedModelId: string | null = null;

    if (carModelId) {
      const model = await prisma.carModel.findUnique({
        where: { id: carModelId },
        select: { id: true, name: true },
      });

      if (!model) {
        return NextResponse.json({ error: "ไม่พบรุ่นรถ" }, { status: 400 });
      }

      carModel = model.name;
      resolvedModelId = model.id;
    } else {
      carModel = sanitize(carModelOther ?? "");
      if (!carModel) {
        return NextResponse.json({ error: "กรุณาระบุรุ่นรถ" }, { status: 400 });
      }
    }

    const booking = await prisma.$transaction(async (tx) => {
      const check = await checkSlot(tx, {
        dateStr: date,
        timeSlotId,
        serviceIds,
      });

      if (!check.time || check.warnings.includes("SLOT_CLOSED")) {
        throw new SlotClosed();
      }

      // Admins may override capacity and service restrictions, but only
      // after confirming. Lead time doesn't apply to admin-made bookings.
      const blocking = check.warnings.filter((w) => w !== "LEAD_TIME");

      if (blocking.length > 0 && !confirmOverride) {
        throw new OverrideRequired(blocking);
      }

      const created = await tx.booking.create({
        data: {
          bookingCode: await generateBookingCode(tx),
          accessToken: generateAccessToken(),
          customerName: sanitize(customerName),
          customerPhone: sanitize(customerPhone),
          licensePlate: sanitize(licensePlate),
          carModel,
          carModelId: resolvedModelId,
          bodyNo: bodyNo ? sanitize(bodyNo) : null,
          mileage: Number(mileage) || 0,
          date: toDateOnly(date),
          bookingTime: check.time,
          timeSlotId,
          status,
          customerNote: customerNote ? sanitize(customerNote) : null,
          adminNote: adminNote ? sanitize(adminNote) : null,
          createdByAdminId: actor.id,
          bookingServices: {
            create: serviceIds.map((serviceId: string) => ({ serviceId })),
          },
        },
        select: { id: true, bookingCode: true },
      });

      await logAudit({
        actor,
        action: "BOOKING_CREATED",
        entityType: "Booking",
        entityId: created.id,
        entityLabel: created.bookingCode,
        changes: {
          date,
          time: check.time,
          status,
          ...(blocking.length > 0 ? { overrides: blocking } : {}),
        },
        tx,
      });

      return created;
    });

    return NextResponse.json(
      { id: booking.id, bookingCode: booking.bookingCode },
      { status: 201 },
    );
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    if (err instanceof OverrideRequired) {
      return NextResponse.json(
        {
          code: "OVERRIDE_REQUIRED",
          warnings: err.warnings,
          messages: err.warnings.map((w) => WARNING_MESSAGES[w]),
        },
        { status: 409 },
      );
    }

    if (err instanceof SlotClosed) {
      return NextResponse.json(
        { error: "ช่วงเวลานี้ปิดให้บริการ" },
        { status: 400 },
      );
    }

    console.error("[admin/bookings] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างการจองได้" },
      { status: 500 },
    );
  }
}
