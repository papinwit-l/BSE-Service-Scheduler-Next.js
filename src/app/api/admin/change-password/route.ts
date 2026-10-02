import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, authErrorResponse } from "@/lib/guards";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบ" },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร" },
        { status: 400 },
      );
    }

    const admin = await prisma.admin.findUnique({
      where: { id: actor.id },
    });

    if (!admin) {
      return NextResponse.json({ error: "ไม่พบบัญชีผู้ใช้" }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    // Reject reusing the current password — otherwise a temp password
    // could be "changed" to itself and the forced-change gate cleared.
    const isSame = await bcrypt.compare(newPassword, admin.password);
    if (isSame) {
      return NextResponse.json(
        { error: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed, mustChangePassword: false },
    });

    // TODO (Phase 3): logAudit({ actor, action: "PASSWORD_CHANGED" })

    return NextResponse.json({ success: true });
  } catch (err) {
    const res = authErrorResponse(err);
    if (res) return res;

    return NextResponse.json(
      { error: "ไม่สามารถเปลี่ยนรหัสผ่านได้" },
      { status: 500 },
    );
  }
}
