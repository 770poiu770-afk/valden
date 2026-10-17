import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { PageHeader, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Audit log" };
export default async function Audit({ searchParams }: { searchParams: Promise<{ action?: string; actor?: string; entity?: string }> }) {
  await requireStaff("audit.view");
  const sp = await searchParams;
  const w: SQL[] = [];
  if (sp.action) w.push(ilike(auditLogs.action, `%${sp.action}%`));
  if (sp.actor) w.push(ilike(auditLogs.actorEmail, `%${sp.actor}%`));
  if (sp.entity) w.push(eq(auditLogs.entityId, sp.entity));
  const rows = await db.select().from(auditLogs).where(w.length ? and(...w) : undefined).orderBy(desc(auditLogs.createdAt)).limit(300);
  return (
    <div>
      <PageHeader title="Audit log" intro="Append-only record of sensitive actions: approvals, pricing, payments, refunds, role changes and sign-ins." />
      <form className="mb-4 flex flex-wrap gap-2"><input name="action" defaultValue={sp.action} placeholder="Action contains" className="input w-48" /><input name="actor" defaultValue={sp.actor} placeholder="Actor email" className="input w-56" /><input name="entity" defaultValue={sp.entity} placeholder="Entity ID" className="input w-72" /><button className="btn-deep">Filter</button></form>
      <div className="panel overflow-x-auto"><table className="tbl min-w-[1000px]"><thead><tr><th>Time</th><th>Action</th><th>Actor</th><th>Entity</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs">{fmtDate(r.createdAt, true)}</td><td className="font-medium">{r.action}</td><td className="text-xs">{r.actorEmail ?? "system"}</td><td className="num text-xs">{r.entityType}<br />{r.entityId}</td><td className="max-w-md truncate text-xs text-steel-500" title={JSON.stringify(r.details)}>{JSON.stringify(r.details)}</td><td className="text-xs">{r.ip}</td></tr>)}</tbody></table></div>
    </div>
  );
}
