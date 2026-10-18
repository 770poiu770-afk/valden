import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, variants } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { getCartItems, getOrCreateCart } from "@/server/cart";
import { QuoteBuilder } from "@/components/client/Builders";
import { PageHeader } from "@/components/ui";
import { getT } from "@/server/locale";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("New quote request", "בקשה חדשה להצעת מחיר") }; }

export default async function NewQuote({ searchParams }: { searchParams: Promise<{ sku?: string; qty?: string; fromCart?: string; bulk?: string; currency?: string }> }) {
  const actor = await requireApprovedBuyer();
  const sp = await searchParams;
  const { t } = await getT();
  const wanted = new Map<string, number>();
  if (sp.sku) wanted.set(sp.sku.toUpperCase(), Math.max(1, Number(sp.qty) || 1));
  if (sp.bulk) for (const part of sp.bulk.split(",").slice(0, 300)) { const [s, q] = part.split(":"); if (s) wanted.set(s.toUpperCase(), (wanted.get(s.toUpperCase()) ?? 0) + Math.max(1, Number(q) || 1)); }
  let rowsFromCart: { variantId: string; quantity: number }[] = [];
  if (sp.fromCart) { const cart = await getOrCreateCart(db, actor.userId, actor.companyId); rowsFromCart = await getCartItems(db, cart.id); }
  const bySku = wanted.size ? await db.select({ v: variants, p: products }).from(variants).innerJoin(products, eq(products.id, variants.productId)).where(inArray(variants.sku, [...wanted.keys()])) : [];
  const byId = rowsFromCart.length ? await db.select({ v: variants, p: products }).from(variants).innerJoin(products, eq(products.id, variants.productId)).where(inArray(variants.id, rowsFromCart.map((r) => r.variantId))) : [];
  const initial = [
    ...bySku.map(({ v, p }) => ({ sku: v.sku, name: `${p.name} — ${v.label}`, quantity: wanted.get(v.sku) ?? p.moq, targetUnitPrice: "", moq: p.moq })),
    ...byId.map(({ v, p }) => ({ sku: v.sku, name: `${p.name} — ${v.label}`, quantity: rowsFromCart.find((r) => r.variantId === v.id)!.quantity, targetUnitPrice: "", moq: p.moq })),
  ];
  return (
    <div>
      <PageHeader title={t("New quote request", "בקשה חדשה להצעת מחיר")} back={{ href: "/portal/quotes", label: t("Quotes & offers", "הצעות מחיר") }} intro={t("List the products and quantities you need. Target prices help our trade desk respond faster. You will receive a formal offer with an expiry date.", "פרטו את המוצרים והכמויות שאתם צריכים. מחירי יעד עוזרים לצוות המכירות להשיב מהר יותר. תקבלו הצעה רשמית עם תאריך תפוגה.")} />
      <QuoteBuilder initial={initial} currency={["USD", "EUR", "ILS"].includes(sp.currency ?? "") ? sp.currency! : "USD"} />
    </div>
  );
}
