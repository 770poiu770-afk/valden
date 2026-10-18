import Link from "next/link";
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies, orders } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { Money, PageHeader, StatusPill, fmtDate, Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };
const ST = ["PENDING_REVIEW", "AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"];
export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff("orders.manage");
  const sp = await searchParams;
  const w: SQL[] = [];
  if (sp.status && ST.includes(sp.status)) w.push(eq(orders.status, sp.status as "PAID"));
  if (sp.q) w.push(ilike(orders.number, `%${sp.q}%`));
  const rows = await db.select({ o: orders, co: companies.legalName }).from(orders).innerJoin(companies, eq(companies.id, orders.companyId)).where(w.length ? and(...w) : undefined).orderBy(desc(orders.placedAt)).limit(300);
  return (
    <div>
      <PageHeader title="Orders" />
      <form className="mb-4 flex flex-wrap gap-2"><input name="q" defaultValue={sp.q} placeholder="Order number" aria-label="Order number" className="input w-56" /><select name="status" aria-label="Order status" defaultValue={sp.status ?? ""} className="input w-56"><option value="">All statuses</option>{ST.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</select><button className="btn-deep">Filter</button></form>
      {rows.length === 0 ? <Empty title="No orders match" /> : (
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl min-w-[960px]"><thead><tr><th>Order</th><th>Company</th><th>Placed</th><th>Status</th><th>Payment</th><th>Risk</th><th>Method</th><th className="text-right">Total</th></tr></thead>
          <tbody>{rows.map(({ o, co }) => <tr key={o.id}><td><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link></td><td>{co}</td><td>{fmtDate(o.placedAt)}</td><td><StatusPill status={o.status} /></td><td><StatusPill status={o.paymentStatus} /></td><td>{o.riskStatus === "NOT_REQUIRED" ? "—" : <StatusPill status={o.riskStatus} label={`Risk: ${o.riskStatus.replace("_", " ").toLowerCase()}`} />}</td><td className="text-xs">{o.paymentMethod === "PAYPAL" ? "PayPal" : "Transfer"}</td><td className="text-right font-medium"><Money cents={o.totalCents} currency={o.currency} /></td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
