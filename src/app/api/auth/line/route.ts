import { NextRequest, NextResponse } from "next/server";
import { getLineLoginUrl } from "@/lib/line";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId");

  if (!bookingId) {
    return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
  }

  const loginUrl = getLineLoginUrl(bookingId);
  return NextResponse.redirect(loginUrl);
}
