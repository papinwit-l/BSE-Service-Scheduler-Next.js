import { messagingApi } from "@line/bot-sdk";

// ─── LINE Login ───

const LINE_LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID!;
const LINE_LOGIN_CHANNEL_SECRET = process.env.LINE_LOGIN_CHANNEL_SECRET!;
const LINE_LOGIN_REDIRECT_URI = process.env.LINE_LOGIN_REDIRECT_URI!;

/**
 * Build LINE Login authorization URL
 * state = bookingId to link after callback
 */
export function getLineLoginUrl(bookingId: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: LINE_LOGIN_CHANNEL_ID,
    redirect_uri: LINE_LOGIN_REDIRECT_URI,
    state: bookingId,
    scope: "profile openid",
  });
  return `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token + profile
 */
export async function exchangeLineCode(code: string): Promise<{
  userId: string;
  displayName: string;
} | null> {
  try {
    // Exchange code for token
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

    // Get user profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) return null;
    const profile = await profileRes.json();

    return {
      userId: profile.userId,
      displayName: profile.displayName,
    };
  } catch {
    return null;
  }
}

// ─── LINE Messaging API ───

const LINE_MESSAGING_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN!;

const messagingClient = new messagingApi.MessagingApiClient({
  channelAccessToken: LINE_MESSAGING_TOKEN,
});

/**
 * Push a text message to a specific user
 */
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

/**
 * Send booking confirmation notification
 */
export async function sendBookingConfirmation(
  userId: string,
  booking: {
    bookingCode: string;
    customerName: string;
    date: string;
    timeBlock: string;
    services: string[];
  },
): Promise<boolean> {
  return sendFromTemplate(userId, "CONFIRMED", booking);
}

/**
 * Send status update notification
 */
export async function sendStatusUpdate(
  userId: string,
  booking: {
    bookingCode: string;
    status: string;
    date?: string;
    timeBlock?: string;
    customerName?: string;
    services: string[];
  },
): Promise<boolean> {
  return sendFromTemplate(userId, booking.status, booking);
}

/**
 * Build message from DB template and send
 * Falls back to a simple default if no template found
 */
async function sendFromTemplate(
  userId: string,
  trigger: string,
  data: {
    bookingCode: string;
    customerName?: string;
    date?: string;
    timeBlock?: string;
    services: string[];
  },
): Promise<boolean> {
  // Dynamic import to avoid circular deps
  const { prisma } = await import("@/lib/prisma");

  const tmpl = await prisma.notificationTemplate.findUnique({
    where: { trigger },
  });

  // Template disabled or not found
  if (!tmpl || !tmpl.active) return false;

  const serviceList = data.services.map((s) => `  • ${s}`).join("\n");

  const message = tmpl.template
    .replace(/\{bookingCode\}/g, data.bookingCode || "")
    .replace(/\{customerName\}/g, data.customerName || "")
    .replace(/\{date\}/g, data.date || "")
    .replace(/\{timeBlock\}/g, data.timeBlock || "")
    .replace(/\{services\}/g, serviceList);

  return pushMessage(userId, message);
}
