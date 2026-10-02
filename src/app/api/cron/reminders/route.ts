import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/line";
import { logSystemAudit } from "@/lib/audit";
import { addDaysStr, bangkokTodayStr, toDateOnly, toDateStr } from "@/lib/date";

/**
 * GET /api/cron/reminders
 *
 * Sends tomorrow's appointment reminders. Scheduled daily.
 *
 * "Tomorrow" is calculated in Bangkok time explicitly. The previous version
 * used the server's local midnight, which only produced the right day
 * because the job happened to run at 01:00 UTC.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tomorrowStr = addDaysStr(bangkokTodayStr(), 1);

    const bookings = await prisma.booking.findMany({
      where: {
        date: toDateOnly(tomorrowStr),
        // Reminders are for arrivals: cars already in service, finished
        // or cancelled don't need one.
        status: { in: ["PENDING", "CONFIRMED"] },
        lineUserId: { not: null },
        reminderSent: false,
      },
      include: {
        bookingServices: { include: { service: { select: { name: true } } } },
      },
      orderBy: { bookingTime: "asc" },
    });

    let sent = 0;
    let failed = 0;

    for (const booking of bookings) {
      if (!booking.lineUserId) continue;

      const ok = await sendNotification(booking.lineUserId, "REMINDER", {
        bookingCode: booking.bookingCode,
        customerName: booking.customerName,
        date: toDateStr(booking.date),
        time: booking.bookingTime,
        services: booking.bookingServices.map((bs) => bs.service.name),
      });

      if (ok) {
        sent++;
        // Only mark as sent on success, so a failure is retried tomorrow…
        // which is too late. Failures are logged for the admin to see.
        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSent: true },
        });
      } else {
        failed++;
        await logSystemAudit("NOTIFICATION_FAILED", {
          entityType: "Booking",
          entityId: booking.id,
          entityLabel: booking.bookingCode,
          changes: { trigger: "REMINDER" },
        });
      }
    }

    return NextResponse.json({
      date: tomorrowStr,
      total: bookings.length,
      sent,
      failed,
    });
  } catch (err) {
    console.error("[cron/reminders] failed", err);
    return NextResponse.json({ error: "Reminder job failed" }, { status: 500 });
  }
}
