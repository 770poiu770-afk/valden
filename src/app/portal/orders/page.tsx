import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { listCompanyOrders } from "@/server/orders";
import { Empty, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function Orders() {
  const actor = await requireApprovedBuyer();
  const list = await listCompanyOrders(actor);
  return (
    <div>
      <PageHeader title="Orders" intro="All orders placed by your company." />
      {list.length === 0 ? <Empty title="No orders yet" action={<Link href="/catalog" className="btn-deep">Browse catalog</Link>} /> : (
        <div className="panel overflow-x-auto">
          <table className="tbl min-w-[720px]">
            <thead><tr><th>Order</th><th>PO</th><th>Placed</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
            <tbody>{list.map((o) => (
              <tr key={o.id}>
                <td><Link className="link" href={`/portal/orders/${o.id}`}>{o.number}</Link></td><td>{o.poNumber ?? "—"}</td><td>{fmtDate(o.placedAt)}</td>
                <td><StatusPill status={o.status} /></td><td><StatusPill status={o.paymentStatus} /></td>
                <td className="text-right font-medium"><Money cents={o.totalCents} currency={o.currency} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
