import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const services = await prisma.service.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(services);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, description } = await request.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "กรุณากรอกชื่อบริการ" }, { status: 400 });
    }

    const maxOrder = await prisma.service.aggregate({ _max: { sortOrder: true } });
    const service = await prisma.service.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มบริการได้" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, name, description, active, sortOrder } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (active !== undefined) data.active = active;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const service = await prisma.service.update({ where: { id }, data });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขบริการได้" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    // Check if service is used in any booking
    const usageCount = await prisma.bookingService.count({ where: { serviceId: id } });
    if (usageCount > 0) {
      return NextResponse.json(
        { error: `บริการนี้ถูกใช้ใน ${usageCount} รายการจอง ไม่สามารถลบได้ ให้ปิดการใช้งานแทน` },
        { status: 400 }
      );
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบบริการได้" }, { status: 500 });
  }
}
