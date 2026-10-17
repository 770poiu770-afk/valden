import { asc } from "drizzle-orm";
import { db } from "@/db";
import { permissions, rolePermissions, roles } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { Notice, PageHeader } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Roles & permissions" };
export default async function Roles() {
  const a = await requireStaff("users.manage");
  const [rs, ps, rp] = await Promise.all([db.select().from(roles).orderBy(asc(roles.id)), db.select().from(permissions).orderBy(asc(permissions.key)), db.select().from(rolePermissions)]);
  const has = (r: number, p: number) => rp.some((x) => x.roleId === r && x.permissionId === p);
  const editable = a.roleKey === "SUPER_ADMIN";
  return (
    <div className="space-y-6">
      <PageHeader title="Roles & permissions" intro="Permissions are enforced on the server for every page and API call. Buyer permissions apply only while the buyer's company is approved." />
      {!editable && <Notice tone="info">Only super administrators can change the permission matrix.</Notice>}
      <div className="grid gap-4 xl:grid-cols-2">
        {rs.map((r) => (
          <ActionForm key={r.id} action={`/api/admin/roles/${r.id}/permissions`} className="panel panel-pad" submitLabel={editable ? "Save permissions" : undefined} submitClass="btn-outline btn-sm" confirm={`Change permissions for ${r.name}?`}>
            <h2 className="font-semibold">{r.name} <span className="text-xs font-normal text-steel-500">{r.isStaff ? "staff" : "buyer"}</span></h2>
            <p className="mb-3 text-sm text-steel-500">{r.description}</p>
            <div className="grid gap-1 sm:grid-cols-2">{ps.map((p) => <label key={p.id} className="flex items-start gap-2 text-xs" title={p.description}><input type="checkbox" name="perm+" value={p.key} defaultChecked={has(r.id, p.id)} disabled={!editable} className="mt-0.5 accent-deep" /><span><span className="font-medium">{p.key}</span><br /><span className="text-steel-500">{p.description}</span></span></label>)}</div>
          </ActionForm>
        ))}
      </div>
    </div>
  );
}
