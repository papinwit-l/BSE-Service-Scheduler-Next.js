import { NextRequest, NextResponse } from "next/server";
import { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse, can } from "@/lib/guards";
import { logAudit, diff } from "@/lib/audit";
import {
  checkSlot,
  WARNING_MESSAGES,
  type SlotWarning,
} from "@/lib/availability";
import { toDateOnly, toDateStr, isValidDateStr } from "@/lib/date";
import { sanitize } from "@/lib/security";
import { sendNotification, type NotifyTrigger } from "@/lib/line";

const CLOSED_STATUSES: BookingStatus[] = ["COMPLETED", "CANCELLED"];

class OverrideRequired extends Error {
  constructor(public warnings: SlotWarning[]) {
    super("override required");
  }
}
class SlotClosed extends Error {}
class Stale extends Error {}

// ─── GET ───

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlot: { select: { id: true, time: true, period: true } },
        carModelRef: { select: { id: true, name: true } },
        createdByAdmin: { select: { name: true } },
        bookingServices: { include: { service: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    return NextResponse.json({
      id: booking.id,
      bookingCode: booking.bookingCode,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      licensePlate: booking.licensePlate,
      carModel: booking.carModel,
      carModelId: booking.carModelId,
      bodyNo: booking.bodyNo,
      mileage: booking.mileage,
      date: toDateStr(booking.date),
      time: booking.bookingTime,
      timeSlotId: booking.timeSlotId,
      period: booking.timeSlot.period,
      status: booking.status,
      lineUserId: booking.lineUserId,
      lineLinked: !!booking.lineUserId,
      customerNote: booking.customerNote,
      adminNote: booking.adminNote,
      serviceStartedAt: booking.serviceStartedAt?.toISOString() ?? null,
      completedAt: booking.completedAt?.toISOString() ?? null,
      createdByAdmin: booking.createdByAdmin?.name ?? null,
      createdAt: booking.createdAt.toISOString(),
      // Optimistic-lock token — send this back with PATCH
      updatedAt: booking.updatedAt.toISOString(),
      services: booking.bookingServices.map((bs) => ({
        id: bs.service.id,
        name: bs.service.name,
      })),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/bookings/:id] get failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}

// ─── PATCH: edit and/or change status, in one save ───

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      date,
      timeSlotId,
      serviceIds,
      customerName,
      customerPhone,
      licensePlate,
      carModelId,
      carModelOther,
      bodyNo,
      mileage,
      adminNote,
      sendNotify = true,
      confirmOverride = false,
      updatedAt, // optimistic-lock token from GET
    } = body;

    const existing = await prisma.booking.findUnique({
      where: { id },
      include: {
        bookingServices: { select: { serviceId: true } },
        timeSlot: { select: { time: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรายการจอง" }, { status: 404 });
    }

    // Finished and cancelled bookings are history: ADMIN can't rewrite them.
    if (
      CLOSED_STATUSES.includes(existing.status) &&
      !can(actor.role, "EDIT_CLOSED_BOOKING")
    ) {
      return NextResponse.json(
        {
          error:
            "รายการที่เสร็จสิ้นหรือยกเลิกแล้ว แก้ไขได้เฉพาะผู้ดูแลระบบสูงสุด",
        },
        { status: 403 },
      );
    }

    // Someone else may have saved while this form was open.
    if (updatedAt && existing.updatedAt.toISOString() !== updatedAt) {
      throw new Stale();
    }

    if (status && !Object.values(BookingStatus).includes(status)) {
      return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
    }

    const nextStatus: BookingStatus = status ?? existing.status;
    const nextDate =
      date && isValidDateStr(date) ? date : toDateStr(existing.date);
    const nextSlotId = timeSlotId ?? existing.timeSlotId;
    const nextServiceIds: string[] = Array.isArray(serviceIds)
      ? serviceIds
      : existing.bookingServices.map((bs) => bs.serviceId);

    const scheduleChanged =
      nextDate !== toDateStr(existing.date) ||
      nextSlotId !== existing.timeSlotId;
    const servicesChanged =
      Array.isArray(serviceIds) &&
      (serviceIds.length !== existing.bookingServices.length ||
        serviceIds.some(
          (sid: string) =>
            !existing.bookingServices.some((bs) => bs.serviceId === sid),
        ));

    // Car model
    let carModel = existing.carModel;
    let resolvedModelId = existing.carModelId;

    if (carModelId !== undefined || carModelOther !== undefined) {
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
      } else if (carModelOther?.trim()) {
        carModel = sanitize(carModelOther);
        resolvedModelId = null;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      let bookingTime = existing.bookingTime;
      let overrides: SlotWarning[] = [];

      // Only re-check the slot when the schedule or services moved, and
      // never for a cancelled booking — it no longer occupies a seat.
      if ((scheduleChanged || servicesChanged) && nextStatus !== "CANCELLED") {
        const check = await checkSlot(tx, {
          dateStr: nextDate,
          timeSlotId: nextSlotId,
          serviceIds: nextServiceIds,
          excludeBookingId: id, // don't count this booking against itself
        });

        if (!check.time || check.warnings.includes("SLOT_CLOSED")) {
          throw new SlotClosed();
        }

        const blocking = check.warnings.filter((w) => w !== "LEAD_TIME");

        if (blocking.length > 0 && !confirmOverride) {
          throw new OverrideRequired(blocking);
        }

        overrides = blocking;
        bookingTime = check.time;
      }

      const data: Prisma.BookingUpdateInput = {
        status: nextStatus,
        date: toDateOnly(nextDate),
        bookingTime,
        timeSlot: { connect: { id: nextSlotId } },
        carModel,
        carModelRef: resolvedModelId
          ? { connect: { id: resolvedModelId } }
          : { disconnect: true },
      };

      if (customerName !== undefined)
        data.customerName = sanitize(customerName);
      if (customerPhone !== undefined)
        data.customerPhone = sanitize(customerPhone);
      if (licensePlate !== undefined)
        data.licensePlate = sanitize(licensePlate);
      if (bodyNo !== undefined) data.bodyNo = bodyNo ? sanitize(bodyNo) : null;
      if (mileage !== undefined) data.mileage = Number(mileage) || 0;
      if (adminNote !== undefined) {
        data.adminNote = adminNote ? sanitize(adminNote) : null;
      }

      // Service timestamps follow the status automatically
      if (nextStatus === "IN_SERVICE" && !existing.serviceStartedAt) {
        data.serviceStartedAt = new Date();
      }
      if (nextStatus === "COMPLETED") {
        data.completedAt = existing.completedAt ?? new Date();
      } else if (existing.completedAt) {
        data.completedAt = null; // reopened
      }

      if (servicesChanged) {
        data.bookingServices = {
          deleteMany: {},
          create: nextServiceIds.map((serviceId) => ({ serviceId })),
        };
      }

      const updated = await tx.booking.update({
        where: { id },
        data,
        include: {
          bookingServices: { include: { service: { select: { name: true } } } },
        },
      });

      const changes = diff(
        {
          status: existing.status,
          date: toDateStr(existing.date),
          bookingTime: existing.bookingTime,
          customerName: existing.customerName,
          customerPhone: existing.customerPhone,
          licensePlate: existing.licensePlate,
          carModel: existing.carModel,
          bodyNo: existing.bodyNo,
          mileage: existing.mileage,
          adminNote: existing.adminNote,
        },
        {
          status: updated.status,
          date: toDateStr(updated.date),
          bookingTime: updated.bookingTime,
          customerName: updated.customerName,
          customerPhone: updated.customerPhone,
          licensePlate: updated.licensePlate,
          carModel: updated.carModel,
          bodyNo: updated.bodyNo,
          mileage: updated.mileage,
          adminNote: updated.adminNote,
        },
      );

      if (servicesChanged) {
        changes.services = {
          from: existing.bookingServices.length,
          to: nextServiceIds.length,
        };
      }
      if (overrides.length > 0) {
        changes.overrides = { from: null, to: overrides };
      }

      const statusChanged = existing.status !== updated.status;

      await logAudit({
        actor,
        action: statusChanged
          ? "BOOKING_STATUS_CHANGED"
          : scheduleChanged
            ? "BOOKING_RESCHEDULED"
            : "BOOKING_UPDATED",
        entityType: "Booking",
        entityId: id,
        entityLabel: updated.bookingCode,
        changes,
        tx,
      });

      return { updated, statusChanged, scheduleChanged };
    });

    // ─── One LINE message per save, after the transaction commits ───
    let lineNotified = false;
    const { updated, statusChanged } = result;

    if (
      sendNotify &&
      updated.lineUserId &&
      (statusChanged || scheduleChanged)
    ) {
      // A status change wins: its template already carries the new date
      // and time, so a reschedule message would just repeat it.
      const trigger: NotifyTrigger | string = statusChanged
        ? updated.status
        : "RESCHEDULED";

      lineNotified = await sendNotification(updated.lineUserId, trigger, {
        bookingCode: updated.bookingCode,
        customerName: updated.customerName,
        date: toDateStr(updated.date),
        time: updated.bookingTime,
        services: updated.bookingServices.map((bs) => bs.service.name),
      });

      await logAudit({
        actor,
        action: lineNotified ? "NOTIFICATION_SENT" : "NOTIFICATION_FAILED",
        entityType: "Booking",
        entityId: id,
        entityLabel: updated.bookingCode,
        changes: { trigger },
      });
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      date: toDateStr(updated.date),
      time: updated.bookingTime,
      updatedAt: updated.updatedAt.toISOString(),
      lineNotified,
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    if (err instanceof Stale) {
      return NextResponse.json(
        {
          code: "STALE",
          error: "มีผู้แก้ไขรายการนี้แล้ว กรุณาโหลดใหม่",
        },
        { status: 409 },
      );
    }

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

    console.error("[admin/bookings/:id] update failed", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกได้" }, { status: 500 });
  }
}
