import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** GET /api/car-models — active models for the booking form dropdown. */
export async function GET() {
  try {
    const models = await prisma.carModel.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });

    return NextResponse.json(models);
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรุ่นรถได้" },
      { status: 500 },
    );
  }
}
