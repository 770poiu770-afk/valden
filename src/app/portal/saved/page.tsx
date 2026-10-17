import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products, savedProducts } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { displayCurrency } from "@/lib/buyer-currency";
import { ProductCard } from "@/components/ProductCard";
import { Empty, PageHeader } from "@/components/ui";
import { CompareToggle } from "@/components/client/CompareToggle";
export const dynamic = "force-dynamic";
export const metadata = { title: "Saved products" };
export default async function Saved() {
  const actor = await requireApprovedBuyer();
  const { currency, rate } = await displayCurrency(actor, null);
  const rows = await db.select({ p: products }).from(savedProducts).innerJoin(products, eq(products.id, savedProducts.productId)).where(eq(savedProducts.userId, actor.userId)).orderBy(desc(savedProducts.createdAt));
  return (
    <div>
      <PageHeader title="Saved products" intro="Products you have saved for later. Use the Save button on any product page." />
      {rows.length === 0 ? <Empty title="Nothing saved yet" action={<Link href="/catalog" className="btn-deep">Browse catalog</Link>} /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(({ p }) => <ProductCard key={p.id} p={p} currency={currency} rate={rate?.rate} compareSlot={<CompareToggle slug={p.slug} />} />)}</div>
      )}
    </div>
  );
}
