import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const templates = await prisma.notificationTemplate.findMany({
    orderBy: { trigger: "asc" },
  });
  return NextResponse.json(templates);
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id, template, active } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (template !== undefined) data.template = template;
    if (active !== undefined) data.active = active;

    const updated = await prisma.notificationTemplate.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "ไม่สามารถบันทึกได้" }, { status: 500 });
  }
}
