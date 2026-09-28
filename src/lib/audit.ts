import { headers } from "next/headers";
import { Prisma, type AuditAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Actor } from "@/lib/guards";

export type Changes = Record<string, unknown>;

type AuditInput = {
  actor: Actor;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  entityLabel?: string;
  changes?: Changes;
  /** Pass a transaction client so the log commits with the change itself. */
  tx?: Prisma.TransactionClient;
};

/**
 * Changed fields only: { status: { from: "PENDING", to: "CONFIRMED" } }.
 * Whole-row snapshots bury the actual change and bloat the table.
 */
export function diff<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after)) {
    const from = before[key];
    const to = after[key];

    const same =
      from instanceof Date && to instanceof Date
        ? from.getTime() === to.getTime()
        : from === to;

    if (!same) {
      changes[key] = {
        from: from instanceof Date ? from.toISOString() : from,
        to: to instanceof Date ? to.toISOString() : to,
      };
    }
  }

  return changes;
}

async function requestContext() {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return {
      ip: forwarded?.split(",")[0].trim() || h.get("x-real-ip") || null,
      userAgent: h.get("user-agent")?.slice(0, 255) || null,
    };
  } catch {
    // Called outside a request (cron, script)
    return { ip: null, userAgent: null };
  }
}

/**
 * Write an audit entry.
 *
 * With `tx`, the log commits or rolls back with the change — use it for
 * status changes, reschedules, deletes, overrides and admin management.
 * Without it the write is best-effort and never throws into the caller.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  const { ip, userAgent } = await requestContext();

  const hasChanges = input.changes && Object.keys(input.changes).length > 0;

  const data = {
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    actorName: input.actor.name,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    entityLabel: input.entityLabel ?? null,
    changes: hasChanges
      ? (input.changes as Prisma.InputJsonValue)
      : Prisma.DbNull,
    ip,
    userAgent,
  };

  if (input.tx) {
    await input.tx.auditLog.create({ data });
    return;
  }

  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    // An audit failure must never break the action the admin performed.
    console.error("[audit] write failed:", input.action, err);
  }
}

/** Log something with no signed-in actor: failed logins, cron jobs. */
export async function logSystemAudit(
  action: AuditAction,
  detail: {
    email?: string;
    entityType?: string;
    entityId?: string;
    entityLabel?: string;
    changes?: Changes;
  } = {},
): Promise<void> {
  const { ip, userAgent } = await requestContext();

  const hasChanges = detail.changes && Object.keys(detail.changes).length > 0;

  try {
    await prisma.auditLog.create({
      data: {
        actorId: null,
        actorEmail: detail.email ?? "system",
        actorName: detail.email ? "(unknown)" : "System",
        action,
        entityType: detail.entityType ?? null,
        entityId: detail.entityId ?? null,
        entityLabel: detail.entityLabel ?? null,
        changes: hasChanges
          ? (detail.changes as Prisma.InputJsonValue)
          : Prisma.DbNull,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] system write failed:", action, err);
  }
}
