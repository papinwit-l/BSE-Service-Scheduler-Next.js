import { messagingApi } from "@line/bot-sdk";
import { format } from "date-fns";
import { th } from "date-fns/locale";

// ─── LINE Login ───

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!;
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET!;
const LINE_LOGIN_REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI!;

/**
 * Build the LINE Login authorization URL.
 *
 * `state` carries the booking's ACCESS TOKEN, never the booking code:
 * codes are sequential, so a code here would let anyone link their own
 * LINE account to someone else's booking.
 */
export function getLineLoginUrl(accessToken: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: LINE_LOGIN_REDIRECT_URI,
    state: accessToken,
    scope: "profile openid",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

/** Exchange an authorization code for the user's profile. */
export async function exchangeLineCode(code: string): Promise<{
  userId: string;
  displayName: string;
} | null> {
  try {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: LINE_LOGIN_REDIRECT_URI,
        client_id: LINE_LOGIN_CHANNEL_ID,
        client_secret: LINE_LOGIN_CHANNEL_SECRET,
      }),
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();

    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    return { userId: profile.userId, displayName: profile.displayName };
  } catch {
    return null;
  }
}

// ─── Messaging ───

const LINE_MESSAGING_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

const messagingClient = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_MESSAGING_TOKEN,
});

/** Push a plain text message to one user. */
export async function pushMessage(
  userId: string,
  text: string,
): Promise<boolean> {
  try {
    await messagingClient.pushMessage({
      to: userId,
      messages: [{ type: "text", text }],
    });
    return true;
  } catch {
    console.error("LINE push message failed for user:", userId);
    return false;
  }
}

/** Triggers that map to a NotificationTemplate row. */
export type NotifyTrigger =
  | "CONFIRMED"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "RESCHEDULED"
  | "REMINDER";

export type NotifyData = {
  bookingCode: string;
  customerName?: string;
  /** "2026-10-15" — rendered as a Thai date in the message. */
  date?: string;
  /** "09:30" */
  time?: string;
  services: string[];
};

/**
 * Render a template from the database and send it.
 *
 * Placeholders: {bookingCode} {customerName} {date} {time} {services}
 * Returns false when the template is missing, disabled, or the push fails.
 */
export async function sendNotification(
  userId: string,
  trigger: NotifyTrigger | string,
  data: NotifyData,
): Promise<boolean> {
  const { prisma } = await import("@/lib/prisma");

  const tmpl = await prisma.notificationTemplate.findUnique({
    where: { trigger },
  });

  if (!tmpl || !tmpl.active) return false;

  const serviceList = data.services.map((s) => `  • ${s}`).join("\n");

  const thaiDate = data.date
    ? format(new Date(`${data.date}T00:00:00.000Z`), "EEEE d MMMM yyyy", {
        locale: th,
      })
    : "";

  const message = tmpl.template
    .replace(/\{bookingCode\}/g, data.bookingCode || "")
    .replace(/\{customerName\}/g, data.customerName || "")
    .replace(/\{date\}/g, thaiDate)
    .replace(/\{time\}/g, data.time ? `${data.time} น.` : "")
    .replace(/\{services\}/g, serviceList);

  return pushMessage(userId, message);
}

/** Send the template matching a booking's current status. */
export async function sendStatusUpdate(
  userId: string,
  booking: NotifyData & { status: string },
): Promise<boolean> {
  return sendNotification(userId, booking.status, booking);
}
