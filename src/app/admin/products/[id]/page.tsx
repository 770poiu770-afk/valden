import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, priceTiers, products, referencePriceObservations, variants } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { Badge, Money, Notice, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { AVAILABILITY_LABEL, CATEGORIES } from "@/lib/catalog-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };
const cents = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));

export default async function ProductAdmin({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("catalog.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const p = (await db.select().from(products).where(eq(products.id, id)))[0];
  if (!p) notFound();
  const [cat, vs, tiers, obs] = await Promise.all([
    db.select().from(categories).where(eq(categories.id, p.categoryId)).then((r) => r[0]),
    db.select().from(variants).where(eq(variants.productId, id)).orderBy(asc(variants.sku)),
    db.select().from(priceTiers).where(eq(priceTiers.productId, id)).orderBy(asc(priceTiers.minQty)),
    db.select().from(referencePriceObservations).where(eq(referencePriceObservations.productId, id)).orderBy(desc(referencePriceObservations.observedAt)).limit(10),
  ]);
  const canPrice = a.permissions.has("pricing.manage");
  const tierRows = [...tiers, ...Array.from({ length: Math.max(0, 6 - tiers.length) }, () => null)];
  return (
    <div className="space-y-6">
      <PageHeader title={p.name} back={{ href: "/admin/products", label: "Products" }}
        intro={<span className="flex flex-wrap items-center gap-2">{cat.name} <StatusPill status={p.pricingFlag} /> {p.purchasable ? <Badge tone="ok">Activated for sale</Badge> : <Badge tone="muted">Not activated</Badge>} {p.isSample && <Badge tone="warn">Sample data</Badge>}</span>}
        actions={<Link className="btn-outline btn-sm" href={`/products/${p.slug}`} target="_blank">View listing</Link>} />

      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">Pricing</h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-1 text-sm">
            <p className="text-steel-500">Reference market price</p><p className="text-xl font-bold text-deep-900"><Money cents={p.referencePriceCents} currency="USD" /></p>
            <p className="text-xs">{p.referenceSource ?? "No source"} {p.referenceIsSample ? <Badge tone="warn">sample — unverified</Badge> : <Badge tone="ok">verified {p.referenceVerifiedAt ? fmtDate(p.referenceVerifiedAt) : ""}</Badge>}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-steel-500">Wholesale list price</p><p className="text-xl font-bold text-deep-900"><Money cents={p.wholesaleCents} currency="USD" /></p>
            <p className="text-xs">Difference from reference: <Money cents={p.premiumCents} currency="USD" />{p.referencePriceCents ? ` (${(((p.wholesaleCents - p.referencePriceCents) / p.referencePriceCents) * 100).toFixed(1)}%)` : ""}</p>
          </div>
          <p className="text-sm text-steel-500">{p.pricingNote}</p>
        </div>
        {p.pricingFlag === "NEEDS_REVIEW" && <div className="mt-4"><Notice tone="bad">Not orderable online until pricing is reviewed: record a reference price, set a product markup, or set an override.</Notice></div>}
        {canPrice ? (
          <div className="mt-6 grid gap-6 border-t border-line pt-6 lg:grid-cols-2">
            <ActionForm action={`/api/admin/products/${id}`} className="space-y-3" submitLabel="Save pricing & activation">
              <h3 className="text-sm font-semibold">Overrides and activation</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="field-label" htmlFor="overridePrice">Override wholesale (USD)</label><input id="overridePrice" name="overridePrice" defaultValue={cents(p.overrideCents)} placeholder="None" className="input" /></div>
                <div><label className="field-label" htmlFor="markupPercent">Product markup %</label><input id="markupPercent" name="markupPercent" defaultValue={p.markupBps === null ? "" : (p.markupBps / 100).toFixed(2)} placeholder="Use policy" className="input" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="purchasable" defaultChecked={p.purchasable} className="accent-deep" /> Activated for sale (required in production)</label>
              <p className="text-xs text-steel-500">Override beats markup; markup beats the global premium policy. Tiers are regenerated from the schedule when you save.</p>
            </ActionForm>
            <ActionForm action={`/api/admin/products/${id}/reference`} className="space-y-3" submitLabel="Record reference price" resetOnSuccess>
              <h3 className="text-sm font-semibold">Record a market benchmark</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="field-label" htmlFor="price">Price (USD)</label><input id="price" name="price" required className="input" /></div>
                <div><label className="field-label" htmlFor="observedAt">Observed on</label><input id="observedAt" name="observedAt" type="date" className="input" /></div>
              </div>
              <div><label className="field-label" htmlFor="source">Source</label><input id="source" name="source" required placeholder="e.g. Distributor price list, Oct 2026" className="input" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isSample" className="accent-deep" /> This is an estimate, not a verified benchmark</label>
            </ActionForm>
          </div>
        ) : <p className="mt-4 text-sm text-steel-500">Pricing changes require the pricing permission.</p>}
        {obs.length > 0 && (
          <table className="tbl mt-6"><thead><tr><th>Observed</th><th>Source</th><th className="text-right">Price</th><th>Type</th></tr></thead>
            <tbody>{obs.map((o) => <tr key={o.id}><td>{fmtDate(o.observedAt)}</td><td>{o.source}{o.note && <span className="block text-xs text-steel-500">{o.note}</span>}</td><td className="text-right"><Money cents={o.priceCents} currency="USD" /></td><td>{o.isSample ? <Badge tone="warn">Sample</Badge> : <Badge tone="ok">Verified</Badge>}</td></tr>)}</tbody></table>
        )}
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">Quantity tiers (USD)</h2>
        <ActionForm action={`/api/admin/products/${id}/tiers`} submitLabel={canPrice ? "Save tiers" : undefined}>
          <div className="grid max-w-md grid-cols-2 gap-2 text-sm">
            <span className="field-label">From quantity</span><span className="field-label">Unit price</span>
            {tierRows.map((t, i) => (<div key={i} className="contents"><input name={`tiers[${i}].minQty`} defaultValue={t?.minQty ?? ""} disabled={!canPrice} className="input num" aria-label={`Tier ${i + 1} quantity`} /><input name={`tiers[${i}].unitPrice`} defaultValue={t ? cents(t.unitCents) : ""} disabled={!canPrice} className="input num" aria-label={`Tier ${i + 1} price`} /></div>))}
          </div>
          <p className="field-hint">First tier must start at the MOQ ({p.moq}). Prices may not increase with quantity. Saving pricing above regenerates tiers from the policy schedule.</p>
        </ActionForm>
      </section>

      <ActionForm action={`/api/admin/products/${id}`} className="panel panel-pad space-y-4" submitLabel="Save listing">
        <h2 className="font-semibold">Listing, availability & logistics</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3"><label className="field-label" htmlFor="name">Name</label><input id="name" name="name" defaultValue={p.name} className="input" /></div>
          <div><label className="field-label" htmlFor="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer" defaultValue={p.manufacturer} className="input" /></div>
          <div><label className="field-label" htmlFor="model">Model</label><input id="model" name="model" defaultValue={p.model} className="input" /></div>
          <div><label className="field-label" htmlFor="condition">Condition</label><select id="condition" name="condition" defaultValue={p.condition} className="input"><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option></select></div>
          <div><label className="field-label" htmlFor="categorySlug">Category</label><select id="categorySlug" name="categorySlug" defaultValue={cat.slug} className="input">{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
          <div><label className="field-label" htmlFor="subcategory">Subcategory</label><input id="subcategory" name="subcategory" defaultValue={p.subcategory} className="input" /></div>
          <div><label className="field-label" htmlFor="imageUrl">Image URL (licensed)</label><input id="imageUrl" name="imageUrl" defaultValue={p.imageUrl ?? ""} placeholder="https://…" className="input" /></div>
          <div className="md:col-span-3"><label className="field-label" htmlFor="summary">Summary</label><textarea id="summary" name="summary" rows={2} defaultValue={p.summary} className="input" /></div>
          <div><label className="field-label" htmlFor="moq">MOQ</label><input id="moq" name="moq" type="number" min={1} defaultValue={p.moq} className="input" /></div>
          <div><label className="field-label" htmlFor="orderIncrement">Order increment</label><input id="orderIncrement" name="orderIncrement" type="number" min={1} defaultValue={p.orderIncrement} className="input" /></div>
          <div><label className="field-label" htmlFor="availability">Availability</label><select id="availability" name="availability" defaultValue={p.availability} className="input">{Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
          <div><label className="field-label" htmlFor="availableQty">Confirmed quantity</label><input id="availableQty" name="availableQty" defaultValue={p.availableQty ?? ""} className="input" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="availabilityVerified" defaultChecked={p.availabilityVerified} className="accent-deep" /> Quantity confirmed with supplier</label>
          <div><label className="field-label" htmlFor="leadTime">Lead time</label><input id="leadTime" name="leadTime" defaultValue={p.leadTime ?? ""} className="input" /></div>
          <div><label className="field-label" htmlFor="casePack">Case pack</label><input id="casePack" name="casePack" defaultValue={p.casePack ?? ""} className="input" /></div>
          <div><label className="field-label" htmlFor="cartonQty">Carton qty</label><input id="cartonQty" name="cartonQty" defaultValue={p.cartonQty ?? ""} className="input" /></div>
          <div><label className="field-label" htmlFor="palletQty">Pallet qty</label><input id="palletQty" name="palletQty" defaultValue={p.palletQty ?? ""} className="input" /></div>
          <div className="md:col-span-3"><label className="field-label" htmlFor="regionCompatibility">Region compatibility</label><input id="regionCompatibility" name="regionCompatibility" defaultValue={p.regionCompatibility ?? ""} className="input" /></div>
          <div className="md:col-span-3"><label className="field-label" htmlFor="shippingRestrictions">Shipping restrictions</label><input id="shippingRestrictions" name="shippingRestrictions" defaultValue={p.shippingRestrictions ?? ""} className="input" /></div>
          <div className="md:col-span-2"><label className="field-label" htmlFor="warrantyInfo">Warranty</label><input id="warrantyInfo" name="warrantyInfo" defaultValue={p.warrantyInfo ?? ""} className="input" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="warrantyVerified" defaultChecked={p.warrantyVerified} className="accent-deep" /> Warranty verified</label>
          <div><label className="field-label" htmlFor="origin">Country of origin</label><input id="origin" name="origin" defaultValue={p.origin ?? ""} className="input" /></div>
          <div><label className="field-label" htmlFor="supplierSku">Supplier SKU (staff)</label><input id="supplierSku" name="supplierSku" defaultValue={p.supplierSku ?? ""} className="input" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={p.isActive} className="accent-deep" /> Listed (visible in catalog)</label>
          <div className="md:col-span-3"><label className="field-label" htmlFor="internalNotes">Internal notes (staff)</label><textarea id="internalNotes" name="internalNotes" rows={2} defaultValue={p.internalNotes ?? ""} className="input" /></div>
          <div className="md:col-span-3"><label className="field-label" htmlFor="specsText">Specifications — one per line: Group | Label | Value</label><textarea id="specsText" name="specsText" rows={8} defaultValue={p.specs.map((s) => `${s.group} | ${s.label} | ${s.value}`).join("\n")} className="input num text-xs" /></div>
        </div>
      </ActionForm>

      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">SKUs / variants</h2>
        <table className="tbl mb-4"><thead><tr><th>SKU</th><th>Label</th><th>Colour</th><th>Region</th><th>Supplier SKU</th><th>Active</th></tr></thead>
          <tbody>{vs.map((v) => <tr key={v.id}><td className="num">{v.sku}</td><td>{v.label}</td><td>{v.color ?? "—"}</td><td>{v.region ?? "—"}</td><td>{v.supplierSku ?? "—"}</td><td>{v.isActive ? "Yes" : "No"}</td></tr>)}</tbody></table>
        <ActionForm action={`/api/admin/products/${id}/variants`} className="grid gap-2 md:grid-cols-[10rem_1fr_8rem_6rem_8rem_auto]" resetOnSuccess>
          <input name="sku" placeholder="SKU" required className="input uppercase" /><input name="label" placeholder="Label" required className="input" /><input name="color" placeholder="Colour" className="input" /><input name="region" placeholder="Region" className="input" /><input name="supplierSku" placeholder="Supplier SKU" className="input" />
          <button className="btn-deep">Add SKU</button>
        </ActionForm>
      </section>
    </div>
  );
}
