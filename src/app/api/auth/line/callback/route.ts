import { NextRequest, NextResponse } from "next/server";
import { exchangeLineCode } from "@/lib/line";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // bookingId
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  // User denied or error
  if (error || !code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/booking/success?code=${state}&line=error`
    );
  }

  // Exchange code for profile
  const profile = await exchangeLineCode(code);

  if (!profile) {
    return NextResponse.redirect(
      `${baseUrl}/booking/success?code=${state}&line=error`
    );
  }

  // Find booking and link lineUserId
  try {
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { id: state },
          { bookingCode: state },
        ],
      },
    });

    if (booking) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { lineUserId: profile.userId },
      });

      return NextResponse.redirect(
        `${baseUrl}/booking/success?code=${booking.bookingCode}&line=linked`
      );
    }
  } catch {
    // Fall through to error redirect
  }

  return NextResponse.redirect(
    `${baseUrl}/booking/success?code=${state}&line=error`
  );
}
