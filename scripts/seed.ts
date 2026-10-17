/**
 * Seed reference data and the sample catalog.
 *   npm run db:seed            → roles, permissions, categories, settings, sample FX rates, catalog
 *   npm run db:seed -- --demo  → additionally creates fictional demo buyer companies (development only)
 */
import "./load-env";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { addresses, companies, companyStatusEvents, roles, users } from "../src/db/schema";
import { bootstrapReferenceData } from "../src/server/bootstrap";
import { importProducts } from "../src/server/catalog-import";
import { hashPassword } from "../src/lib/auth";

async function main() {
  const demo = process.argv.includes("--demo");
  await bootstrapReferenceData();
  console.log("Reference data ready (roles, permissions, categories, settings, sample FX).");

  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
  const report = await importProducts(catalog.products);
  console.log(`Catalog: ${report.created} created, ${report.updated} updated, ${report.skuCount} SKUs, ${report.errors.length} errors`);
  for (const e of report.errors.slice(0, 10)) console.log("  !", e.row, e.message);

  if (demo) {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to create demo accounts with NODE_ENV=production");
    const password = process.env.DEMO_PASSWORD || randomBytes(9).toString("base64url") + "7a";
    const roleId = async (k: string) => (await db.select().from(roles).where(eq(roles.key, k)))[0].id;
    const demoCos = [
      { legalName: "Northwind Distribution Ltd (DEMO)", countryCode: "IL", status: "APPROVED" as const, email: "buyer@northwind.demo", contact: "Dana Levi", city: "Tel Aviv", approvedDaysAgo: 120 },
      { legalName: "Harbor Tech Trading GmbH (DEMO)", countryCode: "DE", status: "APPROVED" as const, email: "buyer@harbortech.demo", contact: "Jonas Weber", city: "Hamburg", approvedDaysAgo: 90 },
      { legalName: "Pending Electronics Ltd (DEMO)", countryCode: "GB", status: "PENDING_REVIEW" as const, email: "buyer@pending.demo", contact: "Amelia Clarke", city: "London", approvedDaysAgo: 0 },
    ];
    for (const c of demoCos) {
      const exists = (await db.select().from(users).where(eq(users.email, c.email)).limit(1))[0];
      if (exists) { await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, exists.id)); continue; }
      const approvedAt = c.status === "APPROVED" ? new Date(Date.now() - c.approvedDaysAgo * 86400_000) : null;
      const co = (await db.insert(companies).values({
        legalName: c.legalName, countryCode: c.countryCode, registrationNumber: "DEMO-000000", businessType: "Distributor",
        businessEmail: c.email, businessPhone: "+000 000 0000", status: c.status, approvedAt, preferredCurrency: c.countryCode === "IL" ? "ILS" : c.countryCode === "DE" ? "EUR" : "USD",
        internalNotes: "Fictional demo company created by seed script.",
      }).returning())[0];
      await db.insert(companyStatusEvents).values({ companyId: co.id, toStatus: "PENDING_REVIEW", reason: "Registered (demo seed)" });
      if (c.status === "APPROVED") await db.insert(companyStatusEvents).values({ companyId: co.id, fromStatus: "PENDING_REVIEW", toStatus: "APPROVED", reason: "Approved (demo seed)" });
      await db.insert(users).values({ companyId: co.id, roleId: await roleId("BUYER_ADMIN"), email: c.email, passwordHash: await hashPassword(password), fullName: c.contact, jobTitle: "Head of Purchasing" });
      for (const kind of ["BILLING", "SHIPPING"] as const) {
        await db.insert(addresses).values({ companyId: co.id, kind, label: kind === "BILLING" ? "Head office" : "Main warehouse", contactName: c.contact, line1: "1 Demo Street", city: c.city, countryCode: c.countryCode, isDefault: true });
      }
    }
    console.log(`Demo buyers: buyer@northwind.demo, buyer@harbortech.demo (approved), buyer@pending.demo (pending). Password: ${process.env.DEMO_PASSWORD ? "(from DEMO_PASSWORD)" : password}`);
  }
  await pool.end();
}
main().catch(async (e) => { console.error(e); await pool.end(); process.exit(1); });
