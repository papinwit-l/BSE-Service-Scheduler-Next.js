import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import {
  bangkokToday,
  isValidDateStr,
  toDateOnly,
  toDateStr,
} from "@/lib/date";

/**
 * Closing one slot on one date — staff training, a long job, a late start.
 * Whole-day closures live in ClosedDate instead.
 */

// ─── GET: upcoming closures, or one date ───

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const date = new URL(request.url).searchParams.get("date");

    const where =
      date && isValidDateStr(date)
        ? { date: toDateOnly(date) }
        : { date: { gte: bangkokToday() } };

    const closures = await prisma.slotClosure.findMany({
      where,
      orderBy: [{ date: "asc" }, { timeSlot: { time: "asc" } }],
      select: {
        id: true,
        date: true,
        reason: true,
        timeSlotId: true,
        timeSlot: { select: { time: true, period: true } },
      },
    });

    return NextResponse.json(
      closures.map((c) => ({
        id: c.id,
        date: toDateStr(c.date),
        timeSlotId: c.timeSlotId,
        time: c.timeSlot.time,
        period: c.timeSlot.period,
        reason: c.reason,
      })),
    );
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/slot-closures] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}

// ─── POST: close one or more slots on a date ───

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { date, timeSlotIds, reason } = await request.json();

    if (!isValidDateStr(date ?? "")) {
      return NextResponse.json({ error: "วันที่ไม่ถูกต้อง" }, { status: 400 });
    }

    if (!Array.isArray(timeSlotIds) || timeSlotIds.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกช่วงเวลา" },
        { status: 400 },
      );
    }

    const dateOnly = toDateOnly(date);

    // Existing bookings aren't cancelled automatically — that's a decision
    // for a human, who has to phone the customer. Report them instead.
    const affected = await prisma.booking.findMany({
      where: {
        date: dateOnly,
        timeSlotId: { in: timeSlotIds },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      select: {
        id: true,
        bookingCode: true,
        customerName: true,
        customerPhone: true,
        bookingTime: true,
      },
      orderBy: { bookingTime: "asc" },
    });

    const created = await prisma.$transaction(
      async (tx) => {
        // createMany + skipDuplicates: closing an already-closed slot is a
        // no-op rather than an error.
        const result = await tx.slotClosure.createMany({
          data: timeSlotIds.map((timeSlotId: string) => ({
            date: dateOnly,
            timeSlotId,
            reason: reason?.trim() || null,
          })),
          skipDuplicates: true,
        });

        await logAudit({
          actor,
          action: "SLOT_CLOSURE_UPDATED",
          entityType: "SlotClosure",
          entityLabel: date,
          changes: {
            closed: { from: null, to: timeSlotIds.length },
            reason: { from: null, to: reason || null },
            affectedBookings: { from: null, to: affected.length },
          },
          tx,
        });

        return result.count;
      },
      {
        // Each query crosses the internet to the database, so the round
        // trips add up. Back to the 5s default once the database is local.
        timeout: 20000,
        maxWait: 10000,
      },
    );

    return NextResponse.json({ created, affected }, { status: 201 });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/slot-closures] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถปิดช่วงเวลาได้" },
      { status: 500 },
    );
  }
}

// ─── DELETE: reopen ───

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const closure = await prisma.slotClosure.findUnique({
      where: { id },
      select: { id: true, date: true, timeSlot: { select: { time: true } } },
    });

    if (!closure) {
      return NextResponse.json({ error: "ไม่พบข้อมูล" }, { status: 404 });
    }

    await prisma.slotClosure.delete({ where: { id } });

    await logAudit({
      actor,
      action: "SLOT_CLOSURE_UPDATED",
      entityType: "SlotClosure",
      entityId: id,
      entityLabel: `${toDateStr(closure.date)} ${closure.timeSlot.time}`,
      changes: { reopened: { from: true, to: false } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/slot-closures] delete failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถเปิดช่วงเวลาได้" },
      { status: 500 },
    );
  }
}
