import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, businessDocuments, companies, companyStatusEvents, users } from "@/db/schema";
import { currentActor } from "@/server/http";
import { DOC_TYPES } from "@/server/uploads";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { DL, PageHeader, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Company & addresses" };

export default async function CompanyPage() {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const [co, addrs, docs, events, people] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, actor.companyId)).then((r) => r[0]),
    db.select().from(addresses).where(eq(addresses.companyId, actor.companyId)),
    db.select().from(businessDocuments).where(eq(businessDocuments.companyId, actor.companyId)).orderBy(desc(businessDocuments.createdAt)),
    db.select().from(companyStatusEvents).where(eq(companyStatusEvents.companyId, actor.companyId)).orderBy(desc(companyStatusEvents.createdAt)),
    db.select({ fullName: users.fullName, email: users.email, jobTitle: users.jobTitle }).from(users).where(eq(users.companyId, actor.companyId)),
  ]);
  const canManage = actor.permissions.has("company.manage");
  return (
    <div className="space-y-6">
      <PageHeader title="Company & addresses" intro="Changes to your registered company details are made by our trade desk to keep verification records accurate. Contact us to update them." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Company</h2><StatusPill status={co.status} /></div>
          <DL rows={[["Legal name", co.legalName], ["Trading name", co.tradingName], ["Country", co.countryCode], ["Registration no.", co.registrationNumber], ["Tax ID", co.taxId], ["Business type", co.businessType], ["Email", co.businessEmail], ["Phone", co.businessPhone], ["Preferred currency", co.preferredCurrency]]} />
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Users</h2>
          <ul className="space-y-2 text-sm">{people.map((p) => <li key={p.email}><span className="font-medium">{p.fullName}</span> <span className="text-steel-500">— {p.jobTitle}, {p.email}</span></li>)}</ul>
          <p className="mt-3 text-xs text-steel-500">To add purchasing colleagues, contact the trade desk.</p>
        </section>
      </div>

      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">Addresses</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {addrs.map((a) => (
            <div key={a.id} className="rounded border border-line p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><p className="font-medium text-deep-900">{a.label} <span className="text-xs text-steel-500">({a.kind === "BILLING" ? "billing" : "delivery"}{a.isDefault ? ", default" : ""})</span></p>
                {canManage && <ActionButton action={`/api/company/addresses/${a.id}`} method="DELETE" label="Remove" className="text-xs text-bad hover:underline" confirm="Remove this address?" />}</div>
              <p>{a.contactName}{a.phone ? `, ${a.phone}` : ""}</p>
              <p className="text-steel-500">{[a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode].filter(Boolean).join(", ")}</p>
            </div>
          ))}
        </div>
        {canManage && (
          <details className="mt-4">
            <summary className="btn-outline btn-sm cursor-pointer">Add an address</summary>
            <ActionForm action="/api/company/addresses" className="mt-4 grid gap-4 sm:grid-cols-2" submitLabel="Save address" resetOnSuccess>
              <div><label className="field-label" htmlFor="kind">Type</label><select id="kind" name="kind" className="input"><option value="SHIPPING">Delivery</option><option value="BILLING">Billing</option></select></div>
              <div><label className="field-label" htmlFor="label">Label</label><input id="label" name="label" placeholder="e.g. Haifa warehouse" required className="input" /></div>
              <div><label className="field-label" htmlFor="contactName">Contact name</label><input id="contactName" name="contactName" required className="input" /></div>
              <div><label className="field-label" htmlFor="phone">Phone</label><input id="phone" name="phone" className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line1">Address line 1</label><input id="line1" name="line1" required className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line2">Address line 2</label><input id="line2" name="line2" className="input" /></div>
              <div><label className="field-label" htmlFor="city">City</label><input id="city" name="city" required className="input" /></div>
              <div><label className="field-label" htmlFor="region">Region</label><input id="region" name="region" className="input" /></div>
              <div><label className="field-label" htmlFor="postalCode">Postal code</label><input id="postalCode" name="postalCode" className="input" /></div>
              <div><label className="field-label" htmlFor="countryCode">Country (ISO)</label><input id="countryCode" name="countryCode" maxLength={2} required className="input uppercase" /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" className="accent-deep" /> Make this the default</label>
            </ActionForm>
          </details>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Verification documents</h2>
          <ul className="space-y-2 text-sm">{docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3"><span><a className="link" href={`/api/documents/${d.id}`}>{d.docType}</a><span className="block text-xs text-steel-500">{d.originalName} · {fmtDate(d.createdAt)}{d.reviewNote ? ` · ${d.reviewNote}` : ""}</span></span><StatusPill status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "PENDING" ? "Awaiting review" : d.status === "ACCEPTED" ? "Accepted" : undefined} /></li>
          ))}</ul>
          {canManage && (
            <ActionForm action="/api/company/documents" encoding="multipart" className="mt-4 space-y-3 border-t border-line pt-4" submitLabel="Upload document" resetOnSuccess>
              <select name="docType" aria-label="Document type" className="input">{DOC_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
              <input name="document" type="file" accept="application/pdf,image/png,image/jpeg" aria-label="Document file" required className="input" />
            </ActionForm>
          )}
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">Verification history</h2>
          <ul className="space-y-3 text-sm">{events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3"><div><StatusPill status={e.toStatus} />{e.reason && <p className="mt-1 text-steel-500">{e.reason}</p>}</div><span className="shrink-0 text-xs text-steel-500">{fmtDate(e.createdAt, true)}</span></li>
          ))}</ul>
        </section>
      </div>
    </div>
  );
}
