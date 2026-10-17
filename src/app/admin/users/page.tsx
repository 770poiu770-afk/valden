import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, roles, users } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };
export default async function Users() {
  const a = await requireStaff("users.manage");
  const [rows, rs] = await Promise.all([
    db.select({ u: users, role: roles, co: companies.legalName }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).leftJoin(companies, eq(companies.id, users.companyId)).orderBy(asc(roles.isStaff), asc(users.email)),
    db.select().from(roles).orderBy(asc(roles.id)),
  ]);
  const staffRoles = rs.filter((r) => r.isStaff), buyerRoles = rs.filter((r) => !r.isStaff);
  return (
    <div className="space-y-6">
      <PageHeader title="Users" intro="New users receive a single-use link to set their own password; passwords are never shown to administrators." />
      <ActionForm action="/api/admin/users" className="panel panel-pad grid gap-3 md:grid-cols-[1fr_1fr_14rem_auto]" resetOnSuccess>
        <input name="fullName" placeholder="Full name" required className="input" /><input name="email" type="email" placeholder="Work email" required className="input" />
        <select name="role" className="input">{staffRoles.filter((r) => r.key !== "SUPER_ADMIN" || a.roleKey === "SUPER_ADMIN").map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select>
        <button className="btn-deep">Add staff user</button>
      </ActionForm>
      <div className="panel overflow-x-auto"><table className="tbl min-w-[960px]"><thead><tr><th>User</th><th>Company</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
        <tbody>{rows.map(({ u, role, co }) => (
          <tr key={u.id}><td>{u.fullName}<p className="text-xs text-steel-500">{u.email}</p></td><td className="text-xs">{co ?? "Staff"}</td><td className="text-xs">{role.name}</td><td className="text-xs">{u.isActive ? "Active" : "Deactivated"}{u.lockedUntil && u.lockedUntil > new Date() ? " (locked)" : ""}</td><td className="text-xs">{u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : "Never"}</td>
            <td>{u.id !== a.userId && (
              <ActionForm action={`/api/admin/users/${u.id}`} className="flex gap-2">
                <select name="role" defaultValue={role.key} className="input py-1 text-xs" aria-label="Role">{(role.isStaff ? staffRoles : buyerRoles).map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}</select>
                <select name="isActive" defaultValue={String(u.isActive)} className="input py-1 text-xs" aria-label="Active"><option value="true">Active</option><option value="false">Deactivated</option></select>
                <button className="btn-outline btn-sm">Save</button>
              </ActionForm>)}</td></tr>
        ))}</tbody></table></div>
    </div>
  );
}
