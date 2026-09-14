import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

// Whitelist — never pass a raw query param into orderBy
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
  if (field === "createdAt") {
    return [{ createdAt: dir }];
  }

  // Same-day bookings must fall back to the time block, otherwise
  // morning and afternoon come back in arbitrary order.
  return [
    { date: dir },
    { timeBlock: { startTime: dir } },
    { createdAt: "asc" },
  ];
}

/** Start of today in Asia/Bangkok, expressed as a UTC Date. */
function startOfTodayBangkok(): Date {
  const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const nowBkk = new Date(Date.now() + BKK_OFFSET_MS);
  const iso = nowBkk.toISOString().slice(0, 10); // YYYY-MM-DD in BKK
  return new Date(`${iso}T00:00:00.000Z`);
}

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
    const upcoming = searchParams.get("upcoming") === "1";

    const sortField = parseSortField(searchParams.get("sortBy"));
    const sortDir = parseSortDir(searchParams.get("sortDir"));

    const pageParam = parseInt(searchParams.get("page") || "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
    const skip = (page - 1) * PAGE_SIZE;

    // Build where clause
    const where: Prisma.BookingWhereInput = {};

    if (status && status !== "ALL") {
      where.status = status;
    }

    // Date filter and "upcoming only" both constrain `date`, so they're
    // merged into one range instead of overwriting each other.
    const dateRange: Prisma.DateTimeFilter = {};

    if (date) {
      const d = new Date(`${date}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) {
        const next = new Date(d);
        next.setUTCDate(next.getUTCDate() + 1);
        dateRange.gte = d;
        dateRange.lt = next;
      }
    }

    if (upcoming) {
      const today = startOfTodayBangkok();
      // Keep the tighter of the two lower bounds.
      if (!dateRange.gte || today > (dateRange.gte as Date)) {
        dateRange.gte = today;
      }
    }

    if (Object.keys(dateRange).length > 0) {
      where.date = dateRange;
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
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      sortBy: sortField,
      sortDir,
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
