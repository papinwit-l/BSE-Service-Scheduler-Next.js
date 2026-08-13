/**
 * Security utilities for public API routes
 */

/**
 * Sanitize user input — strip HTML tags and trim
 * Prevents stored XSS even if data is rendered outside React
 */
export function sanitize(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/javascript:/gi, "") // strip js protocol
    .replace(/on\w+\s*=/gi, "") // strip event handlers
    .trim();
}

/**
 * Sanitize all string fields in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const clean = { ...obj };
  for (const key in clean) {
    if (typeof clean[key] === "string") {
      (clean as Record<string, unknown>)[key] = sanitize(clean[key] as string);
    }
  }
  return clean;
}

/**
 * Check honeypot field — bots fill hidden fields, humans don't
 * Returns true if the request is likely a bot
 */
export function isBot(body: Record<string, unknown>): boolean {
  // If the honeypot field has any value, it's a bot
  return !!body._website || !!body._email2;
}

/**
 * Validate request origin — ensure requests come from our own domain
 * Returns true if the origin is allowed
 */
export function isValidOrigin(headers: Headers): boolean {
  const origin = headers.get("origin");
  const referer = headers.get("referer");

  // Allow in development
  if (process.env.NODE_ENV === "development") return true;

  const allowedHosts = [
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean) as string[];

  // Check origin header
  if (origin) {
    return allowedHosts.some((host) => origin.startsWith(host));
  }

  // Fall back to referer
  if (referer) {
    return allowedHosts.some((host) => referer.startsWith(host));
  }

  // No origin or referer — likely a direct API call
  return false;
}
