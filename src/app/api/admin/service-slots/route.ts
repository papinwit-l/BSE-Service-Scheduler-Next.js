import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

/**
 * Which time slots each service may be booked in.
 *
 * restrictSlots = false → the service is available in every active slot
 * restrictSlots = true  → only the linked slots
 *
 * The flag is explicit rather than inferred from "has no links", so adding
 * a new slot has an unambiguous effect on existing services.
 */

// ─── GET: services with their allowed slots ───

export async function GET() {
  try {
    await requireAdmin();

    const services = await prisma.service.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        active: true,
        restrictSlots: true,
        serviceTimeSlots: { select: { timeSlotId: true } },
      },
    });

    return NextResponse.json(
      services.map((s) => ({
        id: s.id,
        name: s.name,
        active: s.active,
        restrictSlots: s.restrictSlots,
        timeSlotIds: s.serviceTimeSlots.map((st) => st.timeSlotId),
      })),
    );
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/service-slots] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}

// ─── PUT: replace one service's restriction ───

export async function PUT(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { serviceId, restrictSlots, timeSlotIds } = await request.json();

    if (!serviceId) {
      return NextResponse.json({ error: "Missing serviceId" }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: {
        id: true,
        name: true,
        restrictSlots: true,
        serviceTimeSlots: { select: { timeSlotId: true } },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "ไม่พบบริการ" }, { status: 404 });
    }

    const restrict = !!restrictSlots;
    const ids: string[] =
      restrict && Array.isArray(timeSlotIds) ? timeSlotIds : [];

    // A restricted service with no slots can never be booked — that's a
    // configuration mistake, not a valid state.
    if (restrict && ids.length === 0) {
      return NextResponse.json(
        { error: "กรุณาเลือกช่วงเวลาอย่างน้อย 1 ช่วง" },
        { status: 400 },
      );
    }

    if (ids.length > 0) {
      const found = await prisma.timeSlot.count({ where: { id: { in: ids } } });
      if (found !== ids.length) {
        return NextResponse.json(
          { error: "มีช่วงเวลาที่ไม่ถูกต้อง" },
          { status: 400 },
        );
      }
    }

    const before = service.serviceTimeSlots.map((st) => st.timeSlotId);

    await prisma.$transaction(async (tx) => {
      await tx.service.update({
        where: { id: serviceId },
        data: { restrictSlots: restrict },
      });

      // Replace wholesale: simpler than diffing, and the table is tiny.
      await tx.serviceTimeSlot.deleteMany({ where: { serviceId } });

      if (ids.length > 0) {
        await tx.serviceTimeSlot.createMany({
          data: ids.map((timeSlotId) => ({ serviceId, timeSlotId })),
        });
      }

      await logAudit({
        actor,
        action: "SERVICE_UPDATED",
        entityType: "Service",
        entityId: serviceId,
        entityLabel: service.name,
        changes: {
          restrictSlots: { from: service.restrictSlots, to: restrict },
          slots: { from: before.length, to: ids.length },
        },
        tx,
      });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/service-slots] update failed", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกได้" }, { status: 500 });
  }
}
