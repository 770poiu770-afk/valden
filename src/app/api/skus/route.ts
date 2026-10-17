import { and, eq, ilike, or, sql } from "drizzle-orm";
import { route } from "@/server/http";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { assertCan } from "@/lib/auth";

/** SKU lookup for the quote and bulk builders (approved buyers and staff). */
export const GET = route(async ({ req, actor }) => {
  assertCan(actor, "catalog.view_prices");
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  if (q.length < 2) return { results: [] };
  const esc = (t: string) => t.replace(/[%_\\]/g, "\\$&");
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  const like = `%${esc(q)}%`;
  const rows = await db.select({ variantId: variants.id, sku: variants.sku, label: variants.label, name: products.name, moq: products.moq, increment: products.orderIncrement, wholesaleCents: products.wholesaleCents })
    .from(variants).innerJoin(products, eq(products.id, variants.productId))
    .where(and(eq(variants.isActive, true), eq(products.isActive, true), or(ilike(variants.sku, like), and(...terms.map((t) => sql`${products.searchText} LIKE ${"%" + esc(t) + "%"}`)))))
    .limit(25);
  return { results: rows };
}, { csrf: false });
