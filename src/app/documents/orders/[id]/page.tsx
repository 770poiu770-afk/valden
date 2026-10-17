import { notFound, redirect } from "next/navigation";
import { currentActor } from "@/server/http";
import { orderBundle } from "@/server/orders";
import { addrLines } from "@/components/OrderView";
import { Money, fmtDate } from "@/components/ui";
import { Mark } from "@/components/Brand";
import { companyInfo } from "@/lib/company";
import { PrintButton } from "@/components/client/PrintButton";

export const dynamic = "force-dynamic";
const TITLES = { confirmation: "Order confirmation", proforma: "Pro-forma invoice", packing: "Packing list" } as const;

export default async function OrderDocument({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const b = await orderBundle(actor, (await params).id).catch(() => null);
  if (!b) notFound();
  const t = (await searchParams).type;
  const type: keyof typeof TITLES = t === "proforma" || t === "packing" ? t : "confirmation";
  const o = b.order;
  const c = companyInfo();
  const shipped = new Map<number, number>();
  for (const s of b.shipments.filter((x) => x.status !== "CANCELLED")) for (const l of s.lines) shipped.set(l.orderItemId, (shipped.get(l.orderItemId) ?? 0) + l.quantity);

  return (
    <main className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] text-steel print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden"><a href={actor.isStaff ? `/admin/orders/${o.id}` : `/portal/orders/${o.id}`} className="link">Back to order</a><PrintButton /></div>
      <header className="flex items-start justify-between border-b-2 border-deep pb-4">
        <div className="flex items-center gap-3"><Mark size={36} /><div><p className="wide text-lg text-deep">{c.legalName ?? "Valden"}</p>{c.address && <p>{c.address}</p>}{c.email && <p>{c.email}</p>}{!c.legalName && <p className="text-xs text-warn print:hidden">Set COMPANY_LEGAL_NAME / COMPANY_ADDRESS to print your legal entity details.</p>}</div></div>
        <div className="text-right"><h1 className="wide text-xl text-deep-900">{TITLES[type]}</h1><p className="num">{o.number}</p><p>{fmtDate(type === "confirmation" ? o.placedAt : new Date())}</p></div>
      </header>
      {type === "proforma" && <p className="mt-3 rounded border border-line bg-paper px-3 py-2 text-xs">Pro-forma invoice for payment and import pre-clearance purposes. Not a tax invoice. Prices in {o.currency}{o.currency !== "USD" ? ` converted at ${Number(o.fxRate)} per USD (${o.fxSource})` : ""}.</p>}
      <section className="mt-5 grid grid-cols-3 gap-6">
        <div><p className="mb-1 font-semibold text-deep-900">Bill to</p>{addrLines(o.billingAddress).map((l, i) => <p key={i}>{l}</p>)}</div>
        <div><p className="mb-1 font-semibold text-deep-900">Ship to</p>{addrLines(o.shippingAddress).map((l, i) => <p key={i}>{l}</p>)}</div>
        <div className="space-y-0.5"><p><span className="text-steel-500">PO: </span>{o.poNumber ?? "—"}</p><p><span className="text-steel-500">Incoterm: </span>{o.incoterm ?? "—"}</p><p><span className="text-steel-500">Shipping: </span>{o.shippingMethod}</p>
          {Object.entries(o.exportDetails).map(([k, v]) => <p key={k}><span className="text-steel-500">{k.replace(/([A-Z])/g, " $1").toLowerCase()}: </span>{v}</p>)}</div>
      </section>
      <table className="tbl mt-6">
        <thead><tr><th>SKU</th><th>Description</th><th className="text-right">Qty</th>{type === "packing" ? <><th className="text-right">Shipped</th><th className="text-right">Remaining</th></> : <><th className="text-right">Unit</th><th className="text-right">Amount</th></>}</tr></thead>
        <tbody>{b.items.map((i) => (
          <tr key={i.id}><td className="num">{i.sku}</td><td>{i.name}</td><td className="num text-right">{i.quantity}</td>
            {type === "packing" ? <><td className="num text-right">{shipped.get(i.id) ?? 0}</td><td className="num text-right">{i.quantity - (shipped.get(i.id) ?? 0)}</td></> : <><td className="text-right"><Money cents={i.unitCents} currency={o.currency} /></td><td className="text-right"><Money cents={i.lineCents} currency={o.currency} /></td></>}</tr>
        ))}</tbody>
      </table>
      {type !== "packing" && (
        <div className="ml-auto mt-4 w-72 space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><Money cents={o.subtotalCents} currency={o.currency} /></div>
          <div className="flex justify-between"><span>Freight & handling</span><Money cents={o.shippingCents} currency={o.currency} /></div>
          <div className="flex justify-between"><span>Tax ({o.taxRateBps / 100}%)</span><Money cents={o.taxCents} currency={o.currency} /></div>
          <div className="flex justify-between border-t-2 border-deep pt-1 text-base font-bold text-deep-900"><span>Total</span><Money cents={o.totalCents} currency={o.currency} /></div>
        </div>
      )}
      {type === "confirmation" && <p className="mt-8 text-xs text-steel-500">Status at time of printing: {o.status.replace(/_/g, " ").toLowerCase()}; payment {o.paymentStatus.replace(/_/g, " ").toLowerCase()}. {o.shippingEstimateNote}</p>}
      <footer className="mt-10 border-t border-line pt-3 text-[11px] text-steel-500">Product names are trademarks of their respective owners. Goods remain the property of the seller until paid in full.</footer>
    </main>
  );
}
