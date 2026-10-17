import { eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { exchangeRates, permissions, rolePermissions, roles, settings } from "@/db/schema";
import { PERMISSIONS, ROLES } from "@/lib/rbac";
import { DEFAULT_SETTINGS } from "@/lib/settings";
import { ensureCategories } from "./catalog-import";

/** Insert roles/permissions that don't exist yet. Existing matrices edited by admins are preserved. */
export async function syncRbac(tx: DbOrTx = db, opts: { resetMatrix?: boolean } = {}) {
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    await tx.insert(permissions).values({ key, description }).onConflictDoUpdate({ target: permissions.key, set: { description } });
  }
  const permRows = await tx.select().from(permissions);
  const pid = new Map(permRows.map((p) => [p.key, p.id]));
  for (const [key, r] of Object.entries(ROLES)) {
    const existing = (await tx.select().from(roles).where(eq(roles.key, key)).limit(1))[0];
    let roleId: number;
    if (existing) {
      roleId = existing.id;
      await tx.update(roles).set({ name: r.name, description: r.description, isStaff: r.isStaff }).where(eq(roles.id, roleId));
      if (!opts.resetMatrix) continue;
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    } else {
      roleId = (await tx.insert(roles).values({ key, name: r.name, description: r.description, isStaff: r.isStaff }).returning({ id: roles.id }))[0].id;
    }
    if (r.permissions.length) {
      await tx.insert(rolePermissions).values(r.permissions.map((p) => ({ roleId, permissionId: pid.get(p)! }))).onConflictDoNothing();
    }
  }
}

export async function bootstrapReferenceData() {
  await syncRbac();
  await ensureCategories();
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing();
  }
  const anyRate = await db.select({ id: exchangeRates.id }).from(exchangeRates).limit(1);
  if (!anyRate.length) {
    // Clearly-labelled SAMPLE rates so development checkout can run. Not live data.
    // Production refuses to transact on sample rates unless ALLOW_SAMPLE_DATA=true.
    await db.insert(exchangeRates).values([
      { base: "USD", quote: "EUR", rate: "0.90000000", source: "SAMPLE RATE — not live; replace in Admin › Settings", isSample: true },
      { base: "USD", quote: "ILS", rate: "3.60000000", source: "SAMPLE RATE — not live; replace in Admin › Settings", isSample: true },
    ]);
  }
}
