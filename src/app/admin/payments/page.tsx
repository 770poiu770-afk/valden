import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, paymentEvents, payments } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Payments" };
export default async function Payments() {
  await requireStaff("payments.view");
  const [rows, events] = await Promise.all([
    db.select({ p: payments, number: orders.number }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).orderBy(desc(payments.createdAt)).limit(200),
    db.select().from(paymentEvents).orderBy(desc(paymentEvents.createdAt)).limit(100),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Payments" intro="Every payment attempt with its provider identifiers, for reconciliation against PayPal and bank statements." />
      <div className="panel overflow-x-auto"><table className="tbl min-w-[1000px]"><thead><tr><th>Created</th><th>Order</th><th>Provider</th><th>Status</th><th className="text-right">Amount</th><th>PayPal order</th><th>Capture / reference</th><th>Notes</th></tr></thead>
        <tbody>{rows.map(({ p, number }) => <tr key={p.id}><td className="text-xs">{fmtDate(p.createdAt, true)}</td><td><Link className="link" href={`/admin/orders/${p.orderId}`}>{number}</Link></td><td>{p.provider}</td><td><StatusPill status={p.status} /></td><td className="text-right"><Money cents={p.amountCents} currency={p.currency} /></td><td className="num text-xs">{p.providerOrderId ?? "—"}</td><td className="num text-xs">{p.providerCaptureId ?? p.manualReference ?? "—"}</td><td className="text-xs text-bad">{p.failureReason}</td></tr>)}</tbody></table></div>
      <section>
        <h2 className="wide mb-3 text-lg">Webhook events</h2>
        <p className="mb-3 text-sm text-steel-500">Only signature-verified events are stored. Duplicates are ignored by event ID.</p>
        <div className="panel overflow-x-auto"><table className="tbl min-w-[800px]"><thead><tr><th>Received</th><th>Event</th><th>Event ID</th><th>Resource</th><th>Result</th></tr></thead>
          <tbody>{events.length === 0 ? <tr><td colSpan={5} className="py-6 text-center text-steel-500">No webhook events received yet.</td></tr> : events.map((e) => <tr key={e.id}><td className="text-xs">{fmtDate(e.createdAt, true)}</td><td>{e.eventType}</td><td className="num text-xs">{e.providerEventId}</td><td className="num text-xs">{e.resourceId}</td><td className="text-xs">{e.result}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
