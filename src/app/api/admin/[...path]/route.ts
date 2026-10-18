/**
 * Administrative API. Every handler checks its own permission (defence in depth: the dispatcher
 * also requires `admin.access`). Mutations are audited inside the service functions.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businessDocuments, companies, exchangeRates, inquiries, permissions, rolePermissions, roles, users } from "@/db/schema";
import { errorResponse, readBody, route } from "@/server/http";
import { assertCan, destroyUserSessions, hashPassword, randomToken, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { badRequest, forbidden, notFound } from "@/lib/errors";
import { setSetting, SettingsSchema, type AppSettings } from "@/lib/settings";
import { changeCompanyStatus, requestPasswordReset } from "@/server/accounts";
import { createProduct, deleteContractPrice, recordReferencePrice, setContractPrice, setTiers, updateProduct, upsertVariant } from "@/server/admin-catalog";
import { exportPricesCsv, importPricesCsv, importProducts, parseCatalogCsv, recomputeAllPrices, CATALOG_CSV_COLUMNS } from "@/server/catalog-import";
import { issueOffer, startReview } from "@/server/quotes";
import { addOrderNote, cancelOrder, confirmOrder, createShipment, rejectOrder, setProcessing, updateShipment } from "@/server/orders";
import { issueRefund, reconcilePayPalPayment, recordManualPayment } from "@/server/payments";

type H = (a: Actor, p: string[], body: () => Promise<Record<string, unknown>>, req: NextRequest) => Promise<unknown>;
const uuid = (s: string) => { if (!/^[0-9a-f-]{36}$/i.test(s)) throw notFound(); return s; };

const POST_ROUTES: [RegExp, H][] = [
  [/^companies\/([^/]+)\/status$/, async (a, [id], body) => {
    const b = z.object({ to: z.enum(["APPROVED", "REJECTED", "SUSPENDED", "MORE_INFO_REQUIRED", "PENDING_REVIEW"]), reason: z.string().max(1000).default("") }).parse(await body());
    return changeCompanyStatus(a, uuid(id), b.to, b.reason);
  }],
  [/^companies\/([^/]+)\/profile$/, async (a, [id], body) => {
    assertCan(a, "customers.manage");
    const b = z.object({ internalNotes: z.string().max(5000).optional(), preferredCurrency: z.enum(["USD", "EUR", "ILS"]).optional(), legalName: z.string().trim().min(2).max(200).optional(), taxId: z.string().max(60).optional(), registrationNumber: z.string().max(60).optional() }).parse(await body());
    await db.update(companies).set({ ...b, updatedAt: new Date() }).where(eq(companies.id, uuid(id)));
    await audit(a, "company.update", "company", id, { fields: Object.keys(b) });
    return { message: "Saved." };
  }],
  [/^companies\/([^/]+)\/contract-prices$/, async (a, [id], body) => { await setContractPrice(a, uuid(id), await body()); return { message: "Contract price saved." }; }],
  [/^contract-prices\/(\d+)\/delete$/, async (a, [id]) => { await deleteContractPrice(a, Number(id)); return {}; }],
  [/^companies\/([^/]+)\/users$/, async (a, [id], body) => {
    assertCan(a, "customers.manage");
    const b = z.object({ fullName: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email(), jobTitle: z.string().trim().max(120).optional(), role: z.enum(["BUYER", "BUYER_ADMIN"]) }).parse(await body());
    const role = (await db.select().from(roles).where(eq(roles.key, b.role)))[0];
    const u = (await db.insert(users).values({ companyId: uuid(id), roleId: role.id, email: b.email, fullName: b.fullName, jobTitle: b.jobTitle ?? null, passwordHash: await hashPassword(randomToken(24)) }).onConflictDoNothing().returning())[0];
    if (!u) throw badRequest("A user with that email already exists.");
    await requestPasswordReset(b.email); // user sets their own password via emailed single-use link
    await audit(a, "user.create_buyer", "user", u.id, { companyId: id, role: b.role });
    return { message: "User created. A password-setup link has been emailed." };
  }],
  [/^documents\/([^/]+)\/review$/, async (a, [id], body) => {
    assertCan(a, "companies.review");
    const b = z.object({ status: z.enum(["ACCEPTED", "REJECTED", "PENDING"]), reviewNote: z.string().max(500).optional() }).parse(await body());
    await db.update(businessDocuments).set({ status: b.status, reviewNote: b.reviewNote || null }).where(eq(businessDocuments.id, uuid(id)));
    await audit(a, "document.review", "document", id, b);
    return {};
  }],
  // catalog & pricing
  [/^products$/, async (a, _p, body) => { const p = await createProduct(a, await body()); return { redirect: `/admin/products/${p.id}` }; }],
  [/^products\/([^/]+)$/, async (a, [id], body) => { await updateProduct(a, uuid(id), await body()); return { message: "Product saved." }; }],
  [/^products\/([^/]+)\/variants$/, async (a, [id], body) => { await upsertVariant(a, uuid(id), await body()); return { message: "SKU saved." }; }],
  [/^products\/([^/]+)\/tiers$/, async (a, [id], body) => { await setTiers(a, uuid(id), await body()); return { message: "Tiers saved." }; }],
  [/^products\/([^/]+)\/reference$/, async (a, [id], body) => { await recordReferencePrice(a, uuid(id), await body()); return { message: "Reference price recorded and wholesale price recalculated." }; }],
  [/^pricing\/policy$/, async (a, _p, body) => {
    assertCan(a, "pricing.manage");
    const b = await body();
    const num = (k: string) => Number(b[k]);
    const tierSchedule = String(b.tierSchedule ?? "").split(",").map((x) => x.trim()).filter(Boolean).map((x) => { const [m, d] = x.split(":"); return { moqMultiple: Number(m), discountBps: Math.round(Number(d) * 100) }; });
    const policy = SettingsSchema.shape.pricingPolicy.parse({
      targetPremiumMinor: Math.round(num("targetPremium") * 100), minPremiumMinor: Math.round(num("minPremium") * 100), maxPremiumMinor: Math.round(num("maxPremium") * 100),
      maxPremiumPercentBps: Math.round(num("maxPremiumPercent") * 100), fallbackMode: b.fallbackMode, fallbackMarkupBps: Math.round(num("fallbackMarkupPercent") * 100), tierSchedule,
    });
    await setSetting("pricingPolicy", policy, a.userId);
    await audit(a, "settings.pricing_policy", "settings", "pricingPolicy", policy);
    const r = b.recompute ? await recomputeAllPrices(a.userId) : null;
    return { message: r ? `Policy saved. ${r.changed} of ${r.total} prices changed.` : "Policy saved. Run “Recalculate all prices” to apply it." };
  }],
  [/^pricing\/recompute$/, async (a) => { assertCan(a, "pricing.manage"); const r = await recomputeAllPrices(a.userId); await audit(a, "pricing.recompute_all", "settings", null, r); return { message: `Recalculated ${r.total} products; ${r.changed} prices changed.` }; }],
  [/^pricing\/import$/, async (a, _p, _b, req) => {
    assertCan(a, "pricing.manage");
    const f = (await req.formData()).get("file");
    if (!f || typeof f === "string" || f.size > 5_000_000) throw badRequest("Upload a CSV file up to 5MB.");
    const r = await importPricesCsv(await f.text(), a.userId);
    await audit(a, "pricing.csv_import", "settings", null, { updated: r.updated, unchanged: r.unchanged, errors: r.errors.length });
    return { message: `${r.updated} updated, ${r.unchanged} unchanged, ${r.errors.length} errors.`, details: r.errors.slice(0, 20).map((e) => `${e.row}: ${e.message}`) };
  }],
  [/^catalog\/import$/, async (a, _p, _b, req) => {
    assertCan(a, "catalog.manage");
    const f = (await req.formData()).get("file");
    if (!f || typeof f === "string" || f.size > 10_000_000) throw badRequest("Upload a CSV or JSON file up to 10MB.");
    const text = await f.text();
    let rows: unknown[]; let parseErrors: { row: string; message: string }[] = [];
    if (f.name.endsWith(".json")) { const j = JSON.parse(text); rows = Array.isArray(j) ? j : j.products; } else { const p = parseCatalogCsv(text); rows = p.products; parseErrors = p.errors; }
    const r = await importProducts(rows, { actorId: a.userId });
    await audit(a, "catalog.import", "settings", null, { created: r.created, updated: r.updated, errors: r.errors.length });
    const errs = [...parseErrors, ...r.errors];
    return { message: `${r.created} created, ${r.updated} updated, ${r.skuCount} SKUs, ${errs.length} errors.`, details: errs.slice(0, 20).map((e) => `${e.row}: ${e.message}`) };
  }],
  // quotes
  [/^quotes\/([^/]+)\/review$/, async (a, [id]) => { await startReview(a, uuid(id)); return {}; }],
  [/^quotes\/([^/]+)\/offer$/, async (a, [id], body) => { await issueOffer(a, uuid(id), await body()); return { message: "Offer issued and the buyer notified." }; }],
  // orders
  [/^orders\/([^/]+)\/confirm$/, async (a, [id], body) => { const b = z.object({ shippingAmount: z.string().optional(), estimateNote: z.string().max(300).optional(), note: z.string().max(2000).optional() }).parse(await body()); await confirmOrder(a, uuid(id), b); return { message: "Order confirmed; buyer asked to pay." }; }],
  [/^orders\/([^/]+)\/reject$/, async (a, [id], body) => { const b = z.object({ reason: z.string() }).parse(await body()); await rejectOrder(a, uuid(id), b.reason); return {}; }],
  [/^orders\/([^/]+)\/cancel$/, async (a, [id], body) => { const b = z.object({ reason: z.string().default("") }).parse(await body()); await cancelOrder(a, uuid(id), b.reason); return {}; }],
  [/^orders\/([^/]+)\/processing$/, async (a, [id]) => { await setProcessing(a, uuid(id)); return {}; }],
  [/^orders\/([^/]+)\/note$/, async (a, [id], body) => { const b = z.object({ message: z.string(), visibleToBuyer: z.coerce.boolean().default(false) }).parse(await body()); await addOrderNote(a, uuid(id), b.message, b.visibleToBuyer); return {}; }],
  [/^orders\/([^/]+)\/manual-payment$/, async (a, [id], body) => { const b = z.object({ amount: z.string(), reference: z.string(), note: z.string().optional() }).parse(await body()); await recordManualPayment(a, uuid(id), b); return { message: "Payment recorded." }; }],
  [/^payments\/([^/]+)\/reconcile$/, async (a, [id]) => { const r = await reconcilePayPalPayment(a, uuid(id)); return { message: `Checked with PayPal: ${r.status.toLowerCase()}.` }; }],
  [/^orders\/([^/]+)\/refunds$/, async (a, [id], body) => { const b = z.object({ amount: z.string(), reason: z.string(), manualReference: z.string().optional() }).parse(await body()); const r = await issueRefund(a, uuid(id), b); return { message: `Refund ${r.status.toLowerCase()}.` }; }],
  [/^orders\/([^/]+)\/shipments$/, async (a, [id], body) => {
    const b = await body();
    const lines = Object.entries(b).filter(([k]) => k.startsWith("qty_")).map(([k, v]) => ({ orderItemId: Number(k.slice(4)), quantity: Number(v) || 0 }));
    await createShipment(a, uuid(id), { ...(b as Record<string, never>), lines, estimateConfirmed: b.estimateConfirmed === true || b.estimateConfirmed === "true" } as never);
    return { message: "Shipment created." };
  }],
  [/^shipments\/([^/]+)$/, async (a, [id], body) => { const b = z.object({ status: z.string().optional(), trackingNumber: z.string().optional(), carrier: z.string().optional(), estimatedDelivery: z.string().optional(), estimateConfirmed: z.coerce.boolean().optional() }).parse(await body()); await updateShipment(a, uuid(id), b); return { message: "Shipment updated." }; }],
  // users & roles
  [/^users$/, async (a, _p, body) => {
    assertCan(a, "users.manage");
    const b = z.object({ fullName: z.string().trim().min(2), email: z.string().trim().toLowerCase().email(), role: z.string() }).parse(await body());
    const role = (await db.select().from(roles).where(eq(roles.key, b.role)))[0];
    if (!role?.isStaff) throw badRequest("Choose a staff role.");
    if (role.key === "SUPER_ADMIN" && a.roleKey !== "SUPER_ADMIN") throw forbidden("Only a super administrator can create another.");
    const u = (await db.insert(users).values({ email: b.email, fullName: b.fullName, roleId: role.id, passwordHash: await hashPassword(randomToken(24)) }).onConflictDoNothing().returning())[0];
    if (!u) throw badRequest("A user with that email already exists.");
    await requestPasswordReset(b.email);
    await audit(a, "staff.create", "user", u.id, { role: b.role });
    return { message: "Staff user created. A password-setup link has been emailed." };
  }],
  [/^users\/([^/]+)$/, async (a, [id], body) => {
    assertCan(a, "users.manage");
    const b = z.object({ role: z.string().optional(), isActive: z.coerce.boolean().optional() }).parse(await body());
    if (id === a.userId && (b.isActive === false || b.role)) throw badRequest("You cannot change your own role or deactivate yourself.");
    const target = (await db.select({ u: users, staff: roles.isStaff }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(eq(users.id, uuid(id))))[0];
    if (!target) throw notFound();
    const patch: Partial<typeof users.$inferInsert> = {};
    if (b.role) {
      const role = (await db.select().from(roles).where(eq(roles.key, b.role)))[0];
      if (!role || role.isStaff !== target.staff) throw badRequest("Role type mismatch (staff vs buyer).");
      if (role.key === "SUPER_ADMIN" && a.roleKey !== "SUPER_ADMIN") throw forbidden();
      patch.roleId = role.id;
    }
    if (b.isActive !== undefined) patch.isActive = b.isActive;
    await db.update(users).set(patch).where(eq(users.id, id));
    if (b.isActive === false || b.role) await destroyUserSessions(id);
    await audit(a, "user.update", "user", id, b);
    return { message: "User updated." };
  }],
  [/^roles\/(\d+)\/permissions$/, async (a, [id], body) => {
    assertCan(a, "users.manage");
    if (a.roleKey !== "SUPER_ADMIN") throw forbidden("Only super administrators can change the permission matrix.");
    const b = await body();
    const keys = ([] as string[]).concat((b["perm+"] as string[] | string | undefined) ?? []);
    const role = (await db.select().from(roles).where(eq(roles.id, Number(id))))[0];
    if (!role) throw notFound();
    if (role.key === "SUPER_ADMIN" && !keys.includes("users.manage")) throw badRequest("Super administrators must keep users.manage.");
    const all = await db.select().from(permissions);
    await db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
      const ids = all.filter((p) => keys.includes(p.key)).map((p) => ({ roleId: role.id, permissionId: p.id }));
      if (ids.length) await tx.insert(rolePermissions).values(ids);
      await audit(a, "role.permissions_set", "role", String(role.id), { role: role.key, permissions: keys }, tx);
    });
    return { message: "Permissions updated." };
  }],
  // settings
  [/^settings\/([a-zA-Z]+)$/, async (a, [key], body) => {
    assertCan(a, "settings.manage");
    if (!(key in SettingsSchema.shape) || key === "pricingPolicy") throw notFound();
    const b = await body();
    const value = coerceSetting(key as keyof AppSettings, b);
    await setSetting(key as keyof AppSettings, value as never, a.userId);
    await audit(a, `settings.${key}`, "settings", key, { value });
    return { message: "Settings saved." };
  }],
  [/^fx$/, async (a, _p, body) => {
    assertCan(a, "settings.manage");
    const b = z.object({ quote: z.enum(["EUR", "ILS"]), rate: z.string().regex(/^\d+(\.\d{1,8})?$/, "Up to 8 decimal places"), source: z.string().trim().min(3).max(200), effectiveAt: z.string().optional() }).parse(await body());
    const r = Number(b.rate);
    if (!(r > 0) || r > 1000) throw badRequest("Rate looks wrong.");
    const effectiveAt = b.effectiveAt ? new Date(b.effectiveAt) : new Date();
    await db.insert(exchangeRates).values({ base: "USD", quote: b.quote, rate: b.rate, source: b.source, isSample: false, effectiveAt, createdById: a.userId });
    await audit(a, "fx.rate_recorded", "settings", "fx", b);
    return { message: `USD→${b.quote} rate recorded.` };
  }],
  [/^inquiries\/(\d+)$/, async (a, [id], body) => {
    assertCan(a, "customers.manage");
    const b = z.object({ status: z.enum(["NEW", "IN_PROGRESS", "CLOSED"]) }).parse(await body());
    await db.update(inquiries).set({ status: b.status }).where(eq(inquiries.id, Number(id)));
    return {};
  }],
];

function coerceSetting(key: keyof AppSettings, b: Record<string, unknown>): unknown {
  const n = (k: string) => Math.round(Number(b[k]) * 100);
  const bool = (k: string) => b[k] === true || b[k] === "true" || b[k] === "on";
  switch (key) {
    case "minimumOrderValue": case "targetOrderValue": return { amountMinor: n("amount"), currency: b.currency };
    case "enabledCurrencies": return ([] as unknown[]).concat(b["currency+"] ?? []);
    case "taxRules": {
      const byCountry: Record<string, number> = {};
      for (const part of String(b.byCountry ?? "").split(",").map((x) => x.trim()).filter(Boolean)) { const [c, r] = part.split(":"); byCountry[c.trim().toUpperCase()] = Math.round(Number(r) * 100); }
      return { byCountry, defaultRateBps: n("defaultRate"), note: String(b.note ?? "") };
    }
    case "orderRules": return { requireOrderConfirmation: bool("requireOrderConfirmation"), riskReviewThresholdBaseMinor: n("riskThreshold"), newCompanyReviewDays: Number(b.newCompanyReviewDays), reviewFirstOrder: bool("reviewFirstOrder") };
    case "payments": return { paypalEnabled: bool("paypalEnabled"), paypalMaxOrderBaseMinor: n("paypalMax"), manualTransferEnabled: bool("manualTransferEnabled"), manualTransferInstructions: String(b.manualTransferInstructions ?? "") };
    case "quoteDefaults": return { offerValidityDays: Number(b.offerValidityDays) };
    case "shippingMethods": return JSON.parse(String(b.json ?? "[]"));
    default: throw badRequest("Unsupported setting.");
  }
}

async function dispatch(req: NextRequest, path: string[], a: Actor | null) {
  if (!a) throw forbidden();
  assertCan(a, "admin.access");
  const p = path.join("/");
  for (const [re, h] of POST_ROUTES) {
    const m = p.match(re);
    if (m) {
      let cached: Record<string, unknown> | null = null;
      return h(a, m.slice(1), async () => (cached ??= await readBody(req)), req);
    }
  }
  throw notFound("Unknown admin endpoint.");
}

export const POST = route<{ path: string[] }>(async ({ req, params, actor }) => dispatch(req, params.path, actor));

/** CSV exports (GET). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { currentActor } = await import("@/server/http");
    const a = await currentActor();
    const p = (await ctx.params).path.join("/");
    if (p === "pricing/export") {
      assertCan(a, "pricing.manage");
      const csv = await exportPricesCsv();
      await audit(a, "pricing.csv_export", "settings", null, {});
      return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="valden-prices-${new Date().toISOString().slice(0, 10)}.csv"` } });
    }
    if (p === "catalog/template") {
      assertCan(a, "catalog.manage");
      return new NextResponse(CATALOG_CSV_COLUMNS.join(",") + "\n", { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="valden-catalog-template.csv"' } });
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) { return errorResponse(e); }
}
