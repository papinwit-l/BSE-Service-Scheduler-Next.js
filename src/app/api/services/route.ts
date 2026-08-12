import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return NextResponse.json(services);
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายการบริการได้" },
      { status: 500 }
    );
  }
}
