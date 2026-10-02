import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { addDaysStr, bangkokTodayStr } from "@/lib/date";

/**
 * GET /api/booking-config
 *
 * Public booking rules the form needs so the client can enforce the same
 * limits the API does — otherwise the calendar offers dates the server
 * then rejects.
 */
export async function GET() {
  try {
    const settings = await getSettings();
    const today = bangkokTodayStr();

    return NextResponse.json({
      leadHours: settings.booking_lead_hours,
      maxDays: settings.booking_max_days,
      requireBodyNo: settings.require_body_no,
      today,
      maxDate: addDaysStr(today, settings.booking_max_days),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดการตั้งค่าได้" },
      { status: 500 },
    );
  }
}
