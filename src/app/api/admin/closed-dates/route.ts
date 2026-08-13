import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dates = await prisma.closedDate.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(
    dates.map((d) => ({
      id: d.id,
      date: d.date.toISOString().split("T")[0],
      reason: d.reason,
    }))
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { date, reason } = await request.json();
    if (!date) {
      return NextResponse.json({ error: "กรุณาเลือกวันที่" }, { status: 400 });
    }

    const closed = await prisma.closedDate.create({
      data: {
        date: new Date(date),
        reason: reason?.trim() || null,
      },
    });
    return NextResponse.json(
      { id: closed.id, date: closed.date.toISOString().split("T")[0], reason: closed.reason },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "วันที่นี้ถูกเพิ่มไปแล้ว" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.closedDate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถลบได้" }, { status: 500 });
  }
}
