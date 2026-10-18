import type { orderBundle } from "@/server/orders";
import { DL, Money, StatusPill, fmtDate } from "./ui";
import type { AddressSnapshot } from "@/db/schema";
import { makeT, type Locale } from "@/lib/i18n";
import { trMessage } from "@/lib/messages-he";
import { shippingText } from "@/lib/labels";
import { DEFAULT_SETTINGS } from "@/lib/settings";

type Bundle = Awaited<ReturnType<typeof orderBundle>>;
export const addrLines = (a: AddressSnapshot) => [a.companyName, a.contactName, a.line1, a.line2, [a.postalCode, a.city].filter(Boolean).join(" "), a.region, a.countryCode, a.phone].filter(Boolean);

export function OrderItemsTable({ b, l = "en" }: { b: Bundle; l?: Locale }) {
  const o = b.order;
  const t = makeT(l);
  return (
    <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
      <table className="tbl min-w-[640px]">
        <thead><tr><th scope="col">{t("SKU", "מק״ט")}</th><th scope="col">{t("Description", "תיאור")}</th><th scope="col" className="text-end">{t("Qty", "כמות")}</th><th scope="col" className="text-end">{t("Unit", "ליחידה")}</th><th scope="col" className="text-end">{t("Line total", "סה״כ שורה")}</th></tr></thead>
        <tbody>{b.items.map((i) => (
          <tr key={i.id}><td className="num whitespace-nowrap">{i.sku}</td><td><span dir="auto">{i.name}</span>{i.priceSource === "QUOTE" && <span className="ms-2 text-xs text-ok">{t("Quoted price", "מחיר מהצעה")}</span>}{i.priceSource === "CONTRACT" && <span className="ms-2 text-xs text-ok">{t("Contract price", "מחיר חוזה")}</span>}</td>
            <td className="num text-end">{i.quantity}</td><td className="text-end"><Money cents={i.unitCents} currency={o.currency} /></td><td className="text-end font-medium"><Money cents={i.lineCents} currency={o.currency} /></td></tr>
        ))}</tbody>
        <tfoot className="text-sm">
          <tr><td colSpan={4} className="px-3 pt-3 text-end text-steel-500">{t("Subtotal", "סכום ביניים")}</td><td className="px-3 pt-3 text-end"><Money cents={o.subtotalCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 text-end text-steel-500">{t("Freight & handling", "משלוח וטיפול")}{o.status === "PENDING_REVIEW" && o.shippingEstimateNote ? t(" (to be quoted)", " (יתומחר)") : ""}</td><td className="px-3 text-end"><Money cents={o.shippingCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 text-end text-steel-500">{t("Tax", "מע״מ")} ({(o.taxRateBps / 100).toFixed(o.taxRateBps % 100 ? 2 : 0)}%)</td><td className="px-3 text-end"><Money cents={o.taxCents} currency={o.currency} /></td></tr>
          <tr><td colSpan={4} className="px-3 py-2 text-end font-bold text-deep-900">{t("Total", "סה״כ")}</td><td className="px-3 py-2 text-end text-base font-bold text-deep-900"><Money cents={o.totalCents} currency={o.currency} /></td></tr>
          {o.refundedCents > 0n && <tr><td colSpan={4} className="px-3 pb-3 text-end text-steel-500">{t("Refunded", "הוחזר")}</td><td className="px-3 pb-3 text-end text-bad">−<Money cents={o.refundedCents} currency={o.currency} /></td></tr>}
        </tfoot>
      </table>
    </div>
  );
}

export function OrderFacts({ b, l = "en" }: { b: Bundle; l?: Locale }) {
  const o = b.order;
  const t = makeT(l);
  const ship = DEFAULT_SETTINGS.shippingMethods.find((m) => m.name === o.shippingMethod);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      <section className="panel panel-pad text-sm" dir="auto"><h3 className="mb-2 font-semibold">{t("Deliver to", "משלוח אל")}</h3>{addrLines(o.shippingAddress).map((line, i) => <p key={i}>{line}</p>)}</section>
      <section className="panel panel-pad text-sm" dir="auto"><h3 className="mb-2 font-semibold">{t("Invoice to", "חשבונית אל")}</h3>{addrLines(o.billingAddress).map((line, i) => <p key={i}>{line}</p>)}</section>
      <section className="panel panel-pad text-sm">
        <h3 className="mb-2 font-semibold">{t("Terms", "תנאים")}</h3>
        <DL rows={[[t("PO number", "מספר הזמנת רכש"), o.poNumber], [t("Shipping", "משלוח"), ship ? shippingText(ship, l).name : o.shippingMethod], ["Incoterm", o.incoterm], [t("Currency", "מטבע"), t(`${o.currency} (rate ${Number(o.fxRate)} per USD${o.fxIsSample ? ", sample" : ""})`, `${o.currency} (שער ${Number(o.fxRate)} לדולר${o.fxIsSample ? ", לדוגמה" : ""})`)], [t("Payment", "תשלום"), o.paymentMethod === "PAYPAL" ? "PayPal" : t("Bank transfer", "העברה בנקאית")]]} />
        {o.shippingEstimateNote && <p className="mt-3 rounded bg-warn-soft px-2 py-1.5 text-xs text-warn" dir="auto">{trMessage(o.shippingEstimateNote, l)}</p>}
      </section>
    </div>
  );
}

export function Shipments({ b, l = "en" }: { b: Bundle; l?: Locale }) {
  const t = makeT(l);
  if (!b.shipments.length) return <p className="text-sm text-steel-500">{t("No shipments yet. They will appear here as they are prepared.", "עדיין אין משלוחים. הם יופיעו כאן כשיוכנו.")}</p>;
  const byId = new Map(b.items.map((i) => [i.id, i]));
  return (
    <div className="space-y-3">{b.shipments.map((s) => (
      <div key={s.id} className="panel panel-pad text-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-deep-900">{s.reference}</p><StatusPill status={s.status} l={l} /></div>
        <DL rows={[[t("Carrier", "חברת שילוח"), [s.carrier, s.service].filter(Boolean).join(" — ") || null], [t("Tracking", "מספר מעקב"), s.trackingNumber], [t("Packages", "חבילות"), s.packageCount], [t("Estimated delivery", "אספקה משוערת"), s.estimatedDelivery ? `${s.estimatedDelivery}${s.estimateConfirmed ? t(" (confirmed)", " (מאושר)") : t(" (provisional)", " (זמני)")}` : null], [t("Dispatched", "נשלח"), s.shippedAt ? fmtDate(s.shippedAt, false, l) : null], [t("Delivered", "נמסר"), s.deliveredAt ? fmtDate(s.deliveredAt, false, l) : null], [t("Special handling", "טיפול מיוחד"), s.specialHandling]]} />
        <ul className="mt-2 text-xs text-steel-500">{s.lines.map((line) => <li key={line.orderItemId}>{line.quantity} × {byId.get(line.orderItemId)?.sku}</li>)}</ul>
      </div>))}</div>
  );
}

export function Timeline({ b, l = "en" }: { b: Bundle; l?: Locale }) {
  return (
    <ol className="space-y-3 border-s-2 border-line ps-4 text-sm">{b.events.map((e) => (
      <li key={e.id} className="relative"><span className="absolute -start-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-deep" />
        <p className="text-steel" dir="auto">{trMessage(e.message, l)}{!e.visibleToBuyer && <span className="ms-2 text-xs text-warn">internal</span>}</p><p className="text-xs text-steel-500">{fmtDate(e.createdAt, true, l)}</p></li>
    ))}</ol>
  );
}
