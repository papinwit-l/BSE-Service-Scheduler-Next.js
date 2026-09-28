import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";
import { requireAdmin, authErrorResponse } from "@/lib/guards";

/**
 * GET /api/admin/slots?date=2026-10-15&services=id1,id2&exclude=bookingId
 *
 * Unlike the public /api/slots, this returns EVERY slot with its warnings
 * attached, so admin can see a full slot and choose to overbook it.
 * `exclude` leaves a booking's own seat out of the count when editing it.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "กรุณาระบุวันที่" }, { status: 400 });
    }

    const serviceIds =
      searchParams.get("services")?.split(",").filter(Boolean) ?? [];
    const excludeBookingId = searchParams.get("exclude") ?? undefined;

    const result = await getAvailability({
      dateStr,
      serviceIds,
      asAdmin: true,
      excludeBookingId,
    });

    return NextResponse.json({
      closed: result.closed,
      reason: result.reason ?? null,
      slots: result.slots.map((s) => ({
        id: s.id,
        time: s.time,
        period: s.period,
        capacity: s.capacity,
        booked: s.booked,
        remaining: Math.max(0, s.capacity - s.booked),
        available: s.available,
        warnings: s.warnings,
      })),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/slots] failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดช่วงเวลาได้" },
      { status: 500 },
    );
  }
}
