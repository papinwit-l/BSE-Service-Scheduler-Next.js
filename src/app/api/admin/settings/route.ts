import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import {
  getSettings,
  setSetting,
  SETTING_DEFAULTS,
  type SettingKey,
} from "@/lib/settings";

/** GET /api/admin/settings */
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(await getSettings());
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/settings] get failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดการตั้งค่าได้" },
      { status: 500 },
    );
  }
}

/** PATCH /api/admin/settings — body: a subset of the setting keys */
export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();
    const before = await getSettings();

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
      if (!(key in body)) continue;

      const raw = body[key];

      if (key === "require_body_no") {
        const value = !!raw;
        if (value !== before[key]) {
          await setSetting(key, value);
          changes[key] = { from: before[key], to: value };
        }
        continue;
      }

      const value = Number(raw);

      if (!Number.isInteger(value) || value < 0) {
        return NextResponse.json(
          { error: "ค่าต้องเป็นจำนวนเต็มบวก" },
          { status: 400 },
        );
      }

      // Guard rails: a 0-hour lead time means customers can book a slot
      // that starts in a minute; a 365-day window makes the schedule
      // impossible to plan.
      if (key === "booking_lead_hours" && value > 72) {
        return NextResponse.json(
          { error: "เวลาจองล่วงหน้าต้องไม่เกิน 72 ชั่วโมง" },
          { status: 400 },
        );
      }

      if (key === "booking_max_days" && (value < 1 || value > 365)) {
        return NextResponse.json(
          { error: "ระยะเวลาจองล่วงหน้าต้องอยู่ระหว่าง 1–365 วัน" },
          { status: 400 },
        );
      }

      if (value !== before[key]) {
        await setSetting(key, value);
        changes[key] = { from: before[key], to: value };
      }
    }

    if (Object.keys(changes).length > 0) {
      await logAudit({
        actor,
        action: "SETTINGS_UPDATED",
        entityType: "Setting",
        changes,
      });
    }

    return NextResponse.json(await getSettings());
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/settings] update failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกการตั้งค่าได้" },
      { status: 500 },
    );
  }
}
