import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { addresses, businessDocuments, companies, users } from "@/db/schema";
import { currentActor } from "@/server/http";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Account & addresses", "חשבון וכתובות") }; }

/** Customer account: own details (optional business fields for invoices) and saved addresses. */
export default async function AccountPage() {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const { l, t } = await getT();
  const [co, me, addrs, docs, people] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, actor.companyId)).then((r) => r[0]),
    db.select().from(users).where(eq(users.id, actor.userId)).then((r) => r[0]),
    db.select().from(addresses).where(eq(addresses.companyId, actor.companyId)),
    db.select().from(businessDocuments).where(eq(businessDocuments.companyId, actor.companyId)).orderBy(desc(businessDocuments.createdAt)),
    db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.companyId, actor.companyId)),
  ]);
  const canManage = actor.permissions.has("company.manage");
  const isBusiness = co.accountType === "BUSINESS";
  return (
    <div className="space-y-6">
      <PageHeader title={t("Account & addresses", "חשבון וכתובות")} intro={t("Your details and saved addresses. Business details are optional and appear on your invoices.", "הפרטים שלכם והכתובות השמורות. פרטי עסק הם רשות ויופיעו בחשבוניות.")} />

      <section className="panel panel-pad">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t("Your details", "הפרטים שלכם")}</h2>
          <span className="text-sm text-steel-500">{me.email}</span>
        </div>
        {canManage ? (
          <ActionForm action="/api/account" className="grid gap-4 sm:grid-cols-2" submitLabel={t("Save details", "שמירת הפרטים")}>
            <div><label className="field-label" htmlFor="fullName">{t("Full name", "שם מלא")}</label><input id="fullName" name="fullName" defaultValue={me.fullName} autoComplete="name" required className="input" /></div>
            <div><label className="field-label" htmlFor="phone">{t("Phone", "טלפון")}</label><input id="phone" name="phone" type="tel" defaultValue={me.phone ?? ""} autoComplete="tel" className="input" /></div>
            <div><label className="field-label" htmlFor="countryCode">{t("Country code", "קוד מדינה")}</label><input id="countryCode" name="countryCode" defaultValue={co.countryCode} maxLength={2} required dir="ltr" className="input uppercase" /></div>
            <div className="hidden sm:block" />
            <div><label className="field-label" htmlFor="companyName">{t("Company name (optional)", "שם החברה (רשות)")}</label><input id="companyName" name="companyName" defaultValue={isBusiness ? co.legalName : ""} autoComplete="organization" className="input" /></div>
            <div><label className="field-label" htmlFor="taxId">{t("VAT / company number (optional)", "מספר עוסק / ח.פ. (רשות)")}</label><input id="taxId" name="taxId" defaultValue={co.taxId ?? ""} className="input" /></div>
          </ActionForm>
        ) : (
          <p className="text-sm">{me.fullName}{isBusiness ? ` · ${co.legalName}` : ""}</p>
        )}
        {people.length > 1 && (
          <div className="mt-6 border-t border-line pt-4">
            <h3 className="mb-2 text-sm font-semibold">{t("Users on this account", "משתמשים בחשבון")}</h3>
            <ul className="space-y-1 text-sm">{people.map((p) => <li key={p.email} dir="auto">{p.fullName} <span className="text-steel-500">— {p.email}</span></li>)}</ul>
          </div>
        )}
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-3 font-semibold">{t("Addresses", "כתובות")}</h2>
        {addrs.length === 0 && <p className="text-sm text-steel-500">{t("No saved addresses yet. You can add one here or at checkout.", "עדיין אין כתובות שמורות. אפשר להוסיף כאן או בתשלום.")}</p>}
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
              <div><label className="field-label" htmlFor="label">{t("Label", "שם הכתובת")}</label><input id="label" name="label" placeholder={t("e.g. Home, Office, Haifa warehouse", "למשל: בית, משרד, מחסן חיפה")} required className="input" /></div>
              <div><label className="field-label" htmlFor="contactName">{t("Contact name", "שם איש קשר")}</label><input id="contactName" name="contactName" autoComplete="name" required className="input" /></div>
              <div><label className="field-label" htmlFor="aphone">{t("Phone", "טלפון")}</label><input id="aphone" name="phone" type="tel" autoComplete="tel" className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line1">{t("Address line 1", "כתובת, שורה 1")}</label><input id="line1" name="line1" autoComplete="address-line1" required className="input" /></div>
              <div className="sm:col-span-2"><label className="field-label" htmlFor="line2">{t("Address line 2", "כתובת, שורה 2")}</label><input id="line2" name="line2" autoComplete="address-line2" className="input" /></div>
              <div><label className="field-label" htmlFor="city">{t("City", "עיר")}</label><input id="city" name="city" autoComplete="address-level2" required className="input" /></div>
              <div><label className="field-label" htmlFor="region">{t("Region", "מחוז")}</label><input id="region" name="region" className="input" /></div>
              <div><label className="field-label" htmlFor="postalCode">{t("Postal code", "מיקוד")}</label><input id="postalCode" name="postalCode" autoComplete="postal-code" className="input" /></div>
              <div><label className="field-label" htmlFor="acountry">{t("Country (ISO)", "ארץ (קוד ISO)")}</label><input id="acountry" name="countryCode" defaultValue={co.countryCode} maxLength={2} required dir="ltr" className="input uppercase" /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="isDefault" className="accent-deep" /> {t("Make this the default", "הגדרה כברירת מחדל")}</label>
            </ActionForm>
          </details>
        )}
      </section>

      {docs.length > 0 && (
        <section className="panel panel-pad">
          <h2 className="mb-3 font-semibold">{t("Documents you uploaded earlier", "מסמכים שהעליתם בעבר")}</h2>
          <ul className="space-y-2 text-sm">{docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3"><span dir="auto"><a className="link" href={`/api/documents/${d.id}`}>{d.docType}</a><span className="block text-xs text-steel-500">{d.originalName} · {fmtDate(d.createdAt, false, l)}</span></span><StatusPill l={l} status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "PENDING" ? t("Received", "התקבל") : d.status === "ACCEPTED" ? t("Accepted", "התקבל") : undefined} /></li>
          ))}</ul>
          <p className="mt-2 text-xs text-steel-500">{t("Documents are no longer required to shop.", "כבר לא נדרשים מסמכים כדי לקנות.")}</p>
        </section>
      )}
    </div>
  );
}
