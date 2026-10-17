import Papa from "papaparse";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "@/db";
import { categories, priceTiers, products, referencePriceObservations, variants } from "@/db/schema";
import { buildTiers, computeWholesale } from "@/lib/pricing";
import { getSettings, type AppSettings } from "@/lib/settings";
import { decimalStringToMinor } from "@/lib/money";
import { CATEGORIES } from "@/lib/catalog-meta";

const AVAIL = ["INDICATIVE_AVAILABLE", "LIMITED_CONFIRM", "BUILD_TO_ORDER", "PRE_ORDER", "ON_REQUEST", "UNAVAILABLE"] as const;

export const ImportProduct = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,100}$/),
  name: z.string().min(3).max(200),
  manufacturer: z.string().min(1).max(80),
  model: z.string().min(1).max(160),
  category: z.string(),
  subcategory: z.string().min(1).max(80),
  condition: z.enum(["NEW", "REFURBISHED", "USED"]).default("NEW"),
  summary: z.string().max(2000).default(""),
  specs: z.array(z.object({ group: z.string().max(60), label: z.string().max(80), value: z.string().max(300) })).max(60).default([]),
  attributes: z.record(z.union([z.string().max(120), z.number()])).default({}),
  referenceUsd: z.number().positive().max(10_000_000).optional(),
  referenceSource: z.string().max(200).optional(),
  referenceIsSample: z.boolean().default(true),
  moq: z.number().int().min(1).max(100_000).default(1),
  orderIncrement: z.number().int().min(1).max(10_000).default(1),
  casePack: z.number().int().positive().nullable().optional(),
  cartonQty: z.number().int().positive().nullable().optional(),
  palletQty: z.number().int().positive().nullable().optional(),
  availability: z.enum(AVAIL).default("ON_REQUEST"),
  leadTime: z.string().max(200).nullable().optional(),
  imageKey: z.string().max(40).default("generic"),
  regionCompatibility: z.string().max(500).nullable().optional(),
  shippingRestrictions: z.string().max(500).nullable().optional(),
  warrantyInfo: z.string().max(500).nullable().optional(),
  origin: z.string().max(120).nullable().optional(),
  supplierSku: z.string().max(120).nullable().optional(),
  isSample: z.boolean().default(true),
  variants: z.array(z.object({
    sku: z.string().regex(/^[A-Z0-9-]{4,60}$/),
    label: z.string().min(1).max(160),
    color: z.string().max(60).nullable().optional(),
    region: z.string().max(40).nullable().optional(),
    supplierSku: z.string().max(120).nullable().optional(),
  })).min(1).max(100),
});
export type ImportProduct = z.infer<typeof ImportProduct>;

export type ImportReport = { created: number; updated: number; skuCount: number; errors: { row: string; message: string }[] };

function searchTextFor(p: { name: string; manufacturer: string; model: string; subcategory: string }, skus: string[]) {
  return [p.name, p.manufacturer, p.model, p.subcategory, ...skus].join(" ").toLowerCase();
}

export async function ensureCategories(tx: DbOrTx = db) {
  for (const [i, c] of CATEGORIES.entries()) {
    await tx.insert(categories).values({ slug: c.slug, name: c.name, description: c.description, imageKey: c.imageKey, sortOrder: i })
      .onConflictDoUpdate({ target: categories.slug, set: { name: c.name, description: c.description, imageKey: c.imageKey, sortOrder: i } });
  }
}

