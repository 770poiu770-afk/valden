import type { AppSettings } from "./settings";
import { applyBps, divRound } from "./money";

export type PricingInput = {
  referencePriceCents: number | null;
  overrideCents: number | null;
  markupBps: number | null; // explicit per-product percentage policy
};
export type PricingResult = {
  wholesaleCents: number;
  premiumCents: number | null;
  flag: "NONE" | "NEEDS_REVIEW" | "FALLBACK_POLICY" | "OVERRIDE";
  note: string;
};

/**
 * Wholesale price rule:
 *  1. An admin override always wins (flag OVERRIDE).
 *  2. A product-level percentage markup is an explicitly configured policy.
 *  3. Otherwise apply the target flat premium (default US$350, configurable within the
 *     US$300–400 band) only where it stays within `maxPremiumPercentBps` of the reference.
 *  4. Where the flat premium would be implausible, never apply it silently:
 *     - fallbackMode PERCENT → apply the configured fallback percentage and flag FALLBACK_POLICY
 *     - fallbackMode FLAG    → keep reference price, flag NEEDS_REVIEW (product is not orderable until reviewed)
 */
export function computeWholesale(input: PricingInput, policy: AppSettings["pricingPolicy"], existingWholesale?: number): PricingResult {
  if (input.overrideCents !== null && input.overrideCents !== undefined) {
    return { wholesaleCents: input.overrideCents, premiumCents: input.referencePriceCents !== null ? input.overrideCents - input.referencePriceCents : null, flag: "OVERRIDE", note: "Admin price override in effect." };
  }
  const ref = input.referencePriceCents;
  if (ref === null || ref === undefined || ref <= 0) {
    return { wholesaleCents: existingWholesale ?? 0, premiumCents: null, flag: "NEEDS_REVIEW", note: "No reference price recorded; pricing requires review." };
  }
  if (input.markupBps !== null && input.markupBps !== undefined) {
    const w = Number(applyBps(BigInt(ref), input.markupBps));
    return { wholesaleCents: w, premiumCents: w - ref, flag: "NONE", note: `Product-level markup of ${(input.markupBps / 100).toFixed(2)}% applied.` };
  }
  const premium = clamp(policy.targetPremiumMinor, policy.minPremiumMinor, policy.maxPremiumMinor);
  const premiumShareBps = Number(divRound(BigInt(premium) * 10_000n, BigInt(ref)));
  if (premiumShareBps <= policy.maxPremiumPercentBps) {
    return { wholesaleCents: ref + premium, premiumCents: premium, flag: "NONE", note: `Flat premium of $${(premium / 100).toFixed(0)} over reference.` };
  }
  if (policy.fallbackMode === "PERCENT") {
    const w = Number(applyBps(BigInt(ref), policy.fallbackMarkupBps));
    return {
      wholesaleCents: w, premiumCents: w - ref, flag: "FALLBACK_POLICY",
      note: `Flat premium would be ${(premiumShareBps / 100).toFixed(1)}% of reference (limit ${(policy.maxPremiumPercentBps / 100).toFixed(1)}%). Fallback ${(policy.fallbackMarkupBps / 100).toFixed(2)}% markup applied — review recommended.`,
    };
  }
  return {
    wholesaleCents: ref, premiumCents: 0, flag: "NEEDS_REVIEW",
    note: `Flat premium would be ${(premiumShareBps / 100).toFixed(1)}% of reference (limit ${(policy.maxPremiumPercentBps / 100).toFixed(1)}%). Not applied — needs pricing review.`,
  };
}

function clamp(v: number, lo: number, hi: number) { return Math.min(Math.max(v, lo), Math.max(lo, hi)); }

/** Build quantity tiers from the configured schedule (multiples of MOQ). */
export function buildTiers(wholesaleCents: number, moq: number, schedule: AppSettings["pricingPolicy"]["tierSchedule"]) {
  const seen = new Set<number>();
  return [...schedule]
    .sort((a, b) => a.moqMultiple - b.moqMultiple)
    .map((s) => ({ minQty: Math.max(1, moq) * s.moqMultiple, unitCents: Number(applyBps(BigInt(wholesaleCents), -s.discountBps)) }))
    .filter((t) => (seen.has(t.minQty) ? false : (seen.add(t.minQty), true)));
}

export type Tier = { minQty: number; unitCents: number };

/** Select the tier unit price for a quantity: highest minQty ≤ qty. */
export function tierPriceFor(qty: number, tiers: Tier[], fallback: number): number {
  let best: Tier | null = null;
  for (const t of tiers) if (t.minQty <= qty && (!best || t.minQty > best.minQty)) best = t;
  return best ? best.unitCents : fallback;
}

export type ResolvedPrice = { unitCents: number; source: "TIER" | "CONTRACT" | "LIST" };

/** Resolve a buyer's unit price: the better of their active contract price and the tier price. */
export function resolveUnitPrice(qty: number, wholesaleCents: number, tiers: Tier[], contractCents: number | null): ResolvedPrice {
  const tier = tierPriceFor(qty, tiers, wholesaleCents);
  const source: ResolvedPrice["source"] = tiers.length ? "TIER" : "LIST";
  if (contractCents !== null && contractCents <= tier) return { unitCents: contractCents, source: "CONTRACT" };
  return { unitCents: tier, source };
}

export type QtyCheck = { ok: true } | { ok: false; message: string };
/** Per-line quantity limit; larger volumes go through a quotation. */
export const MAX_LINE_QTY = 100_000;
/** Smallest quantity a customer may order. With an open store (enforceMoq=false) that is 1 unit. */
export const minOrderQty = (p: { moq: number }, enforceMoq: boolean) => (enforceMoq ? p.moq : 1);

export function validateQuantity(qty: number, p: { moq: number; orderIncrement: number; availableQty: number | null; availabilityVerified: boolean; name: string }, enforceMoq = true): QtyCheck {
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, message: `${p.name}: quantity must be a positive whole number.` };
  if (qty > MAX_LINE_QTY) return { ok: false, message: `${p.name}: quantity exceeds the per-line limit of 100,000 units. Please request a quote.` };
  if (enforceMoq && qty < p.moq) return { ok: false, message: `${p.name}: minimum order quantity is ${p.moq} units.` };
  if (enforceMoq && p.orderIncrement > 1 && qty % p.orderIncrement !== 0) return { ok: false, message: `${p.name}: order in multiples of ${p.orderIncrement} units (case pack).` };
  if (p.availabilityVerified && p.availableQty !== null && qty > p.availableQty) return { ok: false, message: `${p.name}: only ${p.availableQty} units confirmed available.` };
  return { ok: true };
}
