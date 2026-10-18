import { and, eq, inArray } from "drizzle-orm";
import type { DbOrTx } from "@/db";
import { contractPrices, priceTiers, products, variants } from "@/db/schema";
import { resolveUnitPrice, validateQuantity, type Tier } from "@/lib/pricing";
import { convertMinor, isCurrency, type Currency } from "@/lib/money";
import { getRate, type Rate } from "@/lib/fx";
import { getSettings, type AppSettings } from "@/lib/settings";
import { isOrderableProduct } from "./catalog";

export type LineInput = { variantId: string; quantity: number; overrideUnitBaseCents?: number | null };
export type PricedLine = {
  variantId: string; sku: string; variantLabel: string; productId: string; productSlug: string; name: string; imageKey: string;
  quantity: number; moq: number; orderIncrement: number;
  unitBaseCents: number; lineBaseCents: bigint; source: string; unitCents: bigint; lineCents: bigint;
  nextTier: { minQty: number; unitBaseCents: number } | null;
  issues: string[];
};
export type PricedCart = {
  lines: PricedLine[]; currency: Currency; rate: Rate | null; subtotalBaseCents: bigint; subtotalCents: bigint | null;
  minimum: { amountMinor: bigint; currency: Currency; met: boolean; shortfallMinor: bigint } | null;
  target: { amountMinor: bigint; currency: Currency; reached: boolean };
  issues: string[]; settings: AppSettings;
};

/**
 * Server-side price calculation for a set of lines. This is the ONLY place totals are computed;
 * client-supplied prices are never trusted. Used for cart display, checkout, orders and quotes.
 */
export async function priceLines(tx: DbOrTx, companyId: string, input: LineInput[], currencyRaw: string, opts: { ignoreOrderable?: boolean } = {}): Promise<PricedCart> {
  const settings = await getSettings(tx);
  const currency: Currency = isCurrency(currencyRaw) && settings.enabledCurrencies.includes(currencyRaw) ? currencyRaw : "USD";
  const issues: string[] = [];
  const ids = [...new Set(input.map((l) => l.variantId))];
  const rows = ids.length
    ? await tx.select({ v: variants, p: products }).from(variants).innerJoin(products, eq(variants.productId, products.id)).where(inArray(variants.id, ids))
    : [];
  const byId = new Map(rows.map((r) => [r.v.id, r]));
  const productIds = [...new Set(rows.map((r) => r.p.id))];
  const tiers = productIds.length ? await tx.select().from(priceTiers).where(inArray(priceTiers.productId, productIds)) : [];
  const contracts = productIds.length ? await tx.select().from(contractPrices).where(and(eq(contractPrices.companyId, companyId), inArray(contractPrices.productId, productIds))) : [];
  const now = new Date();
  const rate = await getRate(currency, tx);
  if (!rate) issues.push(`No exchange rate is configured for ${currency}. Choose another currency or contact the trade desk.`);

  const lines: PricedLine[] = [];
  for (const l of input) {
    const r = byId.get(l.variantId);
    if (!r) { issues.push("A product in your list is no longer available."); continue; }
    const { v, p } = r;
    const lineIssues: string[] = [];
    const q = validateQuantity(l.quantity, { moq: p.moq, orderIncrement: p.orderIncrement, availableQty: p.availableQty, availabilityVerified: p.availabilityVerified, name: p.name }, settings.orderRules.enforceMoq);
    if (!q.ok) lineIssues.push(q.message);
    if (!v.isActive || !p.isActive) lineIssues.push(`${p.name}: this SKU is no longer offered.`);
    else if (!opts.ignoreOrderable && !isOrderableProduct(p)) lineIssues.push(`${p.name}: not currently orderable online${p.pricingFlag === "NEEDS_REVIEW" ? " (pricing under review)" : ""} — please request a quote.`);
    const pTiers: Tier[] = tiers.filter((t) => t.productId === p.id).map((t) => ({ minQty: t.minQty, unitCents: t.unitCents }));
    const c = contracts.find((x) => x.productId === p.id && x.validFrom <= now && (!x.validTo || x.validTo >= now));
    let unitBase: number; let source: string;
    if (l.overrideUnitBaseCents !== undefined && l.overrideUnitBaseCents !== null) { unitBase = l.overrideUnitBaseCents; source = "QUOTE"; }
    else { const res = resolveUnitPrice(Math.max(1, l.quantity), p.wholesaleCents, pTiers, c?.unitCents ?? null); unitBase = res.unitCents; source = res.source; }
    const next = pTiers.filter((t) => t.minQty > l.quantity).sort((a, b) => a.minQty - b.minQty)[0];
    const unitCents = rate ? convertMinor(BigInt(unitBase), rate.rate) : 0n;
    lines.push({
      variantId: v.id, sku: v.sku, variantLabel: v.label, productId: p.id, productSlug: p.slug, name: p.name, imageKey: p.imageKey,
      quantity: l.quantity, moq: p.moq, orderIncrement: p.orderIncrement, unitBaseCents: unitBase, lineBaseCents: BigInt(unitBase) * BigInt(l.quantity),
      source, unitCents, lineCents: unitCents * BigInt(l.quantity),
      nextTier: next && source !== "QUOTE" ? { minQty: next.minQty, unitBaseCents: next.unitCents } : null, issues: lineIssues,
    });
  }
  const subtotalBaseCents = lines.reduce((s, l) => s + l.lineBaseCents, 0n);
  const subtotalCents = rate ? lines.reduce((s, l) => s + l.lineCents, 0n) : null;

  // Minimum order value (configured in its own currency)
  let minimum: PricedCart["minimum"] = null;
  const mov = settings.minimumOrderValue;
  const movRate = mov.amountMinor > 0 ? await getRate(mov.currency, tx) : null;
  if (mov.amountMinor <= 0) {
    minimum = null; // no minimum order value configured
  } else if (movRate) {
    const inMovCurrency = convertMinor(subtotalBaseCents, movRate.rate);
    const amt = BigInt(mov.amountMinor);
    minimum = { amountMinor: amt, currency: mov.currency, met: inMovCurrency >= amt, shortfallMinor: inMovCurrency >= amt ? 0n : amt - inMovCurrency };
  } else if (mov.amountMinor > 0) {
    issues.push(`Minimum order value cannot be evaluated: no ${mov.currency} exchange rate configured.`);
  }
  const tgt = settings.targetOrderValue;
  const tgtRate = await getRate(tgt.currency, tx);
  const target = { amountMinor: BigInt(tgt.amountMinor), currency: tgt.currency, reached: tgtRate ? convertMinor(subtotalBaseCents, tgtRate.rate) >= BigInt(tgt.amountMinor) : false };

  return { lines, currency, rate, subtotalBaseCents, subtotalCents, minimum, target, issues, settings };
}

export function blockingIssues(pc: PricedCart): string[] {
  const out = [...pc.issues, ...pc.lines.flatMap((l) => l.issues)];
  if (!pc.lines.length) out.push("Your cart is empty.");
  if (pc.minimum && !pc.minimum.met) out.push(`Minimum order value not reached.`);
  return out;
}
