import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, contractPrices, priceTiers, products, referencePriceObservations, variants } from "@/db/schema";
import { assertCan, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { decimalStringToMinor } from "@/lib/money";
import { computeWholesale } from "@/lib/pricing";
import { getSettings } from "@/lib/settings";
import { rebuildTiers } from "./catalog-import";

const money = (v?: string | null) => (v === undefined || v === null || v.trim() === "" ? null : Number(decimalStringToMinor(v)));
const optStr = (max: number) => z.string().trim().max(max).optional().transform((v) => (v === undefined ? undefined : v || null));

export const ProductUpdate = z.object({
  name: z.string().trim().min(3).max(200).optional(),
  manufacturer: z.string().trim().min(1).max(80).optional(),
  model: z.string().trim().min(1).max(160).optional(),
  subcategory: z.string().trim().min(1).max(80).optional(),
  categorySlug: z.string().optional(),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).optional(),
  summary: z.string().trim().max(2000).optional(),
  moq: z.coerce.number().int().min(1).max(100000).optional(),
  orderIncrement: z.coerce.number().int().min(1).max(10000).optional(),
  casePack: z.string().optional(), cartonQty: z.string().optional(), palletQty: z.string().optional(),
  availability: z.enum(["INDICATIVE_AVAILABLE", "LIMITED_CONFIRM", "BUILD_TO_ORDER", "PRE_ORDER", "ON_REQUEST", "UNAVAILABLE"]).optional(),
  availableQty: z.string().optional(),
  availabilityVerified: z.coerce.boolean().optional(),
  leadTime: optStr(200), regionCompatibility: optStr(500), shippingRestrictions: optStr(500), warrantyInfo: optStr(500),
  warrantyVerified: z.coerce.boolean().optional(), origin: optStr(120), imageUrl: optStr(500), imageKey: z.string().max(40).optional(),
  supplierSku: optStr(120), internalNotes: optStr(4000),
  isActive: z.coerce.boolean().optional(), purchasable: z.coerce.boolean().optional(), isSample: z.coerce.boolean().optional(),
  // pricing inputs
  overridePrice: z.string().optional(), markupPercent: z.string().optional(),
  specsText: z.string().max(20000).optional(),
});

function parseIntOrNull(v?: string) { if (v === undefined) return undefined; if (v.trim() === "") return null; const n = Number(v); if (!Number.isInteger(n) || n < 0) throw badRequest("Quantities must be whole numbers."); return n; }

export async function updateProduct(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "catalog.manage");
  const b = ProductUpdate.parse(raw);
  const s = await getSettings();
  return db.transaction(async (tx) => {
    const p = (await tx.select().from(products).where(eq(products.id, id)).for("update"))[0];
    if (!p) throw notFound();
    const patch: Partial<typeof products.$inferInsert> = { updatedAt: new Date() };
    for (const k of ["name", "manufacturer", "model", "subcategory", "condition", "summary", "moq", "orderIncrement", "availability", "availabilityVerified", "leadTime", "regionCompatibility", "shippingRestrictions", "warrantyInfo", "warrantyVerified", "origin", "imageUrl", "imageKey", "supplierSku", "internalNotes", "isActive", "isSample"] as const) {
      if (b[k] !== undefined) (patch as Record<string, unknown>)[k] = b[k];
    }
    if (b.imageUrl && !/^https:\/\//.test(b.imageUrl) && !b.imageUrl.startsWith("/")) throw badRequest("Image URL must be https:// or a site-relative path.");
    for (const k of ["casePack", "cartonQty", "palletQty", "availableQty"] as const) { const v = parseIntOrNull(b[k]); if (v !== undefined) (patch as Record<string, unknown>)[k] = v; }
    if (b.categorySlug) {
      const c = (await tx.select().from(categories).where(eq(categories.slug, b.categorySlug)))[0];
      if (!c) throw badRequest("Unknown category.");
      patch.categoryId = c.id;
    }
    if (b.specsText !== undefined) {
      patch.specs = b.specsText.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x.length === 3 && x[2]).map(([group, label, value]) => ({ group, label, value }));
    }
    // pricing / activation (requires pricing permission)
    const pricingTouched = b.overridePrice !== undefined || b.markupPercent !== undefined || b.purchasable !== undefined || patch.moq !== undefined;
    if (b.overridePrice !== undefined || b.markupPercent !== undefined || b.purchasable !== undefined) assertCan(actor, "pricing.manage");
    const overrideCents = b.overridePrice !== undefined ? money(b.overridePrice) : p.overrideCents;
    const markupBps = b.markupPercent !== undefined ? money(b.markupPercent) : p.markupBps;
    if ((overrideCents !== null && overrideCents <= 0) || (markupBps !== null && (markupBps < 0 || markupBps > 100000))) throw badRequest("Invalid override or markup.");
    if (b.purchasable === true && p.pricingFlag === "NEEDS_REVIEW" && overrideCents === null && markupBps === null) throw conflict("Resolve the pricing review (set an override or markup) before activating for sale.");
    if (b.purchasable !== undefined) patch.purchasable = b.purchasable;
    if (pricingTouched) {
      const pr = computeWholesale({ referencePriceCents: p.referencePriceCents, overrideCents, markupBps }, s.pricingPolicy, p.wholesaleCents);
      Object.assign(patch, { overrideCents, markupBps, wholesaleCents: pr.wholesaleCents, premiumCents: pr.premiumCents, pricingFlag: pr.flag, pricingNote: pr.note });
    }
    const vs = await tx.select({ sku: variants.sku }).from(variants).where(eq(variants.productId, id));
    const n = { ...p, ...patch };
    patch.searchText = [n.name, n.manufacturer, n.model, n.subcategory, ...vs.map((v) => v.sku)].join(" ").toLowerCase();
    await tx.update(products).set(patch).where(eq(products.id, id));
    if (pricingTouched) await rebuildTiers(tx, id, (patch.wholesaleCents ?? p.wholesaleCents), (patch.moq ?? p.moq), s);
    const changed = Object.keys(patch).filter((k) => !["updatedAt", "searchText"].includes(k));
    await audit(actor, "product.update", "product", id, { changed, purchasable: patch.purchasable, overrideCents: patch.overrideCents, markupBps: patch.markupBps }, tx);
  });
}

