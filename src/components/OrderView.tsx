import type { orderBundle } from "@/server/orders";
import { DL, Money, StatusPill, fmtDate } from "./ui";
import type { AddressSnapshot } from "@/db/schema";

type Bundle = Awaited<ReturnType<typeof orderBundle>>;
export const addrLines = (a: AddressSnapshot) => [a.companyName, a.contactName, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), a.region, a.countryCode, a.phone].filter(Boolean);

export function OrderItemsTable({ b }: { b: Bundle }) {
  const o = b.order;
  return (
    <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
      <table className="tbl min-w-[640px]">
        <thead><tr><th>SKU</th><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Line total</th></tr></thead>
        <tbody>{b.items.map((i) => (
          <tr key={i.id}><td className="num whitespace-nowrap">{i.sku}</td><td>{i.name}{i.priceSource === "QUOTE" && <span className="ml-2 text-xs text-ok">Quoted price</span>}{i.priceSource === "CONTRACT" && <span className="ml-2 text-xs text-ok">Contract price</span>}</td>
            <td className="num text-right">{i.quantity}</td><td className="text-right"><Money cents={i.unitCents} currency={o.currency} /></td><td className="text-right font-medium"><Money cents={i.lineCents} currency={o.currency} /></td></tr>
        ))}</tbody>
        <tfoot className="text-sm">
          <tr><td colSpan={4} className="px-3 pt-3 text-right text-steel-500">Subtotal</td><td className="px-3 pt-3 text-right"><Money cents={o.subtotalCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 text-right text-steel-500">Freight & handling{o.status === "PENDING_REVIEW" && o.shippingEstimateNote ? " (to be quoted)" : ""}</td><td className="px-3 text-right"><Money cents={o.shippingCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 text-right text-steel-500">Tax ({(o.taxRateBps / 100).toFixed(o.taxRateBps % 100 ? 2 : 0)}%)</td><td className="px-3 text-right"><Money cents={o.taxCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 py-2 text-right font-bold text-deep-900">Total</td><td className="px-3 py-2 text-right text-base font-bold text-deep-900"><Money cents={o.totalCents} currency={o.currency} /></td></tr>
          {o.refundedCents > 0n && <tr><td colSpan={4} className="px-3 pb-3 text-right text-steel-500">Refunded</td><td className="px-3 pb-3 text-right text-bad">−<Money cents={o.refundedCents} currency={o.currency} /></td></tr>}
        </tfoot>
      </table>
    </div>
  );
}

export function OrderFacts({ b }: { b: Bundle }) {
  const o = b.order;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="panel panel-pad text-sm"><h3 className="mb-2 font-semibold">Deliver to</h3>{addrLines(o.shippingAddress).map((l, i) => <p key={i}>{l}</p>)}</section>
      <section className="panel panel-pad text-sm"><h3 className="mb-2 font-semibold">Invoice to</h3>{addrLines(o.billingAddress).map((l, i) => <p key={i}>{l}</p>)}</section>
      <section className="panel panel-pad text-sm">
        <h3 className="mb-2 font-semibold">Terms</h3>
        <DL rows={[["PO number", o.poNumber], ["Shipping", o.shippingMethod], ["Incoterm", o.incoterm], ["Currency", `${o.currency} (rate ${Number(o.fxRate)} per USD${o.fxIsSample ? ", sample" : ""})`], ["Payment", o.paymentMethod === "PAYPAL" ? "PayPal" : "Bank transfer"]]} />
        {o.shippingEstimateNote && <p className="mt-3 rounded bg-warn-soft px-2 py-1.5 text-xs text-warn">{o.shippingEstimateNote}</p>}
      </section>
    </div>
  );
}

export function Shipments({ b }: { b: Bundle }) {
  if (!b.shipments.length) return <p className="text-sm text-steel-500">No shipments yet. They will appear here as they are prepared.</p>;
  const byId = new Map(b.items.map((i) => [i.id, i]));
  return (
    <div className="space-y-3">{b.shipments.map((s) => (
      <div key={s.id} className="panel panel-pad text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-deep-900">{s.reference}</p><StatusPill status={s.status} /></div>
        <DL rows={[["Carrier", [s.carrier, s.service].filter(Boolean).join(" — ") || null], ["Tracking", s.trackingNumber], ["Packages", s.packageCount], ["Estimated delivery", s.estimatedDelivery ? `${s.estimatedDelivery}${s.estimateConfirmed ? " (confirmed)" : " (provisional)"}` : null], ["Dispatched", s.shippedAt ? fmtDate(s.shippedAt) : null], ["Delivered", s.deliveredAt ? fmtDate(s.deliveredAt) : null], ["Special handling", s.specialHandling]]} />
        <ul className="mt-2 text-xs text-steel-500">{s.lines.map((l) => <li key={l.orderItemId}>{l.quantity} × {byId.get(l.orderItemId)?.sku}</li>)}</ul>
      </div>))}</div>
  );
}

export function Timeline({ b }: { b: Bundle }) {
  return (
    <ol className="space-y-3 border-l-2 border-line pl-4 text-sm">{b.events.map((e) => (
      <li key={e.id} className="relative"><span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-deep" />
        <p className="text-steel">{e.message}{!e.visibleToBuyer && <span className="ml-2 text-xs text-warn">internal</span>}</p><p className="text-xs text-steel-500">{fmtDate(e.createdAt, true)}</p></li>
    ))}</ol>
  );
}
