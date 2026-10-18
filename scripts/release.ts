/**
 * Release step (Railway pre-deploy): migrate, then first-run setup.
 *   - Reference data (roles, permissions, categories, default settings) — idempotent, never overwrites edits.
 *   - Sample catalog — imported ONLY when the products table is empty, so admin edits are never clobbered.
 *   - BOOTSTRAP_ADMIN_EMAIL — if set and no staff account exists with that email, creates a SUPER_ADMIN
 *     with no usable password and prints a single-use, 24-hour "set your password" link to the deploy log.
 *     No password ever exists in variables, logs or the repository.
 */
import "./load-env";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/db";
import { passwordResetTokens, products, roles, users } from "../src/db/schema";
import { bootstrapReferenceData } from "../src/server/bootstrap";
import { importProducts } from "../src/server/catalog-import";
import { hashPassword, randomToken, sha256 } from "../src/lib/auth";
import { audit } from "../src/lib/audit";

async function main() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");

  await bootstrapReferenceData();
  console.log("Reference data ready.");

  const [{ n }] = await db.select({ n: count() }).from(products);
  if (Number(n) === 0) {
    const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
    const r = await importProducts(catalog.products);
    console.log(`Catalog imported: ${r.created} products, ${r.skuCount} SKUs, ${r.errors.length} errors.`);
  } else {
    console.log(`Catalog present (${n} products); not re-imported.`);
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
