import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { route, readBody } from "@/server/http";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { AddressInput } from "@/server/accounts";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const POST = route(async ({ req, actor }) => {
  assertCan(actor, "company.manage");
  const b = AddressInput.extend({ kind: z.enum(["BILLING", "SHIPPING"]), label: z.string().trim().min(1).max(60), isDefault: z.coerce.boolean().optional() }).parse(await readBody(req));
  const companyId = actor.companyId!;
  await db.transaction(async (tx) => {
    if (b.isDefault) await tx.update(addresses).set({ isDefault: false }).where(and(eq(addresses.companyId, companyId), eq(addresses.kind, b.kind)));
    const a = (await tx.insert(addresses).values({ companyId, ...b, phone: b.phone ?? null, line2: b.line2 ?? null, region: b.region ?? null, postalCode: b.postalCode ?? null, isDefault: !!b.isDefault }).returning())[0];
    await audit(actor, "address.create", "address", a.id, { kind: b.kind }, tx);
  });
  return { ok: true, message: "Address added." };
});
