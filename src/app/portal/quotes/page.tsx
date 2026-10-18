import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { listQuotes } from "@/server/quotes";
import { Empty, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes & offers" };
export default async function Quotes() {
  const actor = await requireApprovedBuyer();
  const list = await listQuotes(actor);
  return (
    <div>
      <PageHeader title="Quotes & offers" intro="Request negotiated pricing for volume purchases. Accepted offers become orders at the agreed prices." actions={<Link href="/portal/quotes/new" className="btn-deep">New quote request</Link>} />
      {list.length === 0 ? <Empty title="No quote requests yet" action={<Link href="/portal/quotes/new" className="btn-deep">New quote request</Link>}>Use quotations for large or recurring volumes, or for items not orderable online.</Empty> : (
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl min-w-[640px]">
          <thead><tr><th>Quote</th><th>Requested</th><th>Status</th><th>Offer expires</th><th className="text-right">Offer total (USD)</th></tr></thead>
          <tbody>{list.map((q) => (
            <tr key={q.id}><td><Link className="link" href={`/portal/quotes/${q.id}`}>{q.number}</Link></td><td>{fmtDate(q.createdAt)}</td><td><StatusPill status={q.status} /></td><td>{q.status === "OFFERED" ? fmtDate(q.offerExpiresAt, true) : "—"}</td><td className="text-right">{q.offerTotalBaseCents !== null ? <Money cents={q.offerTotalBaseCents} currency="USD" /> : "—"}</td></tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
