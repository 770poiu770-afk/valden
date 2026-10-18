import { and, asc, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, contractPrices, priceTiers, products, variants } from "@/db/schema";
import { can, type Actor } from "@/lib/auth";
import { resolveUnitPrice, type Tier } from "@/lib/pricing";
import { convertMinorInverse, isCurrency, type Currency } from "@/lib/money";
import { getRate } from "@/lib/fx";
import { DEPARTMENTS } from "@/lib/catalog-meta";

export type CatalogQuery = {
  q?: string; dept?: string; category?: string; manufacturer?: string[]; condition?: string; availability?: string;
  minPrice?: string; maxPrice?: string; currency?: string; maxMoq?: string; storage?: string; ram?: string;
  cpu?: string; gpu?: string; refresh?: string; screen?: string; sort?: string; page?: string;
};

export const PAGE_SIZE = 24;

export function isOrderableProduct(p: { isActive: boolean; purchasable: boolean; isSample: boolean; pricingFlag: string; availability: string }) {
  const sampleOk = process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_DATA === "true";
  return p.isActive && p.availability !== "UNAVAILABLE" && p.pricingFlag !== "NEEDS_REVIEW" && (p.purchasable || (p.isSample && sampleOk));
}

export async function searchCatalog(qs: CatalogQuery, actor: Actor | null) {
  const where: SQL[] = [eq(products.isActive, true)];
  const showPrices = can(actor, "catalog.view_prices");
  if (qs.q && qs.q.trim()) {
    const terms = qs.q.trim().toLowerCase().slice(0, 100).split(/\s+/).filter(Boolean).slice(0, 6);
    for (const t of terms) where.push(sql`${products.searchText} LIKE ${"%" + t.replace(/[%_\\]/g, "\\$&") + "%"}`);
  }
  let category: typeof categories.$inferSelect | undefined;
  if (qs.category) {
    category = (await db.select().from(categories).where(eq(categories.slug, qs.category)).limit(1))[0];
    if (category) where.push(eq(products.categoryId, category.id));
  }
  const department = !category && qs.dept ? DEPARTMENTS.find((d) => d.slug === qs.dept) : undefined;
  let deptCatIds: number[] = [];
  if (department) {
    deptCatIds = (await db.select({ id: categories.id }).from(categories).where(inArray(categories.slug, [...department.categories]))).map((r) => r.id);
    where.push(deptCatIds.length ? inArray(products.categoryId, deptCatIds) : sql`false`);
  }
  const mfrs = (qs.manufacturer ?? []).filter(Boolean).slice(0, 20);
  if (mfrs.length) where.push(inArray(products.manufacturer, mfrs));
  if (qs.condition && ["NEW", "REFURBISHED", "USED"].includes(qs.condition)) where.push(eq(products.condition, qs.condition as "NEW"));
  if (qs.availability) where.push(eq(products.availability, qs.availability as "ON_REQUEST"));
  if (qs.maxMoq && /^\d+$/.test(qs.maxMoq)) where.push(lte(products.moq, Number(qs.maxMoq)));
  const num = (k: string, v?: string) => (v && /^\d+(\.\d+)?$/.test(v) ? sql`(${products.attributes}->>${k})::numeric = ${Number(v)}` : null);
  for (const c of [num("storageGb", qs.storage), num("ramGb", qs.ram), num("refreshHz", qs.refresh)]) if (c) where.push(c);
  if (qs.screen && /^\d+(\.\d+)?$/.test(qs.screen)) where.push(sql`floor((${products.attributes}->>'screenIn')::numeric) = ${Math.floor(Number(qs.screen))}`);
  if (qs.cpu) where.push(sql`${products.attributes}->>'cpu' ILIKE ${"%" + qs.cpu.slice(0, 60).replace(/[%_\\]/g, "\\$&") + "%"}`);
  if (qs.gpu) where.push(sql`${products.attributes}->>'gpu' ILIKE ${"%" + qs.gpu.slice(0, 60).replace(/[%_\\]/g, "\\$&") + "%"}`);

  // Price filtering is only honoured for users entitled to see prices (prevents price probing).
  if (showPrices && (qs.minPrice || qs.maxPrice)) {
    const cur: Currency = isCurrency(qs.currency) ? qs.currency : "USD";
    const rate = await getRate(cur);
    if (rate) {
      const toBase = (v: string) => Number(convertMinorInverse(BigInt(Math.round(Number(v) * 100)), rate.rate));
      if (qs.minPrice && /^\d+(\.\d+)?$/.test(qs.minPrice)) where.push(gte(products.wholesaleCents, toBase(qs.minPrice)));
      if (qs.maxPrice && /^\d+(\.\d+)?$/.test(qs.maxPrice)) where.push(lte(products.wholesaleCents, toBase(qs.maxPrice)));
    }
  }

  const sortMap: Record<string, SQL[]> = {
    newest: [desc(products.createdAt), asc(products.name)],
    name: [asc(products.name)],
    moq: [asc(products.moq), asc(products.name)],
    price_asc: [asc(products.wholesaleCents)],
    price_desc: [desc(products.wholesaleCents)],
    storage_desc: [sql`(${products.attributes}->>'storageGb')::numeric DESC NULLS LAST`, asc(products.name)],
    ram_desc: [sql`(${products.attributes}->>'ramGb')::numeric DESC NULLS LAST`, asc(products.name)],
  };
  let sort = qs.sort && sortMap[qs.sort] ? qs.sort : "featured";
  if (!showPrices && sort.startsWith("price")) sort = "featured";
  const orderBy = sort === "featured" ? [asc(products.categoryId), desc(products.referencePriceCents)] : sortMap[sort];
  const page = Math.max(1, Math.min(500, Number(qs.page) || 1));

  const cond = and(...where);
  const [rows, countRow, facetMfr] = await Promise.all([
    db.select({
      id: products.id, slug: products.slug, name: products.name, manufacturer: products.manufacturer, subcategory: products.subcategory,
      condition: products.condition, moq: products.moq, availability: products.availability, imageKey: products.imageKey, imageUrl: products.imageUrl,
      wholesaleCents: products.wholesaleCents, attributes: products.attributes, isSample: products.isSample, pricingFlag: products.pricingFlag,
      categoryId: products.categoryId, isActive: products.isActive, purchasable: products.purchasable,
    }).from(products).where(cond).orderBy(...orderBy).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: sql<number>`count(*)::int` }).from(products).where(cond),
    db.selectDistinct({ m: products.manufacturer }).from(products).where(and(eq(products.isActive, true), category ? eq(products.categoryId, category.id) : deptCatIds.length ? inArray(products.categoryId, deptCatIds) : undefined)).orderBy(asc(products.manufacturer)),
  ]);

  const facetAttr = async (key: string) => {
    const r = await db.execute(sql`SELECT DISTINCT (attributes->>${key})::numeric AS v FROM products WHERE is_active AND attributes ? ${key} ${category ? sql`AND category_id = ${category.id}` : deptCatIds.length ? sql`AND category_id IN (${sql.join(deptCatIds.map((i) => sql`${i}`), sql`, `)})` : sql``} ORDER BY 1`);
    return (r.rows as { v: string }[]).map((x) => Number(x.v)).filter((v) => Number.isFinite(v));
  };
  const [storageOpts, ramOpts, refreshOpts] = await Promise.all([facetAttr("storageGb"), facetAttr("ramGb"), facetAttr("refreshHz")]);

  return {
    category, department, page, total: countRow[0].n, pages: Math.max(1, Math.ceil(countRow[0].n / PAGE_SIZE)), sort, showPrices,
    items: rows.map((r) => ({ ...r, wholesaleCents: showPrices ? r.wholesaleCents : null, orderable: isOrderableProduct(r) })),
    facets: { manufacturers: facetMfr.map((x) => x.m), storage: storageOpts, ram: ramOpts, refresh: refreshOpts },
  };
}

