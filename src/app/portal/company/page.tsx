import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, businessDocuments, companies, companyStatusEvents, users } from "@/db/schema";
import { currentActor } from "@/server/http";
import { DOC_TYPES } from "@/server/uploads";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { DL, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";
import { DOC_HE } from "@/lib/labels";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Company & addresses", "חברה וכתובות") }; }

export default async function CompanyPage() {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const { l, t } = await getT();
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
      <PageHeader title={t("Company & addresses", "חברה וכתובות")} intro={t("Changes to your registered company details are made by our trade desk to keep verification records accurate. Contact us to update them.", "שינויים בפרטי החברה הרשומים מבוצעים על ידי צוות המכירות כדי לשמור על רשומות אימות מדויקות. פנו אלינו לעדכון.")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{t("Company", "החברה")}</h2><StatusPill status={co.status} l={l} /></div>
          <DL rows={[[t("Legal name", "שם משפטי"), co.legalName], [t("Trading name", "שם מסחרי"), co.tradingName], [t("Country", "ארץ"), co.countryCode], [t("Registration no.", "מספר רישום"), co.registrationNumber], [t("Tax ID", "מספר עוסק"), co.taxId], [t("Business type", "סוג העסק"), co.businessType], [t("Email", "מייל"), co.businessEmail], [t("Phone", "טלפון"), co.businessPhone], [t("Preferred currency", "מטבע מועדף"), co.preferredCurrency]]} />
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">{t("Users", "משתמשים")}</h2>
          <ul className="space-y-2 text-sm">{people.map((p) => <li key={p.email} dir="auto"><span className="font-medium">{p.fullName}</span> <span className="text-steel-500">— {p.jobTitle}, {p.email}</span></li>)}</ul>
          <p className="mt-3 text-xs text-steel-500">{t("To add purchasing colleagues, contact the trade desk.", "להוספת עמיתים לרכש, פנו לצוות המכירות.")}</p>
        </section>
      </div>

      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">{t("Addresses", "כתובות")}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {addrs.map((a) => (
            <div key={a.id} className="rounded border border-line p-3 text-sm">
              <div className="flex items-center justify-between gap-2"><p className="font-medium text-deep-900"><span dir="auto">{a.label}</span> <span className="text-xs text-steel-500">({a.kind === "BILLING" ? t("billing", "חיוב") : t("delivery", "משלוח")}{a.isDefault ? t(", default", ", ברירת מחדל") : ""})</span></p>
                {canManage && <ActionButton action={`/api/company/addresses/${a.id}`} method="DELETE" label={t("Remove", "הסרה")} className="text-xs text-bad hover:underline" confirm={t("Remove this address?", "להסיר את הכתובת?")} />}</div>
              <p dir="auto">{a.contactName}{a.phone ? `, ${a.phone}` : ""}</p>
              <p className="text-steel-500" dir="auto">{[a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode].filter(Boolean).join(", ")}</p>
            </div>
          ))}
        </div>
        {canManage && (
          <details className="mt-4">
            <summary className="btn-outline btn-sm cursor-pointer">{t("Add an address", "הוספת כתובת")}</summary>
            <ActionForm action="/api/company/addresses" className="mt-4 grid gap-4 sm:grid-cols-2" submitLabel={t("Save address", "שמירת הכתובת")} resetOnSuccess>
              <div><label className="field-label" htmlFor="kind">{t("Type", "סוג")}</label><select id="kind" name="kind" className="input"><option value="SHIPPING">{t("Delivery", "משלוח")}</option><option value="BILLING">{t("Billing", "חיוב")}</option></select></div>
              <div><label className="field-label" htmlFor="label">{t("Label", "שם הכתובת")}</label><input id="label" name="label" placeholder={t("e.g. Haifa warehouse", "למשל: מחסן חיפה")} required className="input" /></div>
              <div><label className="field-label" htmlFor="contactName">{t("Contact name", "שם איש קשר")}</label><input id="contactName" name="contactName" autoComplete="name" required className="input" /></div>
              <div><label className="field-label" htmlFor="phone">{t("Phone", "טלפון")}</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line1">{t("Address line 1", "כתובת, שורה 1")}</label><input id="line1" name="line1" autoComplete="address-line1" required className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line2">{t("Address line 2", "כתובת, שורה 2")}</label><input id="line2" name="line2" autoComplete="address-line2" className="input" /></div>
              <div><label className="field-label" htmlFor="city">{t("City", "עיר")}</label><input id="city" name="city" autoComplete="address-level2" required className="input" /></div>
              <div><label className="field-label" htmlFor="region">{t("Region", "מחוז")}</label><input id="region" name="region" className="input" /></div>
              <div><label className="field-label" htmlFor="postalCode">{t("Postal code", "מיקוד")}</label><input id="postalCode" name="postalCode" autoComplete="postal-code" className="input" /></div>
              <div><label className="field-label" htmlFor="countryCode">{t("Country (ISO)", "ארץ (קוד ISO)")}</label><input id="countryCode" name="countryCode" maxLength={2} required dir="ltr" className="input uppercase" /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" className="accent-deep" /> {t("Make this the default", "הגדרה כברירת מחדל")}</label>
            </ActionForm>
          </details>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">{t("Verification documents", "מסמכי אימות")}</h2>
          <ul className="space-y-2 text-sm">{docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3"><span dir="auto"><a className="link" href={`/api/documents/${d.id}`}>{d.docType}</a><span className="block text-xs text-steel-500">{d.originalName} · {fmtDate(d.createdAt, false, l)}{d.reviewNote ? ` · ${d.reviewNote}` : ""}</span></span><StatusPill l={l} status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "PENDING" ? t("Awaiting review", "ממתין לבדיקה") : d.status === "ACCEPTED" ? t("Accepted", "התקבל") : undefined} /></li>
          ))}</ul>
          {canManage && (
            <ActionForm action="/api/company/documents" encoding="multipart" className="mt-4 space-y-3 border-t border-line pt-4" submitLabel={t("Upload document", "העלאת מסמך")} resetOnSuccess>
              <select name="docType" aria-label={t("Document type", "סוג מסמך")} className="input">{DOC_TYPES.map((d) => <option key={d} value={d}>{l === "he" ? DOC_HE[d] ?? d : d}</option>)}</select>
              <input name="document" type="file" accept="application/pdf,image/png,image/jpeg" aria-label={t("Document file", "קובץ המסמך")} required className="input" />
            </ActionForm>
          )}
        </section>
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">{t("Verification history", "היסטוריית אימות")}</h2>
          <ul className="space-y-3 text-sm">{events.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3"><div><StatusPill status={e.toStatus} l={l} />{e.reason && <p className="mt-1 text-steel-500" dir="auto">{e.reason}</p>}</div><span className="shrink-0 text-xs text-steel-500">{fmtDate(e.createdAt, true, l)}</span></li>
          ))}</ul>
        </section>
      </div>
    </div>
  );
}
