import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import { bangkokYear } from "@/lib/date";

/**
 * Booking code: BSE-YYYY-XXXXXX
 *
 * - YYYY is the creation year in Bangkok time. A code is assigned once and
 *   never changes, so rescheduling into another year keeps the old code.
 * - XXXXXX is a per-year running number, zero-padded.
 *
 * MUST be called inside the same transaction that inserts the booking, so
 * the counter rolls back if the insert fails.
 */
export async function generateBookingCode(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = bangkokYear();

  // Atomic insert-or-increment. MySQL locks the row for the duration, so
  // two simultaneous bookings can never read the same value.
  //
  // Do NOT replace this with prisma.upsert(): on MySQL, Prisma implements
  // upsert as read-then-write, which is not atomic.
  await tx.$executeRaw`
    INSERT INTO booking_counters (year, value)
    VALUES (${year}, 1)
    ON DUPLICATE KEY UPDATE value = value + 1
  `;

  const counter = await tx.bookingCounter.findUniqueOrThrow({
    where: { year },
  });

  // padStart only pads, never truncates: past 999,999 the code simply grows
  // a digit rather than colliding. VarChar(20) has room.
  return `BSE-${year}-${String(counter.value).padStart(6, "0")}`;
}

/**
 * Secret for customer-facing links (status page, LINE linking).
 *
 * The booking code is sequential and therefore guessable, so it must never
 * grant access on its own. 16 random bytes → 22 url-safe characters.
 * Never derive this from the code, the id, or anything else predictable.
 */
export function generateAccessToken(): string {
  return randomBytes(16).toString("base64url");
}
