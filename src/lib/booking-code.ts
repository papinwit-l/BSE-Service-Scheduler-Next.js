/**
 * Generate a unique booking code in BSE format
 * Pattern: BK-XXXXXX (6 alphanumeric uppercase chars)
 * e.g. BK-7X2M9P, BK-A3K8Q1
 */
export function generateBookingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${code}`;
}
