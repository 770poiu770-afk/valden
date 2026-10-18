/**
 * Release step (Railway pre-deploy): migrate, then first-run setup.
 *   - Reference data (roles, permissions, categories, default settings) — idempotent, never overwrites edits.
 *   - Sample catalog — only listings whose slug is not yet in the database are added; existing ones are never changed.
 *   - BOOTSTRAP_ADMIN_EMAIL — if set and no staff account exists with that email, creates a SUPER_ADMIN
 *     with no usable password and prints a single-use, 24-hour "set your password" link to the deploy log.
 *     No password ever exists in variables, logs or the repository.
 */
import "./load-env";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/db";
import { passwordResetTokens, products, roles, settings, users } from "../src/db/schema";
import { bootstrapReferenceData } from "../src/server/bootstrap";
import { importProducts } from "../src/server/catalog-import";
import { hashPassword, randomToken, sha256 } from "../src/lib/auth";
import { audit } from "../src/lib/audit";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

async function main() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  await bootstrapReferenceData();
  console.log("Reference data ready.");

  // Open-store change (Oct 2026): the old B2B default minimum order value (₪50,000) is removed.
  // Only a value still equal to that old default is cleared; a minimum set deliberately by staff is kept.
  const mov = (await db.select().from(settings).where(eq(settings.key, "minimumOrderValue")))[0];
  const v = mov?.value as { amountMinor?: number; currency?: string } | undefined;
  if (v && v.amountMinor === 5_000_000 && v.currency === "ILS") {
    await db.update(settings).set({ value: { amountMinor: 0, currency: "ILS" }, updatedAt: new Date() }).where(eq(settings.key, "minimumOrderValue"));
    console.log("Minimum order value: old B2B default (₪50,000) removed.");
  }

  // Pay-now checkout (Oct 2026): first-order / new-account reviews and mandatory confirmation were B2B
  // defaults that sent every order to manual review, so customers could never pay right away.
  // Only values still equal to the old defaults are changed; anything staff edited is kept.
  const rules = (await db.select().from(settings).where(eq(settings.key, "orderRules")))[0];
  const r = rules?.value as Record<string, unknown> | undefined;
  if (r && r.requireOrderConfirmation === true && r.reviewFirstOrder === true && r.newCompanyReviewDays === 30) {
    await db.update(settings).set({ value: { ...r, requireOrderConfirmation: false, reviewFirstOrder: false, newCompanyReviewDays: 0 }, updatedAt: new Date() }).where(eq(settings.key, "orderRules"));
    console.log("Order rules: old B2B review defaults removed (orders above the value threshold are still reviewed).");
  }
  const ship = (await db.select().from(settings).where(eq(settings.key, "shippingMethods")))[0];
  const methods = ship?.value as { code: string }[] | undefined;
  if (methods && methods.map((m) => m.code).join(",") === "VALDEN_FREIGHT,BUYER_FORWARDER") {
    await db.update(settings).set({ value: [DEFAULT_SETTINGS.shippingMethods[0], ...methods], updatedAt: new Date() }).where(eq(settings.key, "shippingMethods"));
    console.log("Shipping: flat-rate standard delivery added (edit the amount in Admin › Settings).");
  }

  // Add listings that are new in data/catalog.json; never touch existing ones (staff may have edited them).
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8")) as { products: { slug: string }[] };
  const existing = new Set((await db.select({ slug: products.slug }).from(products)).map((r) => r.slug));
  const missing = catalog.products.filter((p) => !existing.has(p.slug));
  if (missing.length) {
    const r = await importProducts(missing);
    console.log(`Catalog: added ${r.created} new listings (${r.skuCount} SKUs), ${r.errors.length} errors; ${existing.size} existing listings untouched.`);
    for (const e of r.errors.slice(0, 10)) console.log("  !", e.row, e.message);
  } else {
    console.log(`Catalog up to date (${existing.size} listings).`);
  }

  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (email) {
    const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
    if (existing) {
      console.log("Bootstrap admin already exists; nothing to do.");
    } else {
      const role = (await db.select().from(roles).where(eq(roles.key, "SUPER_ADMIN")).limit(1))[0];
      const unusable = await hashPassword(randomBytes(32).toString("base64url") + "Aa1");
      const u = (await db.insert(users).values({ email, fullName: process.env.BOOTSTRAP_ADMIN_NAME || "Owner", roleId: role.id, passwordHash: unusable }).returning())[0];
      const token = randomToken(32);
      await db.insert(passwordResetTokens).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 24 * 3600_000) });
      await audit(null, "staff.bootstrap_admin", "user", u.id, { email });
      const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
      console.log(`Bootstrap SUPER_ADMIN created for ${email}. Set the password (single use, expires in 24h): ${base}/reset-password?token=${token}`);
    }
  }
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
