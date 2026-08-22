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

  // Build list of allowed origins (normalize: no trailing slash, lowercase)
  const allowedOrigins: string[] = [];

  if (process.env.NEXTAUTH_URL) {
    allowedOrigins.push(
      process.env.NEXTAUTH_URL.replace(/\/$/, "").toLowerCase(),
    );
  }

  // VERCEL_URL has no protocol — e.g. "my-app.vercel.app"
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`.toLowerCase());
  }

  // Vercel also sets VERCEL_PROJECT_PRODUCTION_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowedOrigins.push(
      `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.toLowerCase(),
    );
  }

  if (allowedOrigins.length === 0) return true; // no config = allow all

  // Check origin header
  if (origin) {
    const normalizedOrigin = origin.replace(/\/$/, "").toLowerCase();
    return allowedOrigins.some((host) => normalizedOrigin === host);
  }

  // Fall back to referer
  if (referer) {
    const normalizedReferer = referer.toLowerCase();
    return allowedOrigins.some((host) => normalizedReferer.startsWith(host));
  }

  // No origin or referer — likely a direct API call
  return false;
}