/** Upsert a batch of products (by slug) and their SKUs (by SKU). Pricing is recomputed server-side. */
export async function importProducts(raw: unknown[], opts: { actorId?: string | null; settings?: AppSettings; tx?: DbOrTx } = {}): Promise<ImportReport> {
  const s = opts.settings ?? (await getSettings());
  const cats = await (opts.tx ?? db).select().from(categories);
  const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
  const report: ImportReport = { created: 0, updated: 0, skuCount: 0, errors: [] };

  for (const [i, r] of raw.entries()) {
    const parsed = ImportProduct.safeParse(r);
    const label = (r as { slug?: string })?.slug ?? `row ${i + 1}`;
    if (!parsed.success) {
      report.errors.push({ row: label, message: parsed.error.issues.slice(0, 3).map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
      continue;
    }
    const p = parsed.data;
    const categoryId = catBySlug.get(p.category);
    if (!categoryId) { report.errors.push({ row: label, message: `Unknown category "${p.category}"` }); continue; }

    const work = async (tx: DbOrTx) => {
      const existing = (await tx.select().from(products).where(eq(products.slug, p.slug)).limit(1))[0];
      const refCents = p.referenceUsd !== undefined ? Math.round(p.referenceUsd * 100) : existing?.referencePriceCents ?? null;
      const pr = computeWholesale({ referencePriceCents: refCents, overrideCents: existing?.overrideCents ?? null, markupBps: existing?.markupBps ?? null }, s.pricingPolicy, existing?.wholesaleCents);
      const values = {
        slug: p.slug, name: p.name, manufacturer: p.manufacturer, model: p.model, categoryId, subcategory: p.subcategory,
        condition: p.condition, summary: p.summary, specs: p.specs, attributes: p.attributes,
        regionCompatibility: p.regionCompatibility ?? null, shippingRestrictions: p.shippingRestrictions ?? null,
        warrantyInfo: p.warrantyInfo ?? null, origin: p.origin ?? null, moq: p.moq, orderIncrement: p.orderIncrement,
        casePack: p.casePack ?? null, cartonQty: p.cartonQty ?? null, palletQty: p.palletQty ?? null,
        availability: p.availability, leadTime: p.leadTime ?? null, imageKey: p.imageKey, isSample: p.isSample,
        supplierSku: p.supplierSku ?? existing?.supplierSku ?? null,
        referencePriceCents: refCents,
        referenceSource: p.referenceSource ?? existing?.referenceSource ?? (p.referenceIsSample ? "Sample estimate (unverified) — replace before launch" : null),
        referenceIsSample: p.referenceIsSample,
        premiumCents: pr.premiumCents, wholesaleCents: pr.wholesaleCents, pricingFlag: pr.flag, pricingNote: pr.note,
        searchText: searchTextFor(p, p.variants.map((v) => v.sku)), updatedAt: new Date(),
      };
      let productId: string;
      if (existing) {
        await tx.update(products).set(values).where(eq(products.id, existing.id));
        productId = existing.id; report.updated++;
      } else {
        const ins = await tx.insert(products).values(values).returning({ id: products.id });
        productId = ins[0].id; report.created++;
      }
      if (refCents !== null && refCents !== existing?.referencePriceCents) {
        await tx.insert(referencePriceObservations).values({
          productId, priceCents: refCents, currency: "USD", source: values.referenceSource ?? "Import", isSample: p.referenceIsSample,
          note: existing ? "Updated via catalog import" : "Initial catalog import", createdById: opts.actorId ?? null,
        });
      }
      // SKUs
      for (const v of p.variants) {
        const owner = (await tx.select({ productId: variants.productId }).from(variants).where(eq(variants.sku, v.sku)).limit(1))[0];
        if (owner && owner.productId !== productId) throw new Error(`SKU ${v.sku} already belongs to another product`);
        await tx.insert(variants).values({ productId, sku: v.sku, label: v.label, color: v.color ?? null, region: v.region ?? null, supplierSku: v.supplierSku ?? null })
          .onConflictDoUpdate({ target: variants.sku, set: { label: v.label, color: v.color ?? null, region: v.region ?? null, isActive: true } });
        report.skuCount++;
      }
      // deactivate SKUs no longer in the import (never delete — orders may reference them)
      await tx.update(variants).set({ isActive: false }).where(and(eq(variants.productId, productId), notInArray(variants.sku, p.variants.map((v) => v.sku))));
      await rebuildTiers(tx, productId, pr.wholesaleCents, p.moq, s);
    };
    try {
      if (opts.tx) await work(opts.tx); else await db.transaction(work);
    } catch (e) {
      report.errors.push({ row: label, message: (e as Error).message });
    }
  }
  return report;
}

export async function rebuildTiers(tx: DbOrTx, productId: string, wholesaleCents: number, moq: number, s: AppSettings) {
  await tx.delete(priceTiers).where(eq(priceTiers.productId, productId));
  const tiers = buildTiers(wholesaleCents, moq, s.pricingPolicy.tierSchedule);
  if (tiers.length) await tx.insert(priceTiers).values(tiers.map((t) => ({ productId, ...t })));
}

/* -------------------------------------------------------------------- */
/* CSV: catalog (one row per SKU)                                       */
/* -------------------------------------------------------------------- */
export const CATALOG_CSV_COLUMNS = [
  "slug", "name", "manufacturer", "model", "category", "subcategory", "condition", "summary", "specs", "attributes_json",
  "reference_price_usd", "reference_source", "reference_is_sample", "moq", "order_increment", "case_pack", "carton_qty", "pallet_qty",
  "availability", "lead_time", "image_key", "region_compatibility", "shipping_restrictions", "warranty_info", "origin",
  "variant_sku", "variant_label", "variant_color", "variant_region",
] as const;

const int = (v: string | undefined) => (v && v.trim() !== "" ? Number.parseInt(v, 10) : null);
const bool = (v: string | undefined, d: boolean) => (v === undefined || v.trim() === "" ? d : /^(1|true|yes|y)$/i.test(v.trim()));

export function parseCatalogCsv(text: string): { products: unknown[]; errors: { row: string; message: string }[] } {
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  const errors = res.errors.slice(0, 20).map((e) => ({ row: `line ${(e.row ?? 0) + 2}`, message: e.message }));
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const [i, row] of res.data.entries()) {
    const slug = row.slug?.trim();
    if (!slug) { errors.push({ row: `line ${i + 2}`, message: "Missing slug" }); continue; }
    let p = bySlug.get(slug);
    if (!p) {
      let attributes: Record<string, unknown> = {};
      try { attributes = row.attributes_json ? JSON.parse(row.attributes_json) : {}; } catch { errors.push({ row: slug, message: "attributes_json is not valid JSON" }); }
      const specs = (row.specs ?? "").split(";;").map((x) => x.split("|")).filter((x) => x.length === 3).map(([group, label, value]) => ({ group: group.trim(), label: label.trim(), value: value.trim() }));
      let referenceUsd: number | undefined;
      if (row.reference_price_usd?.trim()) {
        try { referenceUsd = Number(decimalStringToMinor(row.reference_price_usd)) / 100; } catch { errors.push({ row: slug, message: "Invalid reference_price_usd" }); }
      }
      p = {
        slug, name: row.name, manufacturer: row.manufacturer, model: row.model, category: row.category, subcategory: row.subcategory,
        condition: (row.condition || "NEW").toUpperCase(), summary: row.summary ?? "", specs, attributes, referenceUsd,
        referenceSource: row.reference_source || undefined, referenceIsSample: bool(row.reference_is_sample, true),
        moq: int(row.moq) ?? 1, orderIncrement: int(row.order_increment) ?? 1, casePack: int(row.case_pack), cartonQty: int(row.carton_qty), palletQty: int(row.pallet_qty),
        availability: (row.availability || "ON_REQUEST").toUpperCase(), leadTime: row.lead_time || null, imageKey: row.image_key || "generic",
        regionCompatibility: row.region_compatibility || null, shippingRestrictions: row.shipping_restrictions || null,
        warrantyInfo: row.warranty_info || null, origin: row.origin || null, isSample: bool(row.reference_is_sample, true), variants: [],
      };
      bySlug.set(slug, p);
    }
    (p.variants as unknown[]).push({ sku: row.variant_sku?.trim(), label: row.variant_label?.trim() || "Standard", color: row.variant_color || null, region: row.variant_region || null });
  }
  return { products: [...bySlug.values()], errors };
}

/* -------------------------------------------------------------------- */
/* CSV: prices (one row per product)                                    */
/* -------------------------------------------------------------------- */
export const PRICE_CSV_COLUMNS = [
  "slug", "name", "reference_price_usd", "reference_source", "reference_verified_at", "reference_is_sample",
  "markup_percent", "override_price_usd", "wholesale_price_usd", "pricing_flag", "moq", "availability", "available_qty", "availability_verified", "lead_time",
] as const;

export async function exportPricesCsv(): Promise<string> {
  const rows = await db.select().from(products).orderBy(products.slug);
  const fmt = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));
  return Papa.unparse({
    fields: [...PRICE_CSV_COLUMNS],
    data: rows.map((p) => [
      p.slug, p.name, fmt(p.referencePriceCents), p.referenceSource ?? "", p.referenceVerifiedAt?.toISOString().slice(0, 10) ?? "", p.referenceIsSample ? "true" : "false",
      p.markupBps === null ? "" : (p.markupBps / 100).toFixed(2), fmt(p.overrideCents), fmt(p.wholesaleCents), p.pricingFlag,
      p.moq, p.availability, p.availableQty ?? "", p.availabilityVerified ? "true" : "false", p.leadTime ?? "",
    ]),
  });
}

