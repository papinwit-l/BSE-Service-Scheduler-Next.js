import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStatusUpdate } from "@/lib/line";

/**
 * Cron job: Send reminders for tomorrow's bookings
 * Runs daily at 8:00 AM (UTC+7 = 1:00 AM UTC)
 * Secured with CRON_SECRET
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if REMINDER template is active
    const template = await prisma.notificationTemplate.findUnique({
      where: { trigger: "REMINDER" },
    });

    if (!template?.active) {
      return NextResponse.json({
        message: "Reminder notifications are disabled",
        sent: 0,
      });
    }

    // Get tomorrow's date range (UTC)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find bookings for tomorrow that:
    // - have LINE connected
    // - are CONFIRMED or PENDING
    // - haven't been reminded yet
    const bookings = await prisma.booking.findMany({
      where: {
        date: { gte: tomorrow, lt: dayAfter },
        status: { in: ["PENDING", "CONFIRMED"] },
        lineUserId: { not: null },
        reminderSent: false,
      },
      include: {
        timeBlock: true,
        bookingServices: {
          include: { service: true },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      if (!booking.lineUserId) continue;

      const success = await sendStatusUpdate(booking.lineUserId, {
        bookingCode: booking.bookingCode,
        status: "REMINDER",
        customerName: booking.customerName,
        date: booking.date.toISOString().split("T")[0],
        timeBlock: `${booking.timeBlock.label} (${booking.timeBlock.startTime}–${booking.timeBlock.endTime})`,
        services: booking.bookingServices.map((bs) => bs.service.name),
      });

      if (success) {
        // Mark as reminded
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });
        sent++;
      } else {
        failed++;
      }
    }

    return NextResponse.json({
      message: `Reminders processed`,
      total: bookings.length,
      sent,
      failed,
      date: tomorrow.toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Cron reminder error:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}
