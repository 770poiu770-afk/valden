import { z } from "zod";
import { inArray } from "drizzle-orm";
import { route, readBody } from "@/server/http";
import { db } from "@/db";
import { variants } from "@/db/schema";
import { assertBuyer } from "@/lib/auth";
import { priceLines, blockingIssues } from "@/server/pricing-engine";

export const POST = route(async ({ req, actor }) => {
  assertBuyer(actor, "orders.place");
  const b = z.object({ currency: z.string().default("USD"), lines: z.array(z.object({ sku: z.string().trim().max(60), quantity: z.coerce.number().int().min(1).max(100_000) })).min(1).max(500) }).parse(await readBody(req));
  const skus = [...new Set(b.lines.map((l) => l.sku.toUpperCase()))];
  const found = await db.select({ id: variants.id, sku: variants.sku }).from(variants).where(inArray(variants.sku, skus));
  const map = new Map(found.map((f) => [f.sku, f.id]));
  const unknown = skus.filter((s) => !map.has(s));
  const agg = new Map<string, number>();
  for (const l of b.lines) { const id = map.get(l.sku.toUpperCase()); if (id) agg.set(id, (agg.get(id) ?? 0) + l.quantity); }
  const priced = await priceLines(db, actor.companyId, [...agg].map(([variantId, quantity]) => ({ variantId, quantity })), b.currency);
  return { ...priced, settings: undefined, unknown, blocking: blockingIssues(priced) };
});
