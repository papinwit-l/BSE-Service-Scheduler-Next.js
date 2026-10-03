import { NextRequest, NextResponse } from "next/server";
import { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRoot, authErrorResponse } from "@/lib/guards";
import { isValidDateStr, toDateOnly } from "@/lib/date";

const PAGE_SIZE = 50;

/**
 * GET /api/admin/audit-logs
 *
 * ROOT only: the log records who did what, including other admins'
 * actions, so it isn't something every admin should browse.
 */
export async function GET(request: NextRequest) {
  try {
    await requireRoot();

    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("actor");
    const action = searchParams.get("action");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");

    const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const where: Prisma.AuditLogWhereInput = {};

    if (actorId) where.actorId = actorId;

    if (action && Object.values(AuditAction).includes(action as AuditAction)) {
      where.action = action as AuditAction;
    }

    const range: Prisma.DateTimeFilter = {};
    if (from && isValidDateStr(from)) range.gte = toDateOnly(from);
    if (to && isValidDateStr(to)) {
      const t = toDateOnly(to);
      t.setUTCDate(t.getUTCDate() + 1); // inclusive end
      range.lt = t;
    }
    if (Object.keys(range).length > 0) where.createdAt = range;

    // Booking code, admin email, anything in entityLabel
    if (search) {
      where.OR = [
        { entityLabel: { contains: search } },
        { actorName: { contains: search } },
        { actorEmail: { contains: search } },
      ];
    }

    const [logs, total, actors] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.auditLog.count({ where }),
      // Actors for the filter dropdown — from the admin table, so
      // deactivated accounts still appear.
      prisma.admin.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      }),
    ]);

    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actorName: l.actorName,
        actorEmail: l.actorEmail,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        entityLabel: l.entityLabel,
        changes: l.changes,
        ip: l.ip,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      actors,
      actions: Object.values(AuditAction),
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/audit-logs] failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}
