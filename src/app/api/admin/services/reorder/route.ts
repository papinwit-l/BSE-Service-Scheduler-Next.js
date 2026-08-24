import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { orderedIds } = await request.json();

    if (!Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Update each service's sortOrder in a transaction
    await prisma.$transaction(
      orderedIds.map((id: string, index: number) =>
        prisma.service.update({
          where: { id },
          data: { sortOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "ไม่สามารถเรียงลำดับได้" }, { status: 500 });
  }
}
