import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { companies, permissions, rolePermissions, roles, sessions, users } from "@/db/schema";
import type { Permission } from "./rbac";
import { forbidden, unauthorized } from "./errors";

export const SESSION_COOKIE = "vld_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const BCRYPT_COST = 12;

export type Actor = {
  userId: string;
  email: string;
  fullName: string;
  roleKey: string;
  isStaff: boolean;
  permissions: Set<Permission>;
  companyId: string | null;
  companyName: string | null;
  companyStatus: string | null;
  sessionId?: string;
};

export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export async function hashPassword(pw: string) { return bcrypt.hash(pw, BCRYPT_COST); }
export async function verifyPassword(pw: string, hash: string) { return bcrypt.compare(pw, hash); }

// A constant hash used to keep timing similar when the user does not exist.
const DUMMY_HASH = "$2a$12$5aJgFQTw5cC1hcmGm0aKYueUl6rH0k8YYt1H5XyVDM1G7C97Fc7r.";

export async function createSession(userId: string, meta: { ip?: string | null; userAgent?: string | null } = {}) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: sha256(token), userId, expiresAt, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 300) ?? null });
  return { token, expiresAt };
}

export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, sha256(token)));
}

export async function destroyUserSessions(userId: string, tx: DbOrTx = db) {
  await tx.delete(sessions).where(eq(sessions.userId, userId));
}

export async function loadActorByUserId(userId: string, tx: DbOrTx = db): Promise<Actor | null> {
  const rows = await tx
    .select({ u: users, roleKey: roles.key, isStaff: roles.isStaff, roleId: roles.id, cName: companies.legalName, cStatus: companies.status })
    .from(users)
    .innerJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, userId))
    .limit(1);
  const r = rows[0];
  if (!r || !r.u.isActive) return null;
  const perms = await tx
    .select({ key: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, r.roleId));
  let set = new Set(perms.map((p) => p.key as Permission));
  // Buyers only receive buyer permissions while their company is approved.
  if (!r.isStaff && r.cStatus !== "APPROVED") {
    set = new Set([...set].filter((p) => p === "company.manage"));
  }
  return {
    userId: r.u.id, email: r.u.email, fullName: r.u.fullName, roleKey: r.roleKey, isStaff: r.isStaff,
    permissions: set, companyId: r.u.companyId, companyName: r.cName ?? null, companyStatus: r.cStatus ?? null,
  };
}

export async function actorFromToken(token: string | undefined | null): Promise<Actor | null> {
  if (!token || token.length > 200) return null;
  const id = sha256(token);
  const s = await db.select().from(sessions).where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!s[0]) return null;
  const actor = await loadActorByUserId(s[0].userId);
  if (actor) actor.sessionId = id;
  return actor;
}

export type LoginResult = { ok: true; userId: string } | { ok: false; reason: "invalid" | "locked" | "inactive" };

export async function checkCredentials(emailRaw: string, password: string): Promise<LoginResult> {
  const email = emailRaw.trim().toLowerCase();
  const u = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!u) { await verifyPassword(password, DUMMY_HASH); return { ok: false, reason: "invalid" }; }
  if (u.lockedUntil && u.lockedUntil > new Date()) return { ok: false, reason: "locked" };
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) {
    const failed = u.failedLogins + 1;
    await db.update(users).set({ failedLogins: failed, lockedUntil: failed >= 8 ? new Date(Date.now() + 15 * 60_000) : null }).where(eq(users.id, u.id));
    return { ok: false, reason: failed >= 8 ? "locked" : "invalid" };
  }
  if (!u.isActive) return { ok: false, reason: "inactive" };
  await db.update(users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(users.id, u.id));
  return { ok: true, userId: u.id };
}

export function can(actor: Actor | null | undefined, p: Permission) {
  return !!actor && actor.permissions.has(p);
}
export function assertActor(actor: Actor | null | undefined): asserts actor is Actor {
  if (!actor) throw unauthorized();
}
export function assertCan(actor: Actor | null | undefined, p: Permission): asserts actor is Actor {
  assertActor(actor);
  if (!actor.permissions.has(p)) throw forbidden();
}
/** Approved buyer with a company — required for ordering/quotes. */
export function assertBuyer(actor: Actor | null | undefined, p: Permission): asserts actor is Actor & { companyId: string } {
  assertCan(actor, p);
  if (!actor.companyId || actor.companyStatus !== "APPROVED") throw forbidden("Your business account must be approved first.");
}

export const PASSWORD_RULE = "At least 12 characters, including a letter and a number.";
export function passwordIsStrong(pw: string) {
  return pw.length >= 12 && pw.length <= 200 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
