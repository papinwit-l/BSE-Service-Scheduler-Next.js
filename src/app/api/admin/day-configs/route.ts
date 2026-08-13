import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configs = await prisma.dayConfig.findMany({
    orderBy: { dayOfWeek: "asc" },
  });
  return NextResponse.json(configs);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { dayOfWeek, isClosed } = await request.json();
    if (dayOfWeek === undefined || isClosed === undefined) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const config = await prisma.dayConfig.update({
      where: { dayOfWeek },
      data: { isClosed },
    });
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "ไม่สามารถอัปเดตได้" }, { status: 500 });
  }
}