export type PriceImportReport = { updated: number; unchanged: number; errors: { row: string; message: string }[]; changes: { slug: string; from: number; to: number }[] };

export async function importPricesCsv(text: string, actorId: string | null): Promise<PriceImportReport> {
  const s = await getSettings();
  const res = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
  const report: PriceImportReport = { updated: 0, unchanged: 0, errors: [], changes: [] };
  const slugs = res.data.map((r) => r.slug?.trim()).filter(Boolean) as string[];
  if (!slugs.length) { report.errors.push({ row: "file", message: "No rows with a slug column found." }); return report; }
  const existing = await db.select().from(products).where(inArray(products.slug, slugs));
  const map = new Map(existing.map((p) => [p.slug, p]));
  for (const [i, row] of res.data.entries()) {
    const slug = row.slug?.trim();
    const p = slug ? map.get(slug) : undefined;
    if (!p) { report.errors.push({ row: slug || `line ${i + 2}`, message: "Unknown product slug" }); continue; }
    try {
      const minor = (v?: string) => (v && v.trim() !== "" ? Number(decimalStringToMinor(v)) : null);
      const ref = row.reference_price_usd !== undefined ? minor(row.reference_price_usd) : p.referencePriceCents;
      const override = row.override_price_usd !== undefined ? minor(row.override_price_usd) : p.overrideCents;
      const markupBps = row.markup_percent !== undefined ? (row.markup_percent.trim() === "" ? null : Math.round(Number(decimalStringToMinor(row.markup_percent)))) : p.markupBps;
      if (markupBps !== null && (markupBps < 0 || markupBps > 100_000)) throw new Error("markup_percent out of range");
      if ((ref !== null && ref <= 0) || (override !== null && override <= 0)) throw new Error("Prices must be positive");
      const verifiedAt = row.reference_verified_at?.trim() ? new Date(row.reference_verified_at.trim()) : p.referenceVerifiedAt;
      if (verifiedAt && Number.isNaN(verifiedAt.getTime())) throw new Error("Invalid reference_verified_at date");
      const isSample = row.reference_is_sample !== undefined ? bool(row.reference_is_sample, p.referenceIsSample) : p.referenceIsSample;
      const moq = row.moq?.trim() ? Number.parseInt(row.moq, 10) : p.moq;
      if (!Number.isInteger(moq) || moq < 1) throw new Error("Invalid moq");
      const availability = row.availability?.trim() ? row.availability.trim().toUpperCase() : p.availability;
      if (!(AVAIL as readonly string[]).includes(availability)) throw new Error("Invalid availability");
      const pr = computeWholesale({ referencePriceCents: ref, overrideCents: override, markupBps }, s.pricingPolicy, p.wholesaleCents);
      await db.transaction(async (tx) => {
        await tx.update(products).set({
          referencePriceCents: ref, overrideCents: override, markupBps, referenceVerifiedAt: verifiedAt ?? null, referenceIsSample: isSample,
          referenceSource: row.reference_source?.trim() || p.referenceSource, moq, availability: availability as typeof p.availability,
          availableQty: row.available_qty !== undefined ? (row.available_qty.trim() ? Number.parseInt(row.available_qty, 10) : null) : p.availableQty,
          availabilityVerified: row.availability_verified !== undefined ? bool(row.availability_verified, false) : p.availabilityVerified,
          leadTime: row.lead_time !== undefined ? row.lead_time.trim() || null : p.leadTime,
          wholesaleCents: pr.wholesaleCents, premiumCents: pr.premiumCents, pricingFlag: pr.flag, pricingNote: pr.note, updatedAt: new Date(),
        }).where(eq(products.id, p.id));
        if (ref !== null && ref !== p.referencePriceCents) {
          await tx.insert(referencePriceObservations).values({ productId: p.id, priceCents: ref, source: row.reference_source?.trim() || "CSV price import", isSample, note: "CSV price import", createdById: actorId });
        }
        await rebuildTiers(tx, p.id, pr.wholesaleCents, moq, s);
      });
      if (pr.wholesaleCents !== p.wholesaleCents || moq !== p.moq) { report.updated++; report.changes.push({ slug: p.slug, from: p.wholesaleCents, to: pr.wholesaleCents }); }
      else report.unchanged++;
    } catch (e) {
      report.errors.push({ row: slug!, message: (e as Error).message });
    }
  }
  return report;
}

export async function recomputeAllPrices(actorId: string | null) {
  const s = await getSettings();
  const all = await db.select().from(products);
  let changed = 0;
  for (const p of all) {
    const pr = computeWholesale({ referencePriceCents: p.referencePriceCents, overrideCents: p.overrideCents, markupBps: p.markupBps }, s.pricingPolicy, p.wholesaleCents);
    await db.transaction(async (tx) => {
      await tx.update(products).set({ wholesaleCents: pr.wholesaleCents, premiumCents: pr.premiumCents, pricingFlag: pr.flag, pricingNote: pr.note, updatedAt: new Date() }).where(eq(products.id, p.id));
      await rebuildTiers(tx, p.id, pr.wholesaleCents, p.moq, s);
    });
    if (pr.wholesaleCents !== p.wholesaleCents) changed++;
  }
  return { total: all.length, changed, actorId };
}
