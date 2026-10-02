import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { bangkokToday } from "@/lib/date";

/** Slots run on fixed 30-minute shifts. */
const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

// ─── GET: every slot, with how many services restrict to it ───

export async function GET() {
  try {
    await requireAdmin();

    const slots = await prisma.timeSlot.findMany({
      orderBy: { time: "asc" }, // zero-padded, so string order is time order
      select: {
        id: true,
        time: true,
        period: true,
        capacity: true,
        active: true,
        _count: { select: { bookings: true, serviceTimeSlots: true } },
      },
    });

    // Slots with future bookings can't be deleted — only deactivated.
    const today = bangkokToday();
    const futureCounts = await prisma.booking.groupBy({
      by: ["timeSlotId"],
      where: { date: { gte: today }, status: { not: "CANCELLED" } },
      _count: { _all: true },
    });

    const futureMap = new Map(
      futureCounts.map((f) => [f.timeSlotId, f._count._all]),
    );

    return NextResponse.json(
      slots.map((s) => ({
        id: s.id,
        time: s.time,
        period: s.period,
        capacity: s.capacity,
        active: s.active,
        totalBookings: s._count.bookings,
        futureBookings: futureMap.get(s.id) ?? 0,
        restrictedServices: s._count.serviceTimeSlots,
      })),
    );
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/time-slots] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดช่วงเวลาได้" },
      { status: 500 },
    );
  }
}

// ─── POST: add a slot ───

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { time, period, capacity } = await request.json();

    if (!TIME_PATTERN.test(time ?? "")) {
      return NextResponse.json(
        { error: "เวลาต้องเป็นช่วง 30 นาที เช่น 09:00 หรือ 09:30" },
        { status: 400 },
      );
    }

    if (period !== "MORNING" && period !== "AFTERNOON") {
      return NextResponse.json({ error: "กรุณาเลือกช่วง" }, { status: 400 });
    }

    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 50) {
      return NextResponse.json(
        { error: "จำนวนคิวต้องอยู่ระหว่าง 1–50" },
        { status: 400 },
      );
    }

    const existing = await prisma.timeSlot.findUnique({ where: { time } });
    if (existing) {
      return NextResponse.json({ error: "มีเวลานี้อยู่แล้ว" }, { status: 409 });
    }

    const slot = await prisma.timeSlot.create({
      data: { time, period, capacity: cap },
    });

    await logAudit({
      actor,
      action: "SLOT_UPDATED",
      entityType: "TimeSlot",
      entityId: slot.id,
      entityLabel: slot.time,
      changes: { created: { from: null, to: { time, period, capacity: cap } } },
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/time-slots] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถเพิ่มช่วงเวลาได้" },
      { status: 500 },
    );
  }
}

// ─── PATCH: capacity, period, active ───
// `time` is immutable: existing bookings snapshot it, and changing it would
// make the schedule disagree with what customers were told.

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { id, capacity, period, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.timeSlot.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบช่วงเวลา" }, { status: 404 });
    }

    const data: {
      capacity?: number;
      period?: "MORNING" | "AFTERNOON";
      active?: boolean;
    } = {};

    if (capacity !== undefined) {
      const cap = Number(capacity);
      if (!Number.isInteger(cap) || cap < 1 || cap > 50) {
        return NextResponse.json(
          { error: "จำนวนคิวต้องอยู่ระหว่าง 1–50" },
          { status: 400 },
        );
      }
      data.capacity = cap;
    }

    if (period !== undefined) {
      if (period !== "MORNING" && period !== "AFTERNOON") {
        return NextResponse.json({ error: "ช่วงไม่ถูกต้อง" }, { status: 400 });
      }
      data.period = period;
    }

    if (active !== undefined) data.active = !!active;

    const slot = await prisma.timeSlot.update({ where: { id }, data });

    await logAudit({
      actor,
      action: "SLOT_UPDATED",
      entityType: "TimeSlot",
      entityId: id,
      entityLabel: existing.time,
      changes: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          { from: existing[k as keyof typeof existing], to: v },
        ]),
      ),
    });

    return NextResponse.json(slot);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/time-slots] update failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขช่วงเวลาได้" },
      { status: 500 },
    );
  }
}

// ─── DELETE: only when nothing points at it ───

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const slot = await prisma.timeSlot.findUnique({
      where: { id },
      select: { id: true, time: true, _count: { select: { bookings: true } } },
    });

    if (!slot) {
      return NextResponse.json({ error: "ไม่พบช่วงเวลา" }, { status: 404 });
    }

    // Bookings reference the slot (onDelete: Restrict), and their history
    // must stay readable. Deactivate instead — it disappears from booking
    // forms while past bookings keep their link.
    if (slot._count.bookings > 0) {
      return NextResponse.json(
        {
          error: `ช่วงเวลานี้มีการจอง ${slot._count.bookings} รายการ ไม่สามารถลบได้ — ปิดใช้งานแทน`,
        },
        { status: 409 },
      );
    }

    await prisma.timeSlot.delete({ where: { id } });

    await logAudit({
      actor,
      action: "SLOT_UPDATED",
      entityType: "TimeSlot",
      entityId: id,
      entityLabel: slot.time,
      changes: { deleted: { from: slot.time, to: null } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/time-slots] delete failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบช่วงเวลาได้" },
      { status: 500 },
    );
  }
}
