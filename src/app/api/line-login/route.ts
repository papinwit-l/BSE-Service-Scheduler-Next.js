import { NextRequest, NextResponse } from "next/server";
import { getLineLoginUrl } from "@/lib/line";

/**
 * GET /api/line-login?token=…
 *
 * The OAuth `state` carries the booking's access token, never the booking
 * code: codes are sequential, so a code here would let anyone link their
 * own LINE account to someone else's booking and receive their messages.
 */
export async function GET(request: NextRequest) {
  const token = new URL(request.url).searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ error: "ลิงก์ไม่ถูกต้อง" }, { status: 400 });
  }

  return NextResponse.redirect(getLineLoginUrl(token));
}
