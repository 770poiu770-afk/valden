import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { quoteBundle } from "@/server/quotes";
import { getSettings } from "@/lib/settings";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { DL, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Quote" };
const d2 = (c: number | null) => (c === null ? "" : (c / 100).toFixed(2));
export default async function AdminQuote({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("quotes.manage");
  const b = await quoteBundle(a, (await params).id).catch(() => null);
  if (!b) notFound();
  const { quote: q, items, requester } = b;
  const co = (await db.select().from(companies).where(eq(companies.id, q.companyId)))[0];
  const s = await getSettings();
  const canOffer = ["SUBMITTED", "UNDER_REVIEW", "OFFERED", "EXPIRED"].includes(q.status);
  return (
    <div className="space-y-6">
      <PageHeader title={`Quote ${q.number}`} back={{ href: "/admin/quotes", label: "Quotes" }} intro={<span className="flex items-center gap-2"><StatusPill status={q.status} /> from <Link className="link" href={`/admin/companies/${co.id}`}>{co.legalName}</Link> ({requester.fullName}, {requester.email})</span>}
        actions={q.status === "SUBMITTED" ? <ActionButton action={`/api/admin/quotes/${q.id}/review`} label="Mark under review" /> : undefined} />
      <section className="panel panel-pad"><DL rows={[["Received", fmtDate(q.createdAt, true)], ["Buyer currency", q.currency], ["Buyer notes", q.buyerNotes], ["Offer expires", q.offerExpiresAt ? fmtDate(q.offerExpiresAt, true) : null], ["Converted order", q.orderId ? <Link key="o" className="link" href={`/admin/orders/${q.orderId}`}>View order</Link> : null]]} /></section>
      <ActionForm action={`/api/admin/quotes/${q.id}/offer`} className="space-y-4" submitLabel={canOffer ? (q.status === "OFFERED" ? "Re-issue offer" : "Issue offer") : undefined} confirm="Send this offer to the buyer?">
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl min-w-[900px]">
          <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Reference</th><th className="text-right">List (tier)</th><th className="text-right">Buyer target</th><th className="w-36 text-right">Offer unit (USD)</th><th className="w-48">Line note</th></tr></thead>
          <tbody>{items.map((i, idx) => (
            <tr key={i.id}>
              <td><Link className="link" href={`/products/${i.slug}`} target="_blank">{i.name}</Link><p className="num text-xs text-steel-500">{i.sku} · MOQ {i.moq}</p><input type="hidden" name={`lines[${idx}].id`} value={i.id} /></td>
              <td className="num text-right">{i.quantity}</td>
              <td className="text-right text-steel-500"><Money cents={i.referenceCents} currency="USD" /></td>
              <td className="text-right"><Money cents={i.listUnitCents} currency="USD" /></td>
              <td className="text-right">{i.targetUnitCents !== null ? <Money cents={i.targetUnitCents} currency="USD" /> : "—"}</td>
              <td><input name={`lines[${idx}].offeredUnitPrice`} defaultValue={d2(i.offeredUnitCents ?? i.listUnitCents)} disabled={!canOffer} className="input num text-right" aria-label={`Offer price for ${i.sku}`} /></td>
              <td><input name={`lines[${idx}].lineNote`} defaultValue={i.lineNote ?? ""} disabled={!canOffer} className="input" aria-label="Line note" /></td>
            </tr>))}</tbody>
        </table></div>
        {canOffer && (
          <div className="panel panel-pad grid gap-4 md:grid-cols-4">
            <div><label className="field-label" htmlFor="shippingAmount">Freight (USD, optional)</label><input id="shippingAmount" name="shippingAmount" defaultValue={d2(q.offerShippingBaseCents === null ? null : Number(q.offerShippingBaseCents))} className="input" /></div>
            <div><label className="field-label" htmlFor="shippingMethod">Freight terms</label><input id="shippingMethod" name="shippingMethod" defaultValue={q.offerShippingMethod ?? ""} placeholder="e.g. DAP Ashdod, insured" className="input" /></div>
            <div><label className="field-label" htmlFor="validityDays">Valid for (days)</label><input id="validityDays" name="validityDays" type="number" min={1} max={90} defaultValue={s.quoteDefaults.offerValidityDays} className="input" /></div>
            <div className="md:col-span-4"><label className="field-label" htmlFor="offerNotes">Message to buyer</label><textarea id="offerNotes" name="offerNotes" rows={2} defaultValue={q.offerNotes ?? ""} className="input" /></div>
            <div className="md:col-span-4"><label className="field-label" htmlFor="internalNotes">Internal notes (supplier quotes, margin rationale)</label><textarea id="internalNotes" name="internalNotes" rows={2} defaultValue={q.internalNotes ?? ""} className="input" /></div>
          </div>
        )}
      </ActionForm>
    </div>
  );
}
