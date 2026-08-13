import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const blocks = await prisma.timeBlock.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(blocks);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { label, startTime, endTime, maxBookings } = await request.json();
    if (!label?.trim() || !startTime || !endTime) {
      return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
    }

    const maxOrder = await prisma.timeBlock.aggregate({ _max: { sortOrder: true } });
    const block = await prisma.timeBlock.create({
      data: {
        label: label.trim(),
        startTime,
        endTime,
        maxBookings: maxBookings || 5,
        sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      },
    });
    return NextResponse.json(block, { status: 201 });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเพิ่มช่วงเวลาได้" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, label, startTime, endTime, maxBookings, active } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label.trim();
    if (startTime !== undefined) data.startTime = startTime;
    if (endTime !== undefined) data.endTime = endTime;
    if (maxBookings !== undefined) data.maxBookings = maxBookings;
    if (active !== undefined) data.active = active;

    const block = await prisma.timeBlock.update({ where: { id }, data });
    return NextResponse.json(block);
  } catch {
    return NextResponse.json({ error: "ไม่สามารถแก้ไขช่วงเวลาได้" }, { status: 500 });
  }
}
