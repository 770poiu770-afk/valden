import { db, type DbOrTx } from "@/db";
import { auditLogs } from "@/db/schema";
import type { Actor } from "./auth";

function jsonSafe(v: unknown): unknown {
  return JSON.parse(JSON.stringify(v ?? {}, (_k, val) => (typeof val === "bigint" ? val.toString() : val)));
}

export async function audit(
  actor: Pick<Actor, "userId" | "email"> | null,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
  tx: DbOrTx = db,
  ip?: string | null,
) {
  await tx.insert(auditLogs).values({
    actorUserId: actor?.userId ?? null,
    actorEmail: actor?.email ?? null,
    action, entityType, entityId,
    details: jsonSafe(details) as object,
    ip: ip ?? null,
  });
}
