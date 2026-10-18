import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "@/db";
import {
  addresses, companies, companyStatusEvents, passwordResetTokens, roles, users,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { destroyUserSessions, hashPassword, passwordIsStrong, PASSWORD_RULE, randomToken, sha256, type Actor } from "@/lib/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { appUrl, queueEmail } from "./mail";

const countryCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a 2-letter ISO country code");
const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const AddressInput = z.object({
  contactName: z.string().trim().min(2).max(120),
  phone: optional(40),
  line1: z.string().trim().min(3).max(200),
  line2: optional(200),
  city: z.string().trim().min(2).max(100),
  region: optional(100),
  postalCode: optional(20),
  countryCode,
});

/**
 * Open-store sign-up: email + password is enough. Name, country and business details are optional;
 * businesses can add a company name and VAT number (for invoices) now or later in their account.
 */
export const RegistrationInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(12).max(200),
  fullName: optional(120),
  countryCode: countryCode.optional().or(z.literal("").transform(() => undefined)),
  phone: optional(40),
  isBusiness: z.boolean().default(false),
  companyName: optional(200),
  taxId: optional(60),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms and privacy policy" }) }),
});
export type RegistrationInput = z.input<typeof RegistrationInput>;

const nameFromEmail = (email: string) => email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 120) || "Customer";
const currencyFor = (cc: string) => (cc === "IL" ? "ILS" : ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "GR"].includes(cc) ? "EUR" : "USD");

export async function registerCustomer(raw: RegistrationInput, ip?: string) {
  const input = RegistrationInput.parse(raw);
  if (!passwordIsStrong(input.password)) throw badRequest(PASSWORD_RULE);
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (exists.length) throw conflict("An account with this email already exists. Sign in or reset your password.");
  const roleId = (await db.select().from(roles).where(eq(roles.key, "BUYER_ADMIN")))[0]?.id;
  if (!roleId) throw new Error("Roles not seeded");
  const passwordHash = await hashPassword(input.password);
  const fullName = input.fullName ?? nameFromEmail(input.email);
  const cc = input.countryCode ?? "IL";
  const business = input.isBusiness && !!input.companyName;

  return db.transaction(async (tx) => {
    // Every customer gets an account record (the "company" row) so carts, orders, addresses and
    // isolation work the same for individuals and businesses. It is active immediately.
    const co = (await tx.insert(companies).values({
      legalName: business ? input.companyName! : fullName, accountType: business ? "BUSINESS" : "PERSONAL",
      countryCode: cc, taxId: input.taxId ?? null, businessType: business ? "Business" : "Individual",
      businessEmail: input.email, businessPhone: input.phone ?? null, status: "APPROVED", approvedAt: new Date(), preferredCurrency: currencyFor(cc),
    }).returning())[0];
    const user = (await tx.insert(users).values({ companyId: co.id, roleId, email: input.email, passwordHash, fullName, phone: input.phone ?? null }).returning())[0];
    await tx.insert(companyStatusEvents).values({ companyId: co.id, toStatus: "APPROVED", reason: "Account created (self-service sign-up)", actorUserId: user.id });
    await audit({ userId: user.id, email: user.email }, "account.register", "company", co.id, { accountType: co.accountType, country: cc }, tx, ip);
    await queueEmail(user.email, "Valden — welcome",
      `Hello ${fullName},\n\nYour Valden account is ready. You can browse the catalog, add products to your cart and order — single units or large quantities.\n\nYour account: ${appUrl("/portal")}\n`, tx);
    return { companyId: co.id, userId: user.id };
  });
}

/** Customer-editable account details. Business fields are optional and used on invoices. */
export const AccountProfileInput = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: optional(40),
  countryCode,
  companyName: optional(200),
  taxId: optional(60),
});
export async function updateAccountProfile(actor: Actor, raw: unknown) {
  const companyId = actor.companyId;
  if (!companyId || actor.isStaff) throw forbidden();
  const input = AccountProfileInput.parse(raw);
  return db.transaction(async (tx) => {
    const isBusiness = !!input.companyName;
    await tx.update(users).set({ fullName: input.fullName, phone: input.phone ?? null }).where(eq(users.id, actor.userId));
    await tx.update(companies).set({
      legalName: input.companyName ?? input.fullName, accountType: isBusiness ? "BUSINESS" : "PERSONAL", businessType: isBusiness ? "Business" : "Individual",
      countryCode: input.countryCode, taxId: input.taxId ?? null, businessPhone: input.phone ?? null, updatedAt: new Date(),
    }).where(eq(companies.id, companyId));
    await audit(actor, "account.profile_update", "company", companyId, { accountType: isBusiness ? "BUSINESS" : "PERSONAL" }, tx);
    return { message: "Saved." };
  });
}

