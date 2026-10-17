import Link from "next/link";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { listQuotes } from "@/server/quotes";
import { Money, PageHeader, StatusPill, fmtDate, Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Quotes" };
export default async function AdminQuotes({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const a = await requireStaff("quotes.manage");
  const st = (await searchParams).status;
  const all = await listQuotes(a);
  const list = st ? all.filter((q) => q.status === st) : all;
  const cos = new Map((await db.select({ id: companies.id, n: companies.legalName }).from(companies)).map((c) => [c.id, c.n]));
  return (
    <div>
      <PageHeader title="Quotes" intro="Respond to quotation requests with formal, time-limited offers." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">{["", "SUBMITTED", "UNDER_REVIEW", "OFFERED", "CONVERTED", "DECLINED", "EXPIRED"].map((s) => <Link key={s} href={s ? `?status=${s}` : "?"} className={`rounded px-3 py-1.5 ${st === s || (!st && !s) ? "bg-deep text-white" : "bg-white border border-line"}`}>{s ? s.replace("_", " ").toLowerCase() : "all"}</Link>)}</div>
      {list.length === 0 ? <Empty title="No quotes" /> : (
        <div className="panel overflow-x-auto"><table className="tbl min-w-[800px]"><thead><tr><th>Quote</th><th>Company</th><th>Received</th><th>Status</th><th className="text-right">List value (USD)</th><th className="text-right">Offer (USD)</th><th>Expires</th></tr></thead>
          <tbody>{list.map((q) => <tr key={q.id}><td><Link className="link" href={`/admin/quotes/${q.id}`}>{q.number}</Link></td><td>{cos.get(q.companyId)}</td><td>{fmtDate(q.createdAt)}</td><td><StatusPill status={q.status} /></td><td className="text-right"><Money cents={q.listTotalBaseCents} currency="USD" /></td><td className="text-right">{q.offerTotalBaseCents !== null ? <Money cents={q.offerTotalBaseCents} currency="USD" /> : "—"}</td><td>{q.offerExpiresAt ? fmtDate(q.offerExpiresAt) : "—"}</td></tr>)}</tbody></table></div>
      )}
    </div>
  );
}
