import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  addresses, businessDocuments, companies, companyStatusEvents, passwordResetTokens, roles, users,
} from "@/db/schema";
import { audit } from "@/lib/audit";
import { destroyUserSessions, hashPassword, passwordIsStrong, PASSWORD_RULE, randomToken, sha256, type Actor } from "@/lib/auth";
import { badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { appUrl, queueEmail } from "./mail";
import type { StoredFile } from "./uploads";

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

export const RegistrationInput = z.object({
  legalName: z.string().trim().min(2).max(200),
  tradingName: optional(200),
  countryCode,
  registrationNumber: z.string().trim().min(2, "Company registration number is required").max(60),
  taxId: optional(60),
  businessType: z.enum(["Wholesaler", "Distributor", "Retail chain", "Electronics retailer", "Hardware reseller", "Corporate IT procurement", "Importer / exporter", "Other"]),
  website: optional(200),
  businessEmail: z.string().trim().toLowerCase().email().max(200),
  businessPhone: z.string().trim().min(6).max(40),
  expectedMonthlyVolume: optional(60),
  contactName: z.string().trim().min(2).max(120),
  jobTitle: z.string().trim().min(2).max(120),
  contactPhone: optional(40),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(12).max(200),
  billing: AddressInput,
  shipping: AddressInput,
  docTypes: z.array(z.string().max(120)).max(6).default([]),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms of trade" }) }),
  declareAuthorized: z.literal(true, { errorMap: () => ({ message: "You must confirm you are authorised to register this business" }) }),
});
export type RegistrationInput = z.infer<typeof RegistrationInput>;

const FREE_MAIL = /@(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton|protonmail|gmx|mail)\./i;

export async function registerBusiness(input: RegistrationInput, docs: StoredFile[], ip?: string) {
  if (!passwordIsStrong(input.password)) throw badRequest(PASSWORD_RULE);
  if (docs.length < 1) throw badRequest("Please upload at least one business verification document.");
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (exists.length) throw conflict("An account with this email already exists. Sign in or reset your password.");
  const roleId = (await db.select().from(roles).where(eq(roles.key, "BUYER_ADMIN")))[0]?.id;
  if (!roleId) throw new Error("Roles not seeded");
  const passwordHash = await hashPassword(input.password);
  const flags: string[] = [];
  if (FREE_MAIL.test(input.email)) flags.push("Contact uses a free webmail domain");

  const result = await db.transaction(async (tx) => {
    const co = (await tx.insert(companies).values({
      legalName: input.legalName, tradingName: input.tradingName ?? null, countryCode: input.countryCode,
      registrationNumber: input.registrationNumber, taxId: input.taxId ?? null, businessType: input.businessType,
      website: input.website ?? null, businessEmail: input.businessEmail, businessPhone: input.businessPhone,
      expectedMonthlyVolume: input.expectedMonthlyVolume ?? null, status: "PENDING_REVIEW",
      preferredCurrency: input.countryCode === "IL" ? "ILS" : ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "IE", "PT", "FI", "GR"].includes(input.countryCode) ? "EUR" : "USD",
      internalNotes: flags.length ? `Auto-flags: ${flags.join("; ")}` : null,
    }).returning())[0];
    const user = (await tx.insert(users).values({
      companyId: co.id, roleId, email: input.email, passwordHash, fullName: input.contactName, jobTitle: input.jobTitle, phone: input.contactPhone ?? null,
    }).returning())[0];
    for (const [kind, a] of [["BILLING", input.billing], ["SHIPPING", input.shipping]] as const) {
      await tx.insert(addresses).values({ companyId: co.id, kind, label: kind === "BILLING" ? "Billing" : "Primary delivery", isDefault: true, ...a, phone: a.phone ?? null, line2: a.line2 ?? null, region: a.region ?? null, postalCode: a.postalCode ?? null });
    }
    for (const [i, d] of docs.entries()) {
      await tx.insert(businessDocuments).values({ companyId: co.id, docType: input.docTypes[i] ?? "Other supporting document", uploadedById: user.id, ...d });
    }
    await tx.insert(companyStatusEvents).values({ companyId: co.id, toStatus: "PENDING_REVIEW", reason: "Business registration submitted", actorUserId: user.id });
    await audit({ userId: user.id, email: user.email }, "company.register", "company", co.id, { legalName: co.legalName, country: co.countryCode, documents: docs.length }, tx, ip);
    await queueEmail(user.email, "Valden — registration received",
      `Hello ${input.contactName},\n\nWe have received the business registration for ${input.legalName}. Our trade desk reviews every application and its documents before wholesale pricing and ordering are enabled. We will email you when the review is complete.\n\nTrack status: ${appUrl("/portal")}\n`, tx);
    return { companyId: co.id, userId: user.id };
  });
  return result;
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
