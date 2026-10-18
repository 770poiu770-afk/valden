import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, refunds } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { orderBundle } from "@/server/orders";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { OrderFacts, OrderItemsTable, Shipments, Timeline } from "@/components/OrderView";
import { Money, Notice, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { minorToDecimalString } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("admin.access");
  const b = await orderBundle(a, (await params).id).catch(() => null);
  if (!b) notFound();
  const o = b.order;
  const co = (await db.select().from(companies).where(eq(companies.id, o.companyId)))[0];
  const rfs = await db.select().from(refunds).where(eq(refunds.orderId, o.id)).orderBy(desc(refunds.createdAt));
  const can = (p: Parameters<typeof a.permissions.has>[0]) => a.permissions.has(p);
  const shippedQty = new Map<number, number>();
  for (const s of b.shipments.filter((x) => x.status !== "CANCELLED")) for (const l of s.lines) shippedQty.set(l.orderItemId, (shippedQty.get(l.orderItemId) ?? 0) + l.quantity);
  const remaining = b.items.map((i) => ({ i, left: i.quantity - (shippedQty.get(i.id) ?? 0) })).filter((x) => x.left > 0);
  const completed = b.payments.find((p) => ["COMPLETED", "PARTIALLY_REFUNDED"].includes(p.status));

  return (
    <div className="space-y-6">
      <PageHeader title={`Order ${o.number}`} back={{ href: "/admin/orders", label: "Orders" }}
        intro={<span className="flex flex-wrap items-center gap-2"><Link className="link" href={`/admin/companies/${co.id}`}>{co.legalName}</Link> · {fmtDate(o.placedAt, true)} <StatusPill status={o.status} /> <StatusPill status={o.paymentStatus} /></span>}
        actions={<><Link className="btn-outline btn-sm" target="_blank" href={`/documents/orders/${o.id}?type=proforma`}>Pro-forma</Link><Link className="btn-outline btn-sm" target="_blank" href={`/documents/orders/${o.id}?type=packing`}>Packing list</Link></>} />

      {o.riskStatus === "PENDING_REVIEW" && <Notice tone="warn" title="Risk review required"><ul className="list-disc pl-5">{o.riskReasons.map((r) => <li key={r}>{r}</li>)}</ul>Verify the account, delivery destination and payment route before confirming.</Notice>}
      {o.fxIsSample && <Notice tone="warn">This order was priced with a sample exchange rate ({o.fxSource}).</Notice>}

      {o.status === "PENDING_REVIEW" && can("orders.manage") && (
        <section className="panel panel-pad">
          <h2 className="mb-1 font-semibold">Review and confirm</h2>
          <p className="mb-4 text-sm text-steel-500">Confirm availability with suppliers, enter freight in {o.currency} (0 for buyer-arranged collection), then confirm. The buyer is then asked to pay {o.paymentMethod === "PAYPAL" ? "via PayPal" : "by bank transfer"}.</p>
          <div className="grid gap-6 lg:grid-cols-2">
            <ActionForm action={`/api/admin/orders/${o.id}/confirm`} className="space-y-3" submitLabel="Confirm order and request payment">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="field-label" htmlFor="shippingAmount">Freight & handling ({o.currency})</label><input id="shippingAmount" name="shippingAmount" defaultValue={minorToDecimalString(o.shippingCents)} className="input" /></div>
                <div><label className="field-label" htmlFor="estimateNote">Delivery estimate (provisional)</label><input id="estimateNote" name="estimateNote" placeholder="e.g. 7–10 business days after payment" className="input" /></div>
              </div>
              <div><label className="field-label" htmlFor="note">Internal note</label><input id="note" name="note" className="input" /></div>
            </ActionForm>
            <ActionForm action={`/api/admin/orders/${o.id}/reject`} className="space-y-3" submitLabel="Decline order" submitClass="btn-danger" confirm="Decline this order?">
              <label className="field-label" htmlFor="reason">Reason (shown to buyer)</label><input id="reason" name="reason" required minLength={5} className="input" />
            </ActionForm>
          </div>
        </section>
      )}

      {o.status === "AWAITING_PAYMENT" && o.paymentMethod === "MANUAL_TRANSFER" && can("payments.manage") && ["UNPAID", "FAILED"].includes(o.paymentStatus) && (
        <section className="panel panel-pad">
          <h2 className="mb-1 font-semibold">Record verified bank transfer</h2>
          <p className="mb-3 text-sm text-steel-500">Only record a payment after the funds are confirmed in the company bank account.</p>
          <ActionForm action={`/api/admin/orders/${o.id}/manual-payment`} className="grid gap-3 md:grid-cols-[10rem_1fr_1fr_auto]" confirm="Confirm the funds have been received and verified?">
            <input name="amount" defaultValue={minorToDecimalString(o.totalCents)} className="input num" aria-label="Amount" /><input name="reference" placeholder="Bank reference" required className="input" /><input name="note" placeholder="Note" className="input" /><button className="btn-deep">Record payment</button>
          </ActionForm>
        </section>
      )}

      {o.status === "PAID" && can("orders.manage") && <ActionButton action={`/api/admin/orders/${o.id}/processing`} label="Move to processing" className="btn-deep" />}

      <OrderItemsTable b={b} />
      <OrderFacts b={b} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="wide text-lg">Payments</h2>
          {b.payments.length === 0 ? <p className="text-sm text-steel-500">No payment attempts.</p> : (
            <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl"><thead><tr><th>Provider</th><th>Status</th><th className="text-right">Amount</th><th>Reference</th></tr></thead>
              <tbody>{b.payments.map((p) => <tr key={p.id}><td>{p.provider}</td><td><StatusPill status={p.status} />{p.failureReason && <p className="text-xs text-bad">{p.failureReason}</p>}</td><td className="text-right"><Money cents={p.amountCents} currency={p.currency} /></td><td className="num text-xs">{p.providerCaptureId ?? p.providerOrderId ?? p.manualReference ?? "—"}<br /><span className="text-steel-500">{fmtDate(p.capturedAt ?? p.createdAt, true)}</span>{p.provider === "PAYPAL" && p.providerOrderId && ["CREATED", "APPROVED", "PENDING"].includes(p.status) && can("payments.manage") && <div className="mt-1"><ActionButton action={`/api/admin/payments/${p.id}/reconcile`} label="Check with PayPal" /></div>}</td></tr>)}</tbody></table></div>
          )}
          {rfs.length > 0 && <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl"><thead><tr><th>Refund</th><th>Status</th><th className="text-right">Amount</th><th>Reason</th></tr></thead><tbody>{rfs.map((r) => <tr key={r.id}><td className="num text-xs">{r.providerRefundId ?? "pending"}</td><td><StatusPill status={r.status} />{r.failureReason && <p className="text-xs text-bad">{r.failureReason}</p>}</td><td className="text-right"><Money cents={r.amountCents} currency={r.currency} /></td><td className="text-xs">{r.reason}</td></tr>)}</tbody></table></div>}
          {completed && can("payments.manage") && (
            <details className="panel panel-pad"><summary className="cursor-pointer text-sm font-semibold">Issue a refund</summary>
              <ActionForm action={`/api/admin/orders/${o.id}/refunds`} className="mt-3 grid gap-3 sm:grid-cols-2" submitLabel={completed.provider === "PAYPAL" ? "Refund via PayPal" : "Record refund"} confirm="Issue this refund? This sends money back to the buyer.">
                <div><label className="field-label" htmlFor="amount">Amount ({o.currency})</label><input id="amount" name="amount" required className="input" /></div>
                <div><label className="field-label" htmlFor="reason">Reason</label><input id="reason" name="reason" required minLength={5} className="input" /></div>
                {completed.provider === "MANUAL" && <div className="sm:col-span-2"><label className="field-label" htmlFor="manualReference">Outgoing transfer reference</label><input id="manualReference" name="manualReference" required className="input" /></div>}
              </ActionForm></details>
          )}
        </section>
        <section className="space-y-3">
          <h2 className="wide text-lg">Shipments</h2>
          <Shipments b={b} />
          {can("shipping.manage") && b.shipments.filter((s) => !["DELIVERED", "CANCELLED"].includes(s.status)).map((s) => (
            <ActionForm key={s.id} action={`/api/admin/shipments/${s.id}`} className="panel panel-pad grid gap-2 sm:grid-cols-2">
              <p className="text-sm font-semibold sm:col-span-2">Update {s.reference}</p>
              <select name="status" defaultValue={s.status} className="input">{["PREPARING", "READY", "IN_TRANSIT", "DELIVERED", "EXCEPTION", "CANCELLED"].map((x) => <option key={x} value={x}>{x.replace("_", " ").toLowerCase()}</option>)}</select>
              <input name="trackingNumber" defaultValue={s.trackingNumber ?? ""} placeholder="Tracking number (from carrier)" className="input" />
              <input name="carrier" defaultValue={s.carrier ?? ""} placeholder="Carrier" className="input" />
              <input name="estimatedDelivery" defaultValue={s.estimatedDelivery ?? ""} placeholder="Estimated delivery" className="input" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="estimateConfirmed" defaultChecked={s.estimateConfirmed} className="accent-deep" /> Estimate confirmed by carrier</label>
              <button className="btn-outline btn-sm justify-self-start">Save shipment</button>
            </ActionForm>
          ))}
          {can("shipping.manage") && remaining.length > 0 && ["PAID", "PROCESSING", "PARTIALLY_SHIPPED"].includes(o.status) && (
            <details className="panel panel-pad" open={b.shipments.length === 0}><summary className="cursor-pointer text-sm font-semibold">Create shipment</summary>
              <ActionForm action={`/api/admin/orders/${o.id}/shipments`} className="mt-3 space-y-3" submitLabel="Create shipment">
                <table className="tbl"><thead><tr><th>SKU</th><th className="text-right">Remaining</th><th className="w-28 text-right">Ship now</th></tr></thead>
                  <tbody>{remaining.map(({ i, left }) => <tr key={i.id}><td className="num text-xs">{i.sku}</td><td className="num text-right">{left}</td><td><input name={`qty_${i.id}`} type="number" min={0} max={left} defaultValue={left} className="input num text-right" aria-label={`Quantity for ${i.sku}`} /></td></tr>)}</tbody></table>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="carrier" placeholder="Carrier" className="input" /><input name="service" placeholder="Service" className="input" />
                  <input name="trackingNumber" placeholder="Tracking number (if issued)" className="input" /><input name="packageCount" type="number" min={1} placeholder="Packages" className="input" />
                  <input name="grossWeightKg" placeholder="Gross weight kg" className="input" /><input name="shippingCost" placeholder={`Freight cost (${o.currency}, internal)`} className="input" />
                  <input name="insuredValue" placeholder="Insured value" className="input" /><input name="insuranceNote" placeholder="Insurance policy / note" className="input" />
                  <input name="specialHandling" placeholder="Special handling (e.g. DG lithium)" className="input sm:col-span-2" />
                  <input name="estimatedDelivery" placeholder="Estimated delivery" className="input" />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="estimateConfirmed" className="accent-deep" /> Estimate confirmed</label>
                </div>
              </ActionForm></details>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="wide mb-3 text-lg">History</h2><Timeline b={b} /></section>
        <section className="space-y-4">
          {can("orders.manage") && (
            <ActionForm action={`/api/admin/orders/${o.id}/note`} className="panel panel-pad space-y-2" submitLabel="Add note" resetOnSuccess>
              <label className="field-label" htmlFor="message">Note</label><textarea id="message" name="message" rows={2} required className="input" />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="visibleToBuyer" className="accent-deep" /> Visible to buyer</label>
            </ActionForm>
          )}
          {can("orders.manage") && ["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(o.status) && (
            <ActionForm action={`/api/admin/orders/${o.id}/cancel`} className="panel panel-pad space-y-2" submitLabel="Cancel order" submitClass="btn-danger" confirm="Cancel this order?">
              <label className="field-label" htmlFor="creason">Cancellation reason</label><input id="creason" name="reason" className="input" />
            </ActionForm>
          )}
        </section>
      </div>
    </div>
  );
}
