import { NextResponse } from "next/server";
import type { AdminRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Actor = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
};

// ─── Capabilities ───
// Roles stay an enum; checks go through can() so a future move to a
// database-backed permission table only changes this file.
const CAPABILITIES = {
  ROOT: [
    "MANAGE_ADMINS",
    "VIEW_AUDIT_LOG",
    "EDIT_CLOSED_BOOKING", // เสร็จสิ้น / ยกเลิก
    "MANAGE_BOOKINGS",
    "MANAGE_CONFIG",
  ],
  ADMIN: ["MANAGE_BOOKINGS", "MANAGE_CONFIG"],
} as const;

export type Capability =
  (typeof CAPABILITIES)[keyof typeof CAPABILITIES][number];

export function can(role: AdminRole, capability: Capability): boolean {
  return (CAPABILITIES[role] as readonly string[]).includes(capability);
}

// ─── Errors ───

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Turn an AuthError into a response; rethrow anything else.
 *
 *   try {
 *     const admin = await requireAdmin();
 *     ...
 *   } catch (err) {
 *     const res = authErrorResponse(err);
 *     if (res) return res;
 *     throw err;
 *   }
 */
export function authErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof AuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  return null;
}

// ─── Guards ───

/**
 * Require a signed-in, active admin.
 *
 * Re-reads the admin from the database rather than trusting the JWT: a
 * token issued before deactivation stays cryptographically valid, so the
 * session alone cannot tell us the account is still allowed in.
 */
export async function requireAdmin(): Promise<Actor> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized", 401);
  }

  const admin = await prisma.admin.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  if (!admin || !admin.active) {
    throw new AuthError("Unauthorized", 401);
  }

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  };
}

/** Require a specific capability. */
export async function requireCapability(
  capability: Capability,
): Promise<Actor> {
  const admin = await requireAdmin();

  if (!can(admin.role, capability)) {
    throw new AuthError("Forbidden", 403);
  }

  return admin;
}

/** Require the ROOT role. */
export async function requireRoot(): Promise<Actor> {
  const admin = await requireAdmin();

  if (admin.role !== "ROOT") {
    throw new AuthError("Forbidden", 403);
  }

  return admin;
}
