import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, shipments } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { PageHeader, StatusPill, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Shipments" };
export default async function Ships() {
  await requireStaff("shipping.manage");
  const [rows, toShip] = await Promise.all([
    db.select({ s: shipments, number: orders.number }).from(shipments).innerJoin(orders, eq(orders.id, shipments.orderId)).orderBy(desc(shipments.createdAt)).limit(200),
    db.select().from(orders).where(inArray(orders.status, ["PAID", "PROCESSING", "PARTIALLY_SHIPPED"])).orderBy(orders.placedAt),
  ]);
  return (
    <div className="space-y-8">
      <PageHeader title="Shipments" intro="Manual fulfillment workflow. No carrier integration is configured: enter carrier, tracking and estimates as issued by your logistics provider." />
      <section><h2 className="wide mb-3 text-lg">Paid orders to fulfil ({toShip.length})</h2>
        <div className="panel overflow-x-auto"><table className="tbl"><thead><tr><th>Order</th><th>Status</th><th>Placed</th></tr></thead><tbody>{toShip.map((o) => <tr key={o.id}><td><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link></td><td><StatusPill status={o.status} /></td><td>{fmtDate(o.placedAt)}</td></tr>)}</tbody></table></div></section>
      <section><h2 className="wide mb-3 text-lg">All shipments</h2>
        <div className="panel overflow-x-auto"><table className="tbl min-w-[800px]"><thead><tr><th>Reference</th><th>Order</th><th>Status</th><th>Carrier</th><th>Tracking</th><th>Estimate</th><th>Created</th></tr></thead>
          <tbody>{rows.map(({ s, number }) => <tr key={s.id}><td className="num">{s.reference}</td><td><Link className="link" href={`/admin/orders/${s.orderId}`}>{number}</Link></td><td><StatusPill status={s.status} /></td><td>{s.carrier ?? "—"}</td><td className="num text-xs">{s.trackingNumber ?? "—"}</td><td className="text-xs">{s.estimatedDelivery ? `${s.estimatedDelivery}${s.estimateConfirmed ? "" : " (prov.)"}` : "—"}</td><td className="text-xs">{fmtDate(s.createdAt)}</td></tr>)}</tbody></table></div></section>
    </div>
  );
}
