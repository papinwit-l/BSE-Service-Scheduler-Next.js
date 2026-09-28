import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";
import { sendNotification } from "@/lib/line";
import { toDateStr } from "@/lib/date";

/**
 * POST /api/admin/bookings/[id]/notify
 * Body: { trigger?: "REMINDER" | ... } — defaults to the current status.
 *
 * Resends a notification by hand, e.g. when the customer says they never
 * got it. Normal status changes send from the PATCH route instead.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const trigger: string = body.trigger || "";

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingServices: { include: { service: { select: { name: true } } } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    if (!booking.lineUserId) {
      return NextResponse.json(
        { error: "ลูกค้ายังไม่ได้เชื่อมต่อ LINE" },
        { status: 400 },
      );
    }

    const resolvedTrigger = trigger || booking.status;

    const sent = await sendNotification(booking.lineUserId, resolvedTrigger, {
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      date: toDateStr(booking.date),
      time: booking.bookingTime,
      services: booking.bookingServices.map((bs) => bs.service.name),
    });

    await logAudit({
      actor,
      action: sent ? "NOTIFICATION_SENT" : "NOTIFICATION_FAILED",
      entityType: "Booking",
      entityId: booking.id,
      entityLabel: booking.bookingCode,
      changes: { trigger: resolvedTrigger, manual: true },
    });

    if (!sent) {
      return NextResponse.json(
        { error: "ส่งแจ้งเตือนไม่สำเร็จ (ตรวจสอบว่าเทมเพลตเปิดใช้งานอยู่)" },
        { status: 500 },
      );
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/bookings/:id/notify] failed", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
  }
}
