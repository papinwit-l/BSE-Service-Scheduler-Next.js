import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRoot, authErrorResponse } from "@/lib/guards";
import { logAudit } from "@/lib/audit";

/**
 * Admin accounts. ROOT only.
 *
 * Four rules, enforced here rather than in the UI — the first and third
 * are the ones that would lock you out of your own system:
 *   1. ROOT cannot demote itself
 *   2. ROOT cannot deactivate itself
 *   3. The last active ROOT cannot be demoted or deactivated
 *   4. Only ROOT grants ROOT (implicit: the whole route is ROOT-only)
 */

const MIN_PASSWORD = 8;

async function countActiveRoots(excludeId?: string) {
  return prisma.admin.count({
    where: {
      role: "ROOT",
      active: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

// ─── GET ───

export async function GET() {
  try {
    await requireRoot();

    const admins = await prisma.admin.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        _count: { select: { createdBookings: true } },
      },
    });

    return NextResponse.json(
      admins.map((a) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        role: a.role,
        active: a.active,
        mustChangePassword: a.mustChangePassword,
        lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        createdBy: a.createdBy?.name ?? null,
        bookingsCreated: a._count.createdBookings,
      })),
    );
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/admins] list failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลได้" },
      { status: 500 },
    );
  }
}

// ─── POST: create ───

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoot();
    const { email, name, role, password } = await request.json();

    const cleanEmail = (email ?? "").trim().toLowerCase();
    const cleanName = (name ?? "").trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "อีเมลไม่ถูกต้อง" }, { status: 400 });
    }

    if (!cleanName) {
      return NextResponse.json({ error: "กรุณากรอกชื่อ" }, { status: 400 });
    }

    if (role !== "ROOT" && role !== "ADMIN") {
      return NextResponse.json({ error: "สิทธิ์ไม่ถูกต้อง" }, { status: 400 });
    }

    if (!password || password.length < MIN_PASSWORD) {
      return NextResponse.json(
        { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` },
        { status: 400 },
      );
    }

    const existing = await prisma.admin.findUnique({
      where: { email: cleanEmail },
      select: { id: true, active: true },
    });

    if (existing) {
      return NextResponse.json(
        {
          error: existing.active
            ? "อีเมลนี้ถูกใช้แล้ว"
            : "อีเมลนี้เคยใช้แล้ว (ปิดใช้งานอยู่) — เปิดใช้งานแทน",
        },
        { status: 409 },
      );
    }

    const admin = await prisma.admin.create({
      data: {
        email: cleanEmail,
        name: cleanName,
        role,
        password: await bcrypt.hash(password, 12),
        // The creator knows this password, so it must be changed on first
        // login before the account is really the new admin's own.
        mustChangePassword: true,
        createdById: actor.id,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAudit({
      actor,
      action: "ADMIN_CREATED",
      entityType: "Admin",
      entityId: admin.id,
      entityLabel: admin.email,
      changes: {
        name: { from: null, to: cleanName },
        role: { from: null, to: role },
      },
    });

    return NextResponse.json(admin, { status: 201 });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/admins] create failed", err);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างบัญชีได้" },
      { status: 500 },
    );
  }
}

// ─── PATCH: name, role, active, password reset ───

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRoot();
    const { id, name, role, active, newPassword } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "ไม่พบบัญชี" }, { status: 404 });
    }

    const isSelf = target.id === actor.id;
    const data: {
      name?: string;
      role?: "ROOT" | "ADMIN";
      active?: boolean;
      password?: string;
      mustChangePassword?: boolean;
    } = {};

    // ─── Name ───
    if (name !== undefined) {
      const cleanName = name.trim();
      if (!cleanName) {
        return NextResponse.json({ error: "ชื่อว่างไม่ได้" }, { status: 400 });
      }
      data.name = cleanName;
    }

    // ─── Role ───
    if (role !== undefined && role !== target.role) {
      if (role !== "ROOT" && role !== "ADMIN") {
        return NextResponse.json(
          { error: "สิทธิ์ไม่ถูกต้อง" },
          { status: 400 },
        );
      }

      // Rule 1
      if (isSelf && role !== "ROOT") {
        return NextResponse.json(
          { error: "ไม่สามารถลดสิทธิ์ตัวเองได้" },
          { status: 400 },
        );
      }

      // Rule 3
      if (target.role === "ROOT" && role === "ADMIN") {
        if ((await countActiveRoots(target.id)) === 0) {
          return NextResponse.json(
            { error: "ต้องมีผู้ดูแลระบบสูงสุดอย่างน้อย 1 บัญชี" },
            { status: 400 },
          );
        }
      }

      data.role = role;
    }

    // ─── Active ───
    if (active !== undefined && !!active !== target.active) {
      // Rule 2
      if (isSelf && !active) {
        return NextResponse.json(
          { error: "ไม่สามารถปิดใช้งานบัญชีตัวเองได้" },
          { status: 400 },
        );
      }

      // Rule 3
      if (!active && target.role === "ROOT") {
        if ((await countActiveRoots(target.id)) === 0) {
          return NextResponse.json(
            { error: "ต้องมีผู้ดูแลระบบสูงสุดที่ใช้งานได้อย่างน้อย 1 บัญชี" },
            { status: 400 },
          );
        }
      }

      data.active = !!active;
    }

    // ─── Password reset ───
    if (newPassword !== undefined) {
      if (newPassword.length < MIN_PASSWORD) {
        return NextResponse.json(
          { error: `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD} ตัวอักษร` },
          { status: 400 },
        );
      }

      data.password = await bcrypt.hash(newPassword, 12);
      // ROOT now knows this password, so the owner must replace it.
      data.mustChangePassword = true;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "ไม่มีการเปลี่ยนแปลง" },
        { status: 400 },
      );
    }

    const updated = await prisma.admin.update({ where: { id }, data });

    // Separate actions so the log reads clearly later
    if (data.password) {
      await logAudit({
        actor,
        action: "ADMIN_PASSWORD_RESET",
        entityType: "Admin",
        entityId: id,
        entityLabel: target.email,
      });
    }

    if (data.role) {
      await logAudit({
        actor,
        action: "ADMIN_ROLE_CHANGED",
        entityType: "Admin",
        entityId: id,
        entityLabel: target.email,
        changes: { role: { from: target.role, to: data.role } },
      });
    }

    if (data.active !== undefined) {
      await logAudit({
        actor,
        action: data.active ? "ADMIN_REACTIVATED" : "ADMIN_DEACTIVATED",
        entityType: "Admin",
        entityId: id,
        entityLabel: target.email,
      });
    }

    if (data.name) {
      await logAudit({
        actor,
        action: "ADMIN_UPDATED",
        entityType: "Admin",
        entityId: id,
        entityLabel: target.email,
        changes: { name: { from: target.name, to: data.name } },
      });
    }

    return NextResponse.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      active: updated.active,
    });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    console.error("[admin/admins] update failed", err);
    return NextResponse.json({ error: "ไม่สามารถบันทึกได้" }, { status: 500 });
  }
}
