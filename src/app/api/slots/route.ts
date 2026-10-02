import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/availability";

/**
 * GET /api/slots?date=2026-10-15&services=id1,id2
 *
 * Public: returns only slots the customer can actually book.
 * The slot list depends on the selected services, so the client must
 * re-fetch whenever the service selection changes.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get("date");

    if (!dateStr) {
      return NextResponse.json({ error: "กรุณาระบุวันที่" }, { status: 400 });
    }

    const serviceIds =
      searchParams.get("services")?.split(",").filter(Boolean) ?? [];

    const result = await getAvailability({ dateStr, serviceIds });

    return NextResponse.json({
      closed: result.closed,
      reason: result.reason ?? null,
      noCommonSlots: result.noCommonSlots ?? false,
      slots: result.slots.map((s) => ({
        id: s.id,
        time: s.time,
        period: s.period,
        remaining: Math.max(0, s.capacity - s.booked),
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดช่วงเวลาได้" },
      { status: 500 },
    );
  }
}
