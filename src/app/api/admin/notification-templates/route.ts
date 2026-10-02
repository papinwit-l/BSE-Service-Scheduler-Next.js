import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit, diff } from "@/lib/audit";

/**
 * LINE message templates, one per trigger.
 *
 * Placeholders: {bookingCode} {customerName} {date} {time} {services}
 */

export const TRIGGERS = [
  { key: "CONFIRMED", label: "ยืนยันการจอง" },
  { key: "IN_SERVICE", label: "อยู่ระหว่างรับบริการ" },
  { key: "RESCHEDULED", label: "เปลี่ยนวัน/เวลา" },
  { key: "COMPLETED", label: "เสร็จสิ้น" },
  { key: "CANCELLED", label: "ยกเลิก" },
  { key: "REMINDER", label: "แจ้งเตือนล่วงหน้า 1 วัน" },
] as const;

const ORDER = new Map(TRIGGERS.map((t, i) => [t.key, i]));

export async function GET() {
  try {
    await requireAdmin();

    const templates = await prisma.notificationTemplate.findMany();

    // Sort by the order messages actually occur in, not alphabetically.
    templates.sort(
      (a, b) =>
        (ORDER.get(a.trigger as never) ?? 99) -
        (ORDER.get(b.trigger as never) ?? 99),
    );

    const existing = new Set(templates.map((t) => t.trigger));

    return NextResponse.json({
      templates,
      // Triggers with no row yet — the UI offers to create them rather
      // than silently sending nothing.
      missing: TRIGGERS.filter((t) => !existing.has(t.key)).map((t) => ({
        trigger: t.key,
        label: t.label,
      })),
      labels: Object.fromEntries(TRIGGERS.map((t) => [t.key, t.label])),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/notification-templates] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อความได้" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { trigger, template } = await request.json();

    if (!TRIGGERS.some((t) => t.key === trigger)) {
      return NextResponse.json(
        { error: "Trigger ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (!template?.trim()) {
      return NextResponse.json({ error: "กรุณากรอกข้อความ" }, { status: 400 });
    }

    const created = await prisma.notificationTemplate.create({
      data: { trigger, template: template.trim(), active: true },
    });

    await logAudit({
      actor,
      action: "TEMPLATE_UPDATED",
      entityType: "NotificationTemplate",
      entityId: created.id,
      entityLabel: trigger,
      changes: { created: { from: null, to: trigger } },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/notification-templates] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างข้อความได้" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { id, template, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.notificationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบข้อความ" }, { status: 404 });
    }

    const data: { template?: string; active?: boolean } = {};

    if (template !== undefined) {
      if (!template.trim()) {
        return NextResponse.json(
          { error: "ข้อความว่างไม่ได้" },
          { status: 400 },
        );
      }
      data.template = template;
    }

    if (active !== undefined) data.active = !!active;

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data,
    });

    await logAudit({
      actor,
      action: "TEMPLATE_UPDATED",
      entityType: "NotificationTemplate",
      entityId: id,
      entityLabel: existing.trigger,
      // The message body can be long; record that it changed, not the text.
      changes: {
        ...diff({ active: existing.active }, { active: updated.active }),
        ...(data.template && data.template !== existing.template
          ? { template: { from: "(เดิม)", to: "(แก้ไขแล้ว)" } }
          : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/notification-templates] update failed", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกได้" }, { status: 500 });
  }
}
