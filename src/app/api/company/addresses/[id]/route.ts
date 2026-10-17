import { and, eq } from "drizzle-orm";
import { route } from "@/server/http";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { badRequest, notFound } from "@/lib/errors";

export const DELETE = route<{ id: string }>(async ({ params, actor }) => {
  assertCan(actor, "company.manage");
  const a = (await db.select().from(addresses).where(and(eq(addresses.id, params.id), eq(addresses.companyId, actor.companyId!))))[0];
  if (!a) throw notFound();
  const same = await db.select().from(addresses).where(and(eq(addresses.companyId, a.companyId), eq(addresses.kind, a.kind)));
  if (same.length <= 1) throw badRequest("Keep at least one address of each type.");
  await db.delete(addresses).where(eq(addresses.id, a.id));
  await audit(actor, "address.delete", "address", a.id, {});
  return { ok: true };
});
