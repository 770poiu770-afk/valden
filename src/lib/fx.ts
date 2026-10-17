import { and, desc, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { exchangeRates } from "@/db/schema";
import { BASE_CURRENCY, convertMinor, type Currency } from "./money";

export type Rate = { rate: string; source: string; isSample: boolean; effectiveAt: Date };

/**
 * Exchange rates are entered by staff (or an integration you configure) with their source and
 * effective date. The application never fetches or invents live rates.
 */
export async function getRate(quote: Currency, tx: DbOrTx = db): Promise<Rate | null> {
  if (quote === BASE_CURRENCY) return { rate: "1", source: "Base currency", isSample: false, effectiveAt: new Date(0) };
  const r = await tx.select().from(exchangeRates)
    .where(and(eq(exchangeRates.base, BASE_CURRENCY), eq(exchangeRates.quote, quote)))
    .orderBy(desc(exchangeRates.effectiveAt), desc(exchangeRates.id)).limit(1);
  if (!r[0]) return null;
  return { rate: r[0].rate, source: r[0].source, isSample: r[0].isSample, effectiveAt: r[0].effectiveAt };
}

export async function getRates(tx: DbOrTx = db) {
  const out: Partial<Record<Currency, Rate>> = {};
  for (const c of ["USD", "EUR", "ILS"] as Currency[]) {
    const r = await getRate(c, tx);
    if (r) out[c] = r;
  }
  return out;
}

export function convertBase(amountBase: bigint, rate: Rate | undefined | null): bigint | null {
  if (!rate) return null;
  return convertMinor(amountBase, rate.rate);
}

/** Production deployments must not transact on sample exchange rates. */
export function sampleRatesAllowed() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_DATA === "true";
}