/** Address entered during checkout by a customer who has none saved yet. */
export async function saveCheckoutAddress(actor: Actor & { companyId: string }, kind: "SHIPPING" | "BILLING", raw: unknown, tx: DbOrTx = db) {
  const a = AddressInput.parse(raw);
  const has = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.companyId, actor.companyId), eq(addresses.kind, kind))).limit(1);
  const row = (await tx.insert(addresses).values({
    companyId: actor.companyId, kind, label: kind === "SHIPPING" ? "Delivery" : "Billing", isDefault: !has.length,
    contactName: a.contactName, phone: a.phone ?? null, line1: a.line1, line2: a.line2 ?? null, city: a.city, region: a.region ?? null, postalCode: a.postalCode ?? null, countryCode: a.countryCode,
  }).returning())[0];
  return row.id;
}

export type CompanyStatus = "PENDING_REVIEW" | "MORE_INFO_REQUIRED" | "APPROVED" | "REJECTED" | "SUSPENDED";
const TRANSITIONS: Record<CompanyStatus, CompanyStatus[]> = {
  PENDING_REVIEW: ["APPROVED", "REJECTED", "MORE_INFO_REQUIRED"],
  MORE_INFO_REQUIRED: ["APPROVED", "REJECTED", "PENDING_REVIEW"],
  APPROVED: ["SUSPENDED"],
  SUSPENDED: ["APPROVED", "REJECTED"],
  REJECTED: ["PENDING_REVIEW"],
};

export async function changeCompanyStatus(actor: Actor, companyId: string, to: CompanyStatus, reason: string) {
  if (!actor.permissions.has("companies.review")) throw forbidden();
  if (to !== "APPROVED" && reason.trim().length < 5) throw badRequest("Please record a reason (min. 5 characters).");
  return db.transaction(async (tx) => {
    const co = (await tx.select().from(companies).where(eq(companies.id, companyId)).for("update"))[0];
    if (!co) throw notFound("Company not found.");
    if (!TRANSITIONS[co.status].includes(to)) throw badRequest(`Cannot change status from ${co.status} to ${to}.`);
    await tx.update(companies).set({ status: to, updatedAt: new Date(), approvedAt: to === "APPROVED" ? new Date() : co.approvedAt }).where(eq(companies.id, companyId));
    await tx.insert(companyStatusEvents).values({ companyId, fromStatus: co.status, toStatus: to, reason: reason.trim() || null, actorUserId: actor.userId });
    await audit(actor, `company.${to.toLowerCase()}`, "company", companyId, { from: co.status, to, reason });
    const contacts = await tx.select().from(users).where(eq(users.companyId, companyId));
    const message: Record<CompanyStatus, string> = {
      APPROVED: "Your business account has been approved. Wholesale pricing, quotations and ordering are now available.",
      REJECTED: `Your business account application was not approved.${reason ? ` Reason: ${reason}` : ""}`,
      MORE_INFO_REQUIRED: `Our trade desk needs more information to complete your verification: ${reason}`,
      SUSPENDED: `Your business account has been suspended. Reason: ${reason}`,
      PENDING_REVIEW: "Your application has been returned to review.",
    };
    for (const u of contacts) await queueEmail(u.email, `Valden — account status: ${to.replace(/_/g, " ").toLowerCase()}`, `${message[to]}\n\n${appUrl("/portal")}`, tx);
    if (to === "SUSPENDED" || to === "REJECTED") for (const u of contacts) await destroyUserSessions(u.id, tx);
    return { from: co.status, to };
  });
}

/* ------------------------------ password recovery ------------------------------ */

export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  const u = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!u || !u.isActive) return; // do not reveal whether an account exists
  const token = randomToken(32);
  await db.insert(passwordResetTokens).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) });
  await queueEmail(u.email, "Valden — password reset", `A password reset was requested for your account. This link expires in 60 minutes and can be used once:\n\n${appUrl(`/reset-password?token=${token}`)}\n\nIf you did not request this, you can ignore this email.`);
  return token; // returned for tests only; never sent to the client
}

export async function resetPassword(token: string, password: string) {
  if (!passwordIsStrong(password)) throw badRequest(PASSWORD_RULE);
  const row = (await db.select().from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, sha256(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date()))).limit(1))[0];
  if (!row) throw badRequest("This reset link is invalid or has expired. Please request a new one.");
  await db.transaction(async (tx) => {
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
    await tx.update(users).set({ passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null }).where(eq(users.id, row.userId));
    await destroyUserSessions(row.userId, tx);
    await audit({ userId: row.userId, email: null as unknown as string }, "user.password_reset", "user", row.userId, {}, tx);
  });
}
