import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import type { Actor } from "./auth";
import { isCurrency, type Currency } from "./money";
import { getRate } from "./fx";

/** Display currency: explicit ?currency=, else the company's preferred currency, else USD. */
export async function displayCurrency(actor: Actor | null, requested?: string | null): Promise<{ currency: Currency; rate: Awaited<ReturnType<typeof getRate>> }> {
  let currency: Currency = "USD";
  if (isCurrency(requested)) currency = requested;
  else if (actor?.companyId) {
    const c = (await db.select({ cur: companies.preferredCurrency }).from(companies).where(eq(companies.id, actor.companyId)))[0];
    if (c && isCurrency(c.cur)) currency = c.cur;
  }
  let rate = await getRate(currency);
  if (!rate) { currency = "USD"; rate = await getRate("USD"); }
  return { currency, rate };
}