export async function getProductDetail(slug: string, actor: Actor | null) {
  const p = (await db.select().from(products).where(eq(products.slug, slug)).limit(1))[0];
  const isStaff = !!actor?.isStaff;
  if (!p || (!p.isActive && !isStaff)) return null;
  const [cat, vs, tiers] = await Promise.all([
    db.select().from(categories).where(eq(categories.id, p.categoryId)).limit(1),
    db.select().from(variants).where(and(eq(variants.productId, p.id), eq(variants.isActive, true))).orderBy(asc(variants.sku)),
    db.select().from(priceTiers).where(eq(priceTiers.productId, p.id)).orderBy(asc(priceTiers.minQty)),
  ]);
  const showPrices = can(actor, "catalog.view_prices");
  let contract: number | null = null;
  if (showPrices && actor?.companyId) contract = await activeContractPrice(actor.companyId, p.id);
  // Strip staff-only fields for non-staff
  const publicP = isStaff ? p : { ...p, supplierSku: null, internalNotes: null, referencePriceCents: null, referenceSource: null, premiumCents: null, markupBps: null, overrideCents: null, pricingNote: null };
  return {
    product: { ...publicP, wholesaleCents: showPrices ? p.wholesaleCents : null },
    category: cat[0], variants: vs.map((v) => (isStaff ? v : { ...v, supplierSku: null })),
    tiers: showPrices ? tiers.map((t) => ({ minQty: t.minQty, unitCents: t.unitCents })) : [],
    contractCents: contract, showPrices, orderable: isOrderableProduct(p),
  };
}

export async function activeContractPrice(companyId: string, productId: string): Promise<number | null> {
  const r = await db.select().from(contractPrices).where(and(eq(contractPrices.companyId, companyId), eq(contractPrices.productId, productId))).limit(1);
  const c = r[0];
  const now = new Date();
  if (!c || c.validFrom > now || (c.validTo && c.validTo < now)) return null;
  return c.unitCents;
}

export async function priceFor(companyId: string, productId: string, qty: number, wholesaleCents: number) {
  const tiers: Tier[] = await db.select({ minQty: priceTiers.minQty, unitCents: priceTiers.unitCents }).from(priceTiers).where(eq(priceTiers.productId, productId));
  return resolveUnitPrice(qty, wholesaleCents, tiers, await activeContractPrice(companyId, productId));
}

export async function listCategoriesWithCounts() {
  const r = await db.execute(sql`SELECT c.slug, c.name, c.description, c.image_key AS "imageKey", count(p.id)::int AS n
    FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active GROUP BY c.id ORDER BY c.sort_order`);
  return r.rows as { slug: string; name: string; description: string; imageKey: string; n: number }[];
}
