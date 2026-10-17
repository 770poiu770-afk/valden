import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses, businessDocuments, companies, companyStatusEvents, contractPrices, orders, products, roles, users } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { DL, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Business account" };

const ACTIONS: Record<string, { to: string; label: string; cls: string; reason: boolean }[]> = {
  PENDING_REVIEW: [{ to: "APPROVED", label: "Approve", cls: "btn-deep", reason: false }, { to: "MORE_INFO_REQUIRED", label: "Request more information", cls: "btn-outline", reason: true }, { to: "REJECTED", label: "Reject", cls: "btn-danger", reason: true }],
  MORE_INFO_REQUIRED: [{ to: "APPROVED", label: "Approve", cls: "btn-deep", reason: false }, { to: "PENDING_REVIEW", label: "Return to review", cls: "btn-outline", reason: true }, { to: "REJECTED", label: "Reject", cls: "btn-danger", reason: true }],
  APPROVED: [{ to: "SUSPENDED", label: "Suspend", cls: "btn-danger", reason: true }],
  SUSPENDED: [{ to: "APPROVED", label: "Reinstate", cls: "btn-deep", reason: false }, { to: "REJECTED", label: "Close (reject)", cls: "btn-danger", reason: true }],
  REJECTED: [{ to: "PENDING_REVIEW", label: "Reopen review", cls: "btn-outline", reason: true }],
};

export default async function CompanyAdmin({ params }: { params: Promise<{ id: string }> }) {
  const a = await requireStaff("companies.review");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const co = (await db.select().from(companies).where(eq(companies.id, id)))[0];
  if (!co) notFound();
  const [addrs, docs, events, people, cps, ords] = await Promise.all([
    db.select().from(addresses).where(eq(addresses.companyId, id)),
    db.select().from(businessDocuments).where(eq(businessDocuments.companyId, id)).orderBy(desc(businessDocuments.createdAt)),
    db.select().from(companyStatusEvents).where(eq(companyStatusEvents.companyId, id)).orderBy(desc(companyStatusEvents.createdAt)),
    db.select({ u: users, role: roles.key }).from(users).innerJoin(roles, eq(roles.id, users.roleId)).where(eq(users.companyId, id)),
    db.select({ c: contractPrices, name: products.name, slug: products.slug, list: products.wholesaleCents }).from(contractPrices).innerJoin(products, eq(products.id, contractPrices.productId)).where(eq(contractPrices.companyId, id)),
    db.select().from(orders).where(eq(orders.companyId, id)).orderBy(desc(orders.placedAt)).limit(20),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title={co.legalName} back={{ href: "/admin/companies", label: "Business accounts" }} intro={<span className="flex items-center gap-2"><StatusPill status={co.status} /> registered {fmtDate(co.createdAt, true)}</span>} />
      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">Account decision</h2>
        <div className="flex flex-wrap gap-4">
          {(ACTIONS[co.status] ?? []).map((x) => x.reason ? (
            <ActionForm key={x.to} action={`/api/admin/companies/${id}/status`} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="to" value={x.to} />
              <input name="reason" placeholder="Reason (sent to the buyer)" required minLength={5} className="input w-72" />
              <button className={x.cls}>{x.label}</button>
            </ActionForm>
          ) : <ActionButton key={x.to} action={`/api/admin/companies/${id}/status`} body={{ to: x.to, reason: "" }} label={x.label} className={x.cls} confirm={`${x.label} ${co.legalName}?`} />)}
        </div>
        <p className="mt-3 text-xs text-steel-500">Check the registration number against the official company registry for {co.countryCode} and review documents before approving. Decisions are logged and emailed to the account contacts.</p>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Company details</h2>
          <DL rows={[["Legal name", co.legalName], ["Trading name", co.tradingName], ["Country", co.countryCode], ["Registration no.", co.registrationNumber], ["Tax ID", co.taxId], ["Type", co.businessType], ["Website", co.website], ["Email", co.businessEmail], ["Phone", co.businessPhone], ["Expected volume", co.expectedMonthlyVolume], ["Approved", co.approvedAt ? fmtDate(co.approvedAt, true) : null]]} />
          <ActionForm action={`/api/admin/companies/${id}/profile`} className="mt-4 space-y-3 border-t border-line pt-4" submitLabel="Save notes" submitClass="btn-outline btn-sm">
            <label className="field-label" htmlFor="internalNotes">Internal notes (staff only)</label>
            <textarea id="internalNotes" name="internalNotes" rows={3} defaultValue={co.internalNotes ?? ""} className="input" />
            <label className="field-label" htmlFor="preferredCurrency">Preferred currency</label>
            <select id="preferredCurrency" name="preferredCurrency" defaultValue={co.preferredCurrency} className="input w-40"><option>USD</option><option>EUR</option><option>ILS</option></select>
          </ActionForm>
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Verification documents</h2>
          <ul className="space-y-3 text-sm">{docs.map((d) => (
            <li key={d.id} className="rounded border border-line p-3">
              <div className="flex items-center justify-between gap-2"><a className="link" href={`/api/documents/${d.id}`}>{d.docType}</a><StatusPill status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "ACCEPTED" ? "Accepted" : undefined} /></div>
              <p className="text-xs text-steel-500">{d.originalName} · {(d.sizeBytes / 1024).toFixed(0)} KB · sha256 {d.sha256.slice(0, 12)}… · {fmtDate(d.createdAt)}</p>
              <ActionForm action={`/api/admin/documents/${d.id}/review`} className="mt-2 flex flex-wrap gap-2">
                <select name="status" defaultValue={d.status} className="input w-36 py-1"><option value="PENDING">Pending</option><option value="ACCEPTED">Accept</option><option value="REJECTED">Reject</option></select>
                <input name="reviewNote" defaultValue={d.reviewNote ?? ""} placeholder="Note" className="input w-48 py-1" />
                <button className="btn-outline btn-sm">Save</button>
              </ActionForm>
            </li>))}</ul>
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Users</h2>
          <ul className="space-y-2 text-sm">{people.map(({ u, role }) => <li key={u.id} className="flex justify-between gap-2"><span>{u.fullName} <span className="text-steel-500">— {u.email}</span></span><span className="text-xs text-steel-500">{role}{!u.isActive && " (inactive)"} · last login {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "never"}</span></li>)}</ul>
          {a.permissions.has("customers.manage") && (
            <details className="mt-3"><summary className="btn-outline btn-sm cursor-pointer">Add buyer user</summary>
              <ActionForm action={`/api/admin/companies/${id}/users`} className="mt-3 grid gap-2 sm:grid-cols-2" submitLabel="Create and email setup link" resetOnSuccess>
                <input name="fullName" placeholder="Full name" required className="input" /><input name="email" type="email" placeholder="Email" required className="input" />
                <input name="jobTitle" placeholder="Job title" className="input" /><select name="role" className="input"><option value="BUYER">Buyer</option><option value="BUYER_ADMIN">Buyer administrator</option></select>
              </ActionForm></details>
          )}
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Addresses</h2>
          <ul className="space-y-2 text-sm">{addrs.map((x) => <li key={x.id}><span className="font-medium">{x.label}</span> <span className="text-xs text-steel-500">({x.kind.toLowerCase()})</span><br /><span className="text-steel-500">{[x.contactName, x.line1, x.line2, x.city, x.postalCode, x.countryCode].filter(Boolean).join(", ")}</span></li>)}</ul>
        </section>
      </div>
      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">Contract prices (USD)</h2>
        {cps.length > 0 && <table className="tbl mb-4"><thead><tr><th>Product</th><th className="text-right">List</th><th className="text-right">Contract</th><th>Valid to</th><th /></tr></thead><tbody>{cps.map(({ c, name, slug, list }) => <tr key={c.id}><td><Link className="link" href={`/products/${slug}`}>{name}</Link>{c.note && <p className="text-xs text-steel-500">{c.note}</p>}</td><td className="text-right"><Money cents={list} currency="USD" /></td><td className="text-right font-semibold"><Money cents={c.unitCents} currency="USD" /></td><td>{c.validTo ? fmtDate(c.validTo) : "Open"}</td><td>{a.permissions.has("pricing.manage") && <ActionButton action={`/api/admin/contract-prices/${c.id}/delete`} label="Remove" className="text-xs text-bad hover:underline" confirm="Remove this contract price?" />}</td></tr>)}</tbody></table>}
        {a.permissions.has("pricing.manage") ? (
          <ActionForm action={`/api/admin/companies/${id}/contract-prices`} className="grid gap-2 sm:grid-cols-[1fr_9rem_10rem_1fr_auto]" resetOnSuccess>
            <input name="slug" placeholder="Product slug (from product URL)" required className="input" /><input name="unitPrice" placeholder="Unit price USD" required className="input" />
            <input name="validTo" type="date" aria-label="Valid to" className="input" /><input name="note" placeholder="Note" className="input" /><button className="btn-deep">Set price</button>
          </ActionForm>
        ) : <p className="text-sm text-steel-500">Requires pricing permission.</p>}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad"><h2 className="mb-3 font-semibold">Orders</h2>{ords.length ? <ul className="space-y-1 text-sm">{ords.map((o) => <li key={o.id} className="flex justify-between"><Link className="link" href={`/admin/orders/${o.id}`}>{o.number}</Link><span className="flex gap-2"><StatusPill status={o.status} /><Money cents={o.totalCents} currency={o.currency} /></span></li>)}</ul> : <p className="text-sm text-steel-500">No orders.</p>}</section>
        <section className="panel panel-pad"><h2 className="mb-3 font-semibold">Status history</h2><ul className="space-y-2 text-sm">{events.map((e) => <li key={e.id} className="flex justify-between gap-2"><span><StatusPill status={e.toStatus} /> {e.reason && <span className="text-steel-500">{e.reason}</span>}</span><span className="text-xs text-steel-500">{fmtDate(e.createdAt, true)}</span></li>)}</ul></section>
      </div>
    </div>
  );
}
