import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

/**
 * Car models for the booking form dropdown.
 *
 * Bookings snapshot the model NAME as text, so renaming or removing a model
 * here never rewrites history.
 */

// ─── GET: all models, plus what customers typed under "อื่นๆ" ───

export async function GET() {
  try {
    await requireAdmin();

    const models = await prisma.carModel.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        active: true,
        sortOrder: true,
        _count: { select: { bookings: true } },
      },
    });

    // Models customers typed themselves — worth adding to the list if a
    // name keeps coming up.
    const typed = await prisma.booking.groupBy({
      by: ["carModel"],
      where: { carModelId: null },
      _count: { _all: true },
      orderBy: { _count: { carModel: "desc" } },
      take: 20,
    });

    return NextResponse.json({
      models: models.map((m) => ({
        id: m.id,
        name: m.name,
        active: m.active,
        sortOrder: m.sortOrder,
        bookings: m._count.bookings,
      })),
      typedByCustomers: typed.map((t) => ({
        name: t.carModel,
        count: t._count._all,
      })),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/car-models] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรุ่นรถได้" },
      { status: 500 },
    );
  }
}

// ─── POST ───

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const { name } = await request.json();

    const trimmed = (name ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "กรุณากรอกชื่อรุ่น" }, { status: 400 });
    }

    const existing = await prisma.carModel.findUnique({
      where: { name: trimmed },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: existing.active
            ? "มีรุ่นนี้อยู่แล้ว"
            : "มีรุ่นนี้อยู่แล้ว (ปิดใช้งานอยู่) — เปิดใช้งานแทน",
        },
        { status: 409 },
      );
    }

    const max = await prisma.carModel.aggregate({ _max: { sortOrder: true } });

    const model = await prisma.carModel.create({
      data: { name: trimmed, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });

    await logAudit({
      actor,
      action: "CAR_MODEL_UPDATED",
      entityType: "CarModel",
      entityId: model.id,
      entityLabel: model.name,
      changes: { created: { from: null, to: trimmed } },
    });

    return NextResponse.json(model, { status: 201 });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/car-models] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถเพิ่มรุ่นรถได้" },
      { status: 500 },
    );
  }
}

// ─── PATCH: rename, activate, reorder ───

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();

    // Reorder: [{ id, sortOrder }, …]
    if (Array.isArray(body.order)) {
      await prisma.$transaction(
        body.order.map((item: { id: string; sortOrder: number }) =>
          prisma.carModel.update({
            where: { id: item.id },
            data: { sortOrder: item.sortOrder },
          }),
        ),
      );
      return NextResponse.json({ success: true });
    }

    const { id, name, active } = body;
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const existing = await prisma.carModel.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ไม่พบรุ่นรถ" }, { status: 404 });
    }

    const data: { name?: string; active?: boolean } = {};

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { error: "ชื่อรุ่นว่างไม่ได้" },
          { status: 400 },
        );
      }

      const clash = await prisma.carModel.findFirst({
        where: { name: trimmed, id: { not: id } },
        select: { id: true },
      });

      if (clash) {
        return NextResponse.json(
          { error: "มีรุ่นนี้อยู่แล้ว" },
          { status: 409 },
        );
      }

      data.name = trimmed;
    }

    if (active !== undefined) data.active = !!active;

    const model = await prisma.carModel.update({ where: { id }, data });

    await logAudit({
      actor,
      action: "CAR_MODEL_UPDATED",
      entityType: "CarModel",
      entityId: id,
      entityLabel: model.name,
      changes: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k,
          { from: existing[k as keyof typeof existing], to: v },
        ]),
      ),
    });

    return NextResponse.json(model);
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/car-models] update failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขรุ่นรถได้" },
      { status: 500 },
    );
  }
}

// ─── DELETE: only when unused ───

export async function DELETE(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const model = await prisma.carModel.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { bookings: true } } },
    });

    if (!model) {
      return NextResponse.json({ error: "ไม่พบรุ่นรถ" }, { status: 404 });
    }

    // Bookings keep the model name as text, so deleting wouldn't lose data —
    // but it would silently unlink them. Deactivating is clearer.
    if (model._count.bookings > 0) {
      return NextResponse.json(
        {
          error: `มีการจอง ${model._count.bookings} รายการใช้รุ่นนี้ — ปิดใช้งานแทน`,
        },
        { status: 409 },
      );
    }

    await prisma.carModel.delete({ where: { id } });

    await logAudit({
      actor,
      action: "CAR_MODEL_UPDATED",
      entityType: "CarModel",
      entityId: id,
      entityLabel: model.name,
      changes: { deleted: { from: model.name, to: null } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/car-models] delete failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถลบรุ่นรถได้" },
      { status: 500 },
    );
  }
}
