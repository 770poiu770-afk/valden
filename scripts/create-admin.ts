/**
 * Create or reset a staff account.
 *   ADMIN_PASSWORD='…' npm run admin:create -- --email ops@yourco.com --name "Ops Lead" [--role SUPER_ADMIN]
 * If ADMIN_PASSWORD is not set, a strong password is generated and printed once.
 * Credentials are never written to the repository.
 */
import "./load-env";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, pool } from "../src/db";
import { roles, users } from "../src/db/schema";
import { hashPassword, passwordIsStrong, PASSWORD_RULE } from "../src/lib/auth";
import { syncRbac } from "../src/server/bootstrap";
import { audit } from "../src/lib/audit";

function arg(name: string) { const i = process.argv.indexOf(`--${name}`); return i > -1 ? process.argv[i + 1] : undefined; }

async function main() {
  const email = arg("email")?.toLowerCase();
  const name = arg("name") ?? "Administrator";
  const roleKey = arg("role") ?? "SUPER_ADMIN";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Usage: npm run admin:create -- --email you@company.com --name \"Full Name\" [--role SUPER_ADMIN]");
  await syncRbac();
  const role = (await db.select().from(roles).where(eq(roles.key, roleKey)))[0];
  if (!role || !role.isStaff) throw new Error(`Unknown staff role ${roleKey}`);
  const generated = !process.env.ADMIN_PASSWORD;
  const password = process.env.ADMIN_PASSWORD || `${randomBytes(12).toString("base64url")}9a`;
  if (!passwordIsStrong(password)) throw new Error(`ADMIN_PASSWORD too weak. ${PASSWORD_RULE}`);
  const hash = await hashPassword(password);
  const existing = (await db.select().from(users).where(eq(users.email, email)))[0];
  if (existing) {
    if (existing.companyId) throw new Error("That email belongs to a buyer account.");
    await db.update(users).set({ passwordHash: hash, roleId: role.id, isActive: true, failedLogins: 0, lockedUntil: null }).where(eq(users.id, existing.id));
    await audit(null, "staff.reset_via_cli", "user", existing.id, { email, role: roleKey });
    console.log(`Updated staff user ${email} (${roleKey}).`);
  } else {
    const u = (await db.insert(users).values({ email, fullName: name, roleId: role.id, passwordHash: hash }).returning())[0];
    await audit(null, "staff.create_via_cli", "user", u.id, { email, role: roleKey });
    console.log(`Created staff user ${email} (${roleKey}).`);
  }
  if (generated) console.log(`Generated password (shown once, store it in your password manager): ${password}`);
  await pool.end();
}
main().catch(async (e) => { console.error(e.message); await pool.end(); process.exit(1); });
