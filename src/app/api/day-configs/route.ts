import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM

    // Get weekly closed days
    const dayConfigs = await prisma.dayConfig.findMany({
      where: { isClosed: true },
      select: { dayOfWeek: true },
    });

    const closedDays = dayConfigs.map((d) => d.dayOfWeek);

    // Get specific closed dates (for the requested month or next 3 months)
    const now = new Date();
    const startDate = month
      ? new Date(`${month}-01`)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3);

    const closedDates = await prisma.closedDate.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        reason: true,
      },
    });

    return NextResponse.json({
      closedDays,
      closedDates: closedDates.map((d) => ({
        date: d.date.toISOString().split("T")[0],
        reason: d.reason,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลวันทำการได้" },
      { status: 500 }
    );
  }
}
