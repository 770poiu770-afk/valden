import Link from "next/link";
import { desc, eq, ilike, or, and, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { companies } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { PageHeader, StatusPill, fmtDate, Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Business accounts" };
const STATUSES = ["PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "SUSPENDED", "REJECTED"] as const;
export default async function Companies({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff("companies.review");
  const sp = await searchParams;
  const w: SQL[] = [];
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) w.push(eq(companies.status, sp.status as (typeof STATUSES)[number]));
  if (sp.q) w.push(or(ilike(companies.legalName, `%${sp.q}%`), ilike(companies.registrationNumber, `%${sp.q}%`), ilike(companies.businessEmail, `%${sp.q}%`))!);
  const rows = await db.select().from(companies).where(w.length ? and(...w) : undefined).orderBy(desc(companies.createdAt)).limit(300);
  return (
    <div>
      <PageHeader title="Business accounts" intro="Review registrations, verify documents and manage account status." />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Name, registration no., email" className="input w-72" />
        <select name="status" defaultValue={sp.status ?? ""} className="input w-56"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}</select>
        <button className="btn-deep">Filter</button>
      </form>
      {rows.length === 0 ? <Empty title="No accounts match" /> : (
        <div className="panel overflow-x-auto"><table className="tbl min-w-[800px]">
          <thead><tr><th>Company</th><th>Country</th><th>Type</th><th>Registration</th><th>Status</th><th>Registered</th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id}><td><Link className="link" href={`/admin/companies/${c.id}`}>{c.legalName}</Link><p className="text-xs text-steel-500">{c.businessEmail}</p></td><td>{c.countryCode}</td><td>{c.businessType}</td><td className="num">{c.registrationNumber}</td><td><StatusPill status={c.status} /></td><td>{fmtDate(c.createdAt)}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}
