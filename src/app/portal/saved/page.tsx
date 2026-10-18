import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, savedProducts } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { displayCurrency } from "@/lib/buyer-currency";
import { ProductCard } from "@/components/ProductCard";
import { Empty, PageHeader } from "@/components/ui";
import { CompareToggle } from "@/components/client/CompareToggle";
import { getT } from "@/server/locale";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Saved products", "מוצרים שמורים") }; }
export default async function Saved() {
  const actor = await requireApprovedBuyer();
  const { currency, rate } = await displayCurrency(actor, null);
  const { l, t } = await getT();
  const rows = await db.select({ p: products }).from(savedProducts).innerJoin(products, eq(products.id, savedProducts.productId)).where(eq(savedProducts.userId, actor.userId)).orderBy(desc(savedProducts.createdAt));
  return (
    <div>
      <PageHeader title={t("Saved products", "מוצרים שמורים")} intro={t("Products you have saved for later. Use the Save button on any product page.", "מוצרים ששמרתם להמשך. השתמשו בכפתור השמירה בכל דף מוצר.")} />
      {rows.length === 0 ? <Empty title={t("Nothing saved yet", "עדיין לא נשמרו מוצרים")} action={<Link href="/catalog" className="btn-deep">{t("Browse catalog", "לקטלוג")}</Link>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(({ p }) => <ProductCard key={p.id} p={p} l={l} currency={currency} rate={rate?.rate} compareSlot={<CompareToggle slug={p.slug} />} />)}</div>
      )}
    </div>
  );
}
