import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { quoteBundle } from "@/server/quotes";
import { getSettings } from "@/lib/settings";
import { getRate } from "@/lib/fx";
import { ActionForm } from "@/components/ActionForm";
import { CheckoutFields } from "@/components/CheckoutFields";
import { DL, Money, Notice, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { convertMinor, isCurrency } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quote" };

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const actor = await requireApprovedBuyer();
  const b = await quoteBundle(actor, (await params).id).catch(() => null);
  if (!b) notFound();
  const { quote: q, items } = b;
  const s = await getSettings();
  const cur = isCurrency(q.currency) ? q.currency : "USD";
  const rate = await getRate(cur);
  const conv = (c: number | bigint | null) => (c === null || !rate ? null : convertMinor(BigInt(c), rate.rate));
  const offered = q.status === "OFFERED";
  const addrs = offered ? await db.select().from(addresses).where(eq(addresses.companyId, actor.companyId)) : [];
  const offerTotal = q.offerTotalBaseCents;

  return (
    <div className="space-y-6">
      <PageHeader title={`Quote ${q.number}`} back={{ href: "/portal/quotes", label: "Quotes & offers" }} intro={<span className="flex flex-wrap items-center gap-2">Requested {fmtDate(q.createdAt)} <StatusPill status={q.status} /></span>} />
      {(await searchParams).submitted && <Notice tone="ok" title="Request submitted">Our trade desk will review it and issue a formal offer. We will email you when it is ready.</Notice>}
      {q.status === "CONVERTED" && q.orderId && <Notice tone="ok">Accepted and converted to an order. <Link className="link" href={`/portal/orders/${q.orderId}`}>View order</Link></Notice>}
      {q.status === "EXPIRED" && <Notice tone="warn">This offer has expired. <Link className="link" href="/contact?topic=Quote+request">Ask the trade desk</Link> to re-issue it.</Notice>}
      {offered && <Notice tone="info" title={`Offer valid until ${fmtDate(q.offerExpiresAt, true)}`}>{q.offerNotes ?? "Review the offered prices below and accept to place the order."}</Notice>}

      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
        <table className="tbl min-w-[720px]">
          <thead><tr><th>Product</th><th className="text-right">Qty</th><th className="text-right">Your target</th><th className="text-right">List unit</th><th className="text-right">Offered unit</th><th className="text-right">Offered line</th></tr></thead>
          <tbody>{items.map((i) => (
            <tr key={i.id}>
              <td><Link className="font-medium text-deep-900 hover:underline" href={`/products/${i.slug}`}>{i.name}</Link><p className="text-xs text-steel-500">{i.label} · <span className="num">{i.sku}</span></p>{i.lineNote && <p className="text-xs text-info">{i.lineNote}</p>}</td>
              <td className="num text-right">{i.quantity}</td>
              <td className="text-right">{i.targetUnitCents !== null ? <Money cents={i.targetUnitCents} currency="USD" /> : "—"}</td>
              <td className="text-right text-steel-500"><Money cents={i.listUnitCents} currency="USD" /></td>
              <td className="text-right font-semibold text-deep-900">{i.offeredUnitCents !== null ? <Money cents={i.offeredUnitCents} currency="USD" /> : "Pending"}</td>
              <td className="text-right">{i.offeredUnitCents !== null ? <Money cents={BigInt(i.offeredUnitCents) * BigInt(i.quantity)} currency="USD" /> : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {offerTotal !== null && (
        <section className="panel panel-pad grid gap-6 md:grid-cols-2">
          <DL rows={[
            ["Offer total (USD)", <Money key="t" cents={offerTotal} currency="USD" className="font-semibold" />],
            [`Indicative in ${cur}`, cur === "USD" ? "—" : <span key="c"><Money cents={conv(offerTotal)} currency={cur} />{rate?.isSample ? " (sample rate)" : ""}</span>],
            ["Freight", q.offerShippingBaseCents !== null ? <Money key="f" cents={q.offerShippingBaseCents} currency="USD" /> : "Not included / buyer arranged"],
            ["Freight terms", q.offerShippingMethod],
          ]} />
          <p className="text-sm text-steel-500">Offered prices are set in USD. If you accept in {cur}, amounts are converted at the exchange rate recorded on the day of acceptance and shown on your order. Tax is added according to the delivery country.</p>
        </section>
      )}
      {q.buyerNotes && <section className="panel panel-pad text-sm"><h2 className="mb-1 font-semibold">Your notes</h2><p className="whitespace-pre-line">{q.buyerNotes}</p></section>}

      {offered && (
        <section>
          <h2 className="wide mb-3 text-xl">Accept this offer</h2>
          <ActionForm action={`/api/quotes/${q.id}/accept`} submitLabel="Accept offer and place order" submitClass="btn-primary px-8 py-3" confirm="Accept this offer and place the order at the offered prices?">
            <CheckoutFields addrs={addrs} settings={s} currency={cur} paypalBlocked={false} />
          </ActionForm>
          <details className="mt-6 panel panel-pad">
            <summary className="cursor-pointer text-sm font-semibold text-bad">Decline this offer</summary>
            <ActionForm action={`/api/quotes/${q.id}/decline`} className="mt-3 max-w-lg" submitLabel="Decline offer" submitClass="btn-danger">
              <label className="field-label" htmlFor="reason">Reason (helps us improve future offers)</label><input id="reason" name="reason" className="input" />
            </ActionForm>
          </details>
        </section>
      )}
      {["SUBMITTED", "UNDER_REVIEW"].includes(q.status) && (
        <ActionForm action={`/api/quotes/${q.id}/decline`} submitLabel="Withdraw request" submitClass="btn-ghost btn-sm" confirm="Withdraw this quote request?"><input type="hidden" name="reason" value="Withdrawn by buyer" /></ActionForm>
      )}
    </div>
  );
}
