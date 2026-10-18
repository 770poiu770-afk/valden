import { notFound, redirect } from "next/navigation";
import { currentActor } from "@/server/http";
import { orderBundle } from "@/server/orders";
import { addrLines } from "@/components/OrderView";
import { Money, fmtDate } from "@/components/ui";
import { Mark } from "@/components/Brand";
import { companyInfo } from "@/lib/company";
import { PrintButton } from "@/components/client/PrintButton";
import { getLocale } from "@/server/locale";
import { makeT, dirOf, type Locale } from "@/lib/i18n";
import { statusLabel } from "@/lib/labels";
import { trMessage } from "@/lib/messages-he";

export const dynamic = "force-dynamic";
const TITLES = { confirmation: ["Order confirmation", "אישור הזמנה"], proforma: ["Pro-forma invoice", "חשבון עסקה"], packing: ["Packing list", "רשימת אריזה"] } as const;

export default async function OrderDocument({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ type?: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  const b = await orderBundle(actor, (await params).id).catch(() => null);
  if (!b) notFound();
  const qt = (await searchParams).type;
  const type: keyof typeof TITLES = qt === "proforma" || qt === "packing" ? qt : "confirmation";
  // Documents follow the buyer's language; staff always get English.
  const l: Locale = actor.isStaff ? "en" : await getLocale();
  const t = makeT(l);
  const o = b.order;
  const c = companyInfo();
  const shipped = new Map<number, number>();
  for (const s of b.shipments.filter((x) => x.status !== "CANCELLED")) for (const l of s.lines) shipped.set(l.orderItemId, (shipped.get(l.orderItemId) ?? 0) + l.quantity);

  return (
    <main id="main" lang={l} dir={dirOf(l)} className="mx-auto max-w-[210mm] bg-white p-10 text-[13px] text-steel print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden"><a href={actor.isStaff ? `/admin/orders/${o.id}` : `/portal/orders/${o.id}`} className="link">{t("Back to order", "חזרה להזמנה")}</a><PrintButton label={t("Print / save as PDF", "הדפסה / שמירה כ-PDF")} /></div>
      <header className="flex items-start justify-between border-b-2 border-deep pb-4">
        <div className="flex items-center gap-3"><Mark size={36} /><div><p className="wide text-lg text-deep">{c.legalName ?? "Valden"}</p>{c.address && <p>{c.address}</p>}{c.email && <p>{c.email}</p>}{!c.legalName && <p className="text-xs text-warn print:hidden">Set COMPANY_LEGAL_NAME / COMPANY_ADDRESS to print your legal entity details.</p>}</div></div>
        <div className="text-end"><h1 className="wide text-xl text-deep-900">{l === "he" ? TITLES[type][1] : TITLES[type][0]}</h1><p className="num">{o.number}</p><p>{fmtDate(type === "confirmation" ? o.placedAt : new Date(), false, l)}</p></div>
      </header>
      {type === "proforma" && <p className="mt-3 rounded border border-line bg-paper px-3 py-2 text-xs">{t(`Pro-forma invoice for payment and import pre-clearance purposes. Not a tax invoice. Prices in ${o.currency}${o.currency !== "USD" ? ` converted at ${Number(o.fxRate)} per USD (${o.fxSource})` : ""}.`, `חשבון עסקה לצורכי תשלום ושחרור מוקדם ביבוא. אינו חשבונית מס. המחירים ב-${o.currency}${o.currency !== "USD" ? `, הומרו לפי ${Number(o.fxRate)} לדולר` : ""}.`)}</p>}
      <section className="mt-5 grid grid-cols-3 gap-6">
        <div dir="auto"><p className="mb-1 font-semibold text-deep-900">{t("Bill to", "חשבונית אל")}</p>{addrLines(o.billingAddress).map((line, i) => <p key={i}>{line}</p>)}</div>
        <div dir="auto"><p className="mb-1 font-semibold text-deep-900">{t("Ship to", "משלוח אל")}</p>{addrLines(o.shippingAddress).map((line, i) => <p key={i}>{line}</p>)}</div>
        <div className="space-y-0.5"><p><span className="text-steel-500">{t("PO: ", "הזמנת רכש: ")}</span>{o.poNumber ?? "—"}</p><p><span className="text-steel-500">Incoterm: </span>{o.incoterm ?? "—"}</p><p><span className="text-steel-500">{t("Shipping: ", "משלוח: ")}</span><span dir="auto">{o.shippingMethod}</span></p>
          {Object.entries(o.exportDetails).map(([k, v]) => <p key={k}><span className="text-steel-500">{k.replace(/([A-Z])/g, " $1").toLowerCase()}: </span>{v}</p>)}</div>
      </section>
      <table className="tbl mt-6">
        <thead><tr><th scope="col">{t("SKU", "מק״ט")}</th><th scope="col">{t("Description", "תיאור")}</th><th scope="col" className="text-end">{t("Qty", "כמות")}</th>{type === "packing" ? <><th scope="col" className="text-end">{t("Shipped", "נשלח")}</th><th scope="col" className="text-end">{t("Remaining", "נותר")}</th></> : <><th scope="col" className="text-end">{t("Unit", "ליחידה")}</th><th scope="col" className="text-end">{t("Amount", "סכום")}</th></>}</tr></thead>
        <tbody>{b.items.map((i) => (
          <tr key={i.id}><td className="num">{i.sku}</td><td dir="auto">{i.name}</td><td className="num text-end">{i.quantity}</td>
            {type === "packing" ? <><td className="num text-end">{shipped.get(i.id) ?? 0}</td><td className="num text-end">{i.quantity - (shipped.get(i.id) ?? 0)}</td></> : <><td className="text-end"><Money cents={i.unitCents} currency={o.currency} /></td><td className="text-end"><Money cents={i.lineCents} currency={o.currency} /></td></>}</tr>
        ))}</tbody>
      </table>
      {type !== "packing" && (
        <div className="ms-auto mt-4 w-72 space-y-1">
          <div className="flex justify-between"><span>{t("Subtotal", "סכום ביניים")}</span><Money cents={o.subtotalCents} currency={o.currency} /></div>
          <div className="flex justify-between"><span>{t("Freight & handling", "משלוח וטיפול")}</span><Money cents={o.shippingCents} currency={o.currency} /></div>
          <div className="flex justify-between"><span>{t("Tax", "מע״מ")} ({o.taxRateBps / 100}%)</span><Money cents={o.taxCents} currency={o.currency} /></div>
          <div className="flex justify-between border-t-2 border-deep pt-1 text-base font-bold text-deep-900"><span>{t("Total", "סה״כ")}</span><Money cents={o.totalCents} currency={o.currency} /></div>
        </div>
      )}
      {type === "confirmation" && <p className="mt-8 text-xs text-steel-500">{t("Status at time of printing:", "סטטוס בעת ההדפסה:")} {statusLabel(o.status, l)}; {t("payment", "תשלום")}: {statusLabel(o.paymentStatus, l)}. {trMessage(o.shippingEstimateNote, l)}</p>}
      <footer className="mt-10 border-t border-line pt-3 text-[11px] text-steel-500">{t("Product names are trademarks of their respective owners. Goods remain the property of the seller until paid in full.", "שמות המוצרים הם סימני מסחר של בעליהם. הסחורה נשארת בבעלות המוכר עד לתשלום מלא.")}</footer>
    </main>
  );
}
