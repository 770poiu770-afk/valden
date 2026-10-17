import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedProducts } from "@/db/schema";
import { ProductArt } from "@/components/ProductArt";
import { BuyBox } from "@/components/client/BuyBox";
import { Badge, DL, Money, Notice } from "@/components/ui";
import { getProductDetail } from "@/server/catalog";
import { currentActor } from "@/server/http";
import { displayCurrency } from "@/lib/buyer-currency";
import { AVAILABILITY_LABEL, CONDITION_LABEL } from "@/lib/catalog-meta";
import { convertMinor } from "@/lib/money";
import { can } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = await getProductDetail((await params).slug, null);
  return { title: d ? d.product.name : "Product not found" };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ currency?: string }> }) {
  const { slug } = await params;
  const actor = await currentActor();
  const d = await getProductDetail(slug, actor);
  if (!d) notFound();
  const { product: p, category, variants, tiers } = d;
  const { currency, rate } = await displayCurrency(actor, (await searchParams).currency);
  const av = AVAILABILITY_LABEL[p.availability];
  const canOrder = can(actor, "orders.place") && actor?.companyStatus === "APPROVED";
  const saved = actor ? (await db.select().from(savedProducts).where(and(eq(savedProducts.userId, actor.userId), eq(savedProducts.productId, p.id))).limit(1)).length > 0 : false;
  const groups = [...new Set(p.specs.map((s) => s.group))];
  const conv = (c: number) => (rate ? convertMinor(BigInt(c), rate.rate) : null);

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-sm text-steel-500">
        <Link href="/catalog" className="hover:text-deep">Catalog</Link> / <Link href={`/catalog?category=${category.slug}`} className="hover:text-deep">{category.name}</Link>
      </nav>
      {actor?.isStaff && <div className="mb-4"><Notice tone="info">Staff view. <Link className="link" href={`/admin/products/${p.id}`}>Edit this product</Link>{!p.isActive && " — this listing is inactive and hidden from buyers."}</Notice></div>}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="aspect-[4/3] w-full object-contain" /> : <ProductArt kind={p.imageKey} className="aspect-[4/3] w-full" label={`${p.name} illustration`} />}
          </div>
          {!p.imageUrl && <p className="mt-2 text-xs text-steel-500">Illustration only. Product photography is supplied with the commercial offer.</p>}
        </div>

        <div>
          <p className="flex gap-3 text-sm text-steel-500"><span className="font-semibold text-steel">{p.manufacturer}</span><span>{p.subcategory}</span></p>
          <h1 className="wide mt-1 text-2xl leading-tight sm:text-[30px]">{p.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={p.condition === "NEW" ? "ok" : p.condition === "REFURBISHED" ? "info" : "warn"}>{CONDITION_LABEL[p.condition]}</Badge>
            <Badge tone={av.tone === "ok" ? "ok" : av.tone === "warn" ? "warn" : av.tone === "info" ? "info" : "muted"}>{av.label}</Badge>
            {p.isSample && <Badge tone="muted">Sample listing data</Badge>}
          </div>
          <p className="mt-4 max-w-[62ch] text-steel">{p.summary}</p>

          <div className="mt-6 rounded-md border border-line bg-white p-5">
            {d.showPrices && rate ? (
              <>
                <BuyBox variants={variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label }))} tiers={tiers} wholesaleCents={p.wholesaleCents!} contractCents={d.contractCents}
                  moq={p.moq} increment={p.orderIncrement} currency={currency} rate={rate.rate} orderable={d.orderable} canOrder={canOrder} saved={saved} slug={p.slug} />
                <table className="tbl num mt-5">
                  <thead><tr><th>Quantity</th><th className="text-right">Unit price ({currency})</th></tr></thead>
                  <tbody>
                    {tiers.map((t) => <tr key={t.minQty}><td>{t.minQty}+ units</td><td className="text-right font-semibold text-deep-900"><Money cents={conv(t.unitCents)} currency={currency} /></td></tr>)}
                    {d.contractCents !== null && <tr><td>Your contract price</td><td className="text-right font-semibold text-ok"><Money cents={conv(d.contractCents)} currency={currency} /></td></tr>}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-steel-500">
                  Indicative list prices{p.isSample ? " (sample data)" : ""}, excluding tax and freight. Totals are recalculated and confirmed at checkout.
                  {currency !== "USD" && rate.isSample && " Converted with a sample exchange rate."}
                  {" "}<Link className="link" href={`?currency=${currency === "USD" ? "EUR" : currency === "EUR" ? "ILS" : "USD"}`}>Show in {currency === "USD" ? "EUR" : currency === "EUR" ? "ILS" : "USD"}</Link>
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="font-semibold text-deep-900">Wholesale pricing is available to approved trade accounts.</p>
                <p className="text-sm text-steel-500">Minimum order quantity for this listing: <span className="num font-semibold text-steel">{p.moq} units</span>.</p>
                {!actor ? (
                  <div className="flex flex-wrap gap-2"><Link href="/register" className="btn-primary">Register your business</Link><Link href={`/login?next=/products/${p.slug}`} className="btn-outline">Sign in</Link></div>
                ) : <p className="text-sm text-steel-500">Your account is under review. We will email you as soon as pricing is unlocked.</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="wide mb-4 text-xl">Specifications</h2>
          <div className="panel">
            {groups.map((g) => (
              <div key={g} className="grid gap-2 border-b border-line/70 px-5 py-4 last:border-0 sm:grid-cols-[10rem_1fr]">
                <h3 className="text-sm font-semibold text-deep-900">{g}</h3>
                <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
                  {p.specs.filter((s) => s.group === g).map((s) => (<div key={s.label} className="contents"><dt className="text-steel-500">{s.label}</dt><dd>{s.value}</dd></div>))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-steel-500">Specifications are compiled for catalog setup and should be verified against the manufacturer&apos;s current datasheet.</p>
          <h2 className="wide mb-3 mt-10 text-xl">Available SKUs</h2>
          <div className="panel overflow-x-auto">
            <table className="tbl"><thead><tr><th>SKU</th><th>Configuration</th><th>Region</th></tr></thead>
              <tbody>{variants.map((v) => <tr key={v.id}><td className="num font-medium">{v.sku}</td><td>{v.label}</td><td>{v.region ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <aside className="space-y-6">
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold text-deep-900">Ordering & logistics</h2>
            <DL rows={[
              ["Minimum order", <span key="m" className="num">{p.moq} units</span>],
              ["Order increment", p.orderIncrement > 1 ? `${p.orderIncrement} units` : "Single units"],
              ["Case / carton / pallet", p.casePack || p.cartonQty || p.palletQty ? `${p.casePack ?? "—"} / ${p.cartonQty ?? "—"} / ${p.palletQty ?? "—"}` : "Confirmed with offer"],
              ["Availability", p.availabilityVerified && p.availableQty !== null ? `${p.availableQty} units confirmed` : "Indicative — confirmed at order review"],
              ["Lead time", p.leadTime ?? "Confirmed at order review"],
              ["Country of origin", p.origin ?? "Per manufacturer labelling — confirmed with offer"],
            ]} />
          </section>
          <section className="panel panel-pad space-y-3 text-sm">
            <h2 className="font-semibold text-deep-900">Compliance & warranty</h2>
            {p.regionCompatibility && <p><span className="font-medium text-deep-900">Region: </span>{p.regionCompatibility}</p>}
            {p.shippingRestrictions && <p><span className="font-medium text-deep-900">Shipping: </span>{p.shippingRestrictions}</p>}
            <p><span className="font-medium text-deep-900">Warranty: </span>{p.warrantyInfo ?? "Terms confirmed per order."}{!p.warrantyVerified && " Not yet verified."}</p>
            <p className="text-xs text-steel-500">Valden is an independent distributor. Listing a brand does not indicate an authorised-distributor relationship with its manufacturer.</p>
          </section>
          {actor?.isStaff && (
            <section className="panel panel-pad text-sm">
              <h2 className="mb-2 font-semibold text-deep-900">Staff only</h2>
              <DL rows={[["Reference", p.referencePriceCents !== null ? <Money key="r" cents={p.referencePriceCents} currency="USD" /> : "—"], ["Source", p.referenceSource], ["Pricing", p.pricingNote], ["Supplier SKU", p.supplierSku], ["Internal notes", p.internalNotes]]} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
