import { NextRequest, NextResponse } from "next/server";
import { exchangeLineCode } from "@/lib/line";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // the booking's access token
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  const back = (status: "linked" | "error") =>
    NextResponse.redirect(
      `${baseUrl}/booking/success?token=${encodeURIComponent(state ?? "")}&line=${status}`,
    );

  if (error || !code || !state) return back("error");

  const profile = await exchangeLineCode(code);
  if (!profile) return back("error");

  try {
    // Look up by access token only. The previous version also matched on
    // booking code, which is guessable.
    const booking = await prisma.booking.findUnique({
      where: { accessToken: state },
      select: { id: true },
    });

    if (!booking) return back("error");

    await prisma.booking.update({
      where: { id: booking.id },
      data: { lineUserId: profile.userId },
    });

    return back("linked");
  } catch {
    return back("error");
  }
}
