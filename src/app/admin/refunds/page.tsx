import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, refunds, users } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Refunds" };
export default async function Refunds() {
  await requireStaff("payments.view");
  const rows = await db.select({ r: refunds, number: orders.number, by: users.email }).from(refunds).innerJoin(orders, eq(orders.id, refunds.orderId)).leftJoin(users, eq(users.id, refunds.requestedById)).orderBy(desc(refunds.createdAt)).limit(200);
  return (
    <div>
      <PageHeader title="Refunds" intro="Refunds are issued from the order page. This register lists all refunds, including those issued directly in PayPal and reported by webhook." />
      <div className="panel overflow-x-auto"><table className="tbl min-w-[900px]"><thead><tr><th>Date</th><th>Order</th><th>Status</th><th className="text-right">Amount</th><th>Provider ref.</th><th>Reason</th><th>By</th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-steel-500">No refunds recorded.</td></tr> : rows.map(({ r, number, by }) => <tr key={r.id}><td className="text-xs">{fmtDate(r.createdAt, true)}</td><td><Link className="link" href={`/admin/orders/${r.orderId}`}>{number}</Link></td><td><StatusPill status={r.status} /></td><td className="text-right"><Money cents={r.amountCents} currency={r.currency} /></td><td className="num text-xs">{r.providerRefundId ?? "—"}</td><td className="text-xs">{r.reason}</td><td className="text-xs">{by ?? "PayPal webhook"}</td></tr>)}</tbody></table></div>
    </div>
  );
}