export async function createProduct(actor: Actor, raw: unknown) {
  assertCan(actor, "catalog.manage");
  const b = z.object({ name: z.string().trim().min(3).max(200), manufacturer: z.string().trim().min(1), model: z.string().trim().min(1), categorySlug: z.string(), subcategory: z.string().trim().min(1), referencePrice: z.string().min(1), moq: z.coerce.number().int().min(1) }).parse(raw);
  const { importProducts } = await import("./catalog-import");
  const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
  const sku = `VLD-NEW-${Date.now().toString(36).toUpperCase()}-01`;
  const r = await importProducts([{ slug, name: b.name, manufacturer: b.manufacturer, model: b.model, category: b.categorySlug, subcategory: b.subcategory, referenceUsd: Number(decimalStringToMinor(b.referencePrice)) / 100, referenceIsSample: false, referenceSource: "Entered by staff", isSample: false, moq: b.moq, variants: [{ sku, label: "Standard" }] }], { actorId: actor.userId });
  if (r.errors.length) throw badRequest(r.errors[0].message);
  const p = (await db.select().from(products).where(eq(products.slug, slug)))[0];
  await audit(actor, "product.create", "product", p.id, { name: b.name });
  return p;
}

export async function upsertVariant(actor: Actor, productId: string, raw: unknown) {
  assertCan(actor, "catalog.manage");
  const b = z.object({ id: z.string().uuid().optional(), sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{4,60}$/), label: z.string().trim().min(1).max(160), color: optStr(60), region: optStr(40), supplierSku: optStr(120), isActive: z.coerce.boolean().default(true) }).parse(raw);
  const clash = (await db.select().from(variants).where(eq(variants.sku, b.sku)))[0];
  if (clash && clash.id !== b.id) throw conflict("That SKU is already in use.");
  if (b.id) await db.update(variants).set({ sku: b.sku, label: b.label, color: b.color ?? null, region: b.region ?? null, supplierSku: b.supplierSku ?? null, isActive: b.isActive }).where(and(eq(variants.id, b.id), eq(variants.productId, productId)));
  else await db.insert(variants).values({ productId, sku: b.sku, label: b.label, color: b.color ?? null, region: b.region ?? null, supplierSku: b.supplierSku ?? null });
  await audit(actor, b.id ? "variant.update" : "variant.create", "product", productId, { sku: b.sku });
}

