import { desc } from "drizzle-orm";
import { db } from "@/db";
import { inquiries } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader, StatusPill, fmtDate, Empty } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Enquiries" };
export default async function Inq() {
  await requireStaff("customers.manage");
  const rows = await db.select().from(inquiries).orderBy(desc(inquiries.createdAt)).limit(200);
  return (
    <div>
      <PageHeader title="Enquiries" intro="Contact-form and public quote requests." />
      {rows.length === 0 ? <Empty title="No enquiries yet" /> : <div className="space-y-3">{rows.map((r) => (
        <div key={r.id} className="panel panel-pad text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><p><span className="font-semibold text-deep-900">{r.topic}</span> — {r.name}, {r.companyName} · <a className="link" href={`mailto:${r.email}`}>{r.email}</a>{r.phone && ` · ${r.phone}`}</p><span className="flex items-center gap-2 text-xs text-steel-500">{fmtDate(r.createdAt, true)} <StatusPill status={r.status === "NEW" ? "PENDING" : r.status === "CLOSED" ? "COMPLETED" : "PROCESSING"} label={r.status.replace("_", " ").toLowerCase()} /></span></div>
          <p className="mt-2 whitespace-pre-line">{r.message}</p>
          <ActionForm action={`/api/admin/inquiries/${r.id}`} className="mt-3 flex gap-2"><select name="status" defaultValue={r.status} className="input w-40 py-1" aria-label="Status"><option value="NEW">New</option><option value="IN_PROGRESS">In progress</option><option value="CLOSED">Closed</option></select><button className="btn-outline btn-sm">Update</button></ActionForm>
        </div>))}</div>}
    </div>
  );
}