export async function setTiers(actor: Actor, productId: string, raw: unknown) {
  assertCan(actor, "pricing.manage");
  const pre = raw as { tiers?: { minQty?: unknown; unitPrice?: unknown }[] };
  const filtered = { tiers: (pre?.tiers ?? []).filter((t) => t && String(t.minQty ?? "").trim() !== "" && String(t.unitPrice ?? "").trim() !== "") };
  const b = z.object({ tiers: z.array(z.object({ minQty: z.coerce.number().int().min(1), unitPrice: z.string().min(1) })).min(1, "Enter at least one tier").max(10) }).parse(filtered);
  const p = (await db.select().from(products).where(eq(products.id, productId)))[0];
  if (!p) throw notFound();
  const tiers = b.tiers.map((t) => ({ minQty: t.minQty, unitCents: Number(decimalStringToMinor(t.unitPrice)) })).sort((a, c) => a.minQty - c.minQty);
  if (tiers[0].minQty !== p.moq) throw badRequest(`The first tier must start at the MOQ (${p.moq}).`);
  if (new Set(tiers.map((t) => t.minQty)).size !== tiers.length) throw badRequest("Tier quantities must be unique.");
  for (let i = 1; i < tiers.length; i++) if (tiers[i].unitCents > tiers[i - 1].unitCents) throw badRequest("Unit prices must not increase with quantity.");
  if (tiers.some((t) => t.unitCents <= 0)) throw badRequest("Prices must be positive.");
  await db.transaction(async (tx) => {
    await tx.delete(priceTiers).where(eq(priceTiers.productId, productId));
    await tx.insert(priceTiers).values(tiers.map((t) => ({ productId, ...t })));
    await audit(actor, "pricing.tiers_set", "product", productId, { tiers }, tx);
  });
}

export async function recordReferencePrice(actor: Actor, productId: string, raw: unknown) {
  assertCan(actor, "pricing.manage");
  const b = z.object({ price: z.string().min(1), source: z.string().trim().min(3).max(200), observedAt: z.string().optional(), isSample: z.coerce.boolean().default(false), note: optStr(300) }).parse(raw);
  const cents = Number(decimalStringToMinor(b.price));
  if (cents <= 0) throw badRequest("Price must be positive.");
  const observedAt = b.observedAt ? new Date(b.observedAt) : new Date();
  if (Number.isNaN(observedAt.getTime())) throw badRequest("Invalid date.");
  const s = await getSettings();
  await db.transaction(async (tx) => {
    const p = (await tx.select().from(products).where(eq(products.id, productId)).for("update"))[0];
    if (!p) throw notFound();
    await tx.insert(referencePriceObservations).values({ productId, priceCents: cents, source: b.source, isSample: b.isSample, note: b.note ?? null, observedAt, createdById: actor.userId });
    const pr = computeWholesale({ referencePriceCents: cents, overrideCents: p.overrideCents, markupBps: p.markupBps }, s.pricingPolicy, p.wholesaleCents);
    await tx.update(products).set({ referencePriceCents: cents, referenceSource: b.source, referenceVerifiedAt: b.isSample ? p.referenceVerifiedAt : observedAt, referenceIsSample: b.isSample, wholesaleCents: pr.wholesaleCents, premiumCents: pr.premiumCents, pricingFlag: pr.flag, pricingNote: pr.note, updatedAt: new Date() }).where(eq(products.id, productId));
    await rebuildTiers(tx, productId, pr.wholesaleCents, p.moq, s);
    await audit(actor, "pricing.reference_recorded", "product", productId, { cents, source: b.source, from: p.wholesaleCents, to: pr.wholesaleCents }, tx);
  });
}

export async function setContractPrice(actor: Actor, companyId: string, raw: unknown) {
  assertCan(actor, "pricing.manage");
  const b = z.object({ slug: z.string().trim().min(3), unitPrice: z.string().min(1), validTo: z.string().optional(), note: optStr(300) }).parse(raw);
  const p = (await db.select().from(products).where(eq(products.slug, b.slug)))[0];
  if (!p) throw badRequest("Unknown product slug.");
  const unitCents = Number(decimalStringToMinor(b.unitPrice));
  if (unitCents <= 0) throw badRequest("Price must be positive.");
  const validTo = b.validTo ? new Date(b.validTo) : null;
  await db.insert(contractPrices).values({ companyId, productId: p.id, unitCents, validTo, note: b.note ?? null, createdById: actor.userId })
    .onConflictDoUpdate({ target: [contractPrices.companyId, contractPrices.productId], set: { unitCents, validTo, note: b.note ?? null, validFrom: new Date() } });
  await audit(actor, "pricing.contract_set", "company", companyId, { product: p.slug, unitCents, validTo });
}

export async function deleteContractPrice(actor: Actor, id: number) {
  assertCan(actor, "pricing.manage");
  const r = await db.delete(contractPrices).where(eq(contractPrices.id, id)).returning();
  if (r[0]) await audit(actor, "pricing.contract_delete", "company", r[0].companyId, { productId: r[0].productId });
}
