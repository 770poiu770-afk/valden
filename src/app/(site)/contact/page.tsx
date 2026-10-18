import { ActionForm } from "@/components/ActionForm";
import { companyInfo } from "@/lib/company";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Contact the trade desk", "פנייה לצוות המכירות") }; }
// Submitted topic values stay in English (validated server-side).
const TOPICS: [string, string][] = [["Trade account", "חשבון עסקי"], ["Quote request", "בקשת הצעת מחיר"], ["Order support", "תמיכה בהזמנה"], ["Logistics", "לוגיסטיקה"], ["Accessibility", "נגישות"], ["Partnership", "שיתוף פעולה"], ["Other", "אחר"]];
export default async function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const sp = await searchParams;
  const { l, t } = await getT();
  const c = companyInfo();
  const topic = TOPICS.some(([en]) => en === sp.topic) ? sp.topic : "Trade account";
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[44px]">{t("Contact the trade desk", "פנייה לצוות המכירות")}</h1>
        <p className="mt-3 text-steel-500">{t("Business enquiries only. Account holders can also raise questions from an order or quotation in their portal.", "פניות עסקיות בלבד. בעלי חשבון יכולים לשאול גם מתוך הזמנה או הצעת מחיר באזור האישי.")}</p>
        <ActionForm action="/api/contact" className="mt-8 grid gap-4 sm:grid-cols-2" submitLabel={t("Send enquiry", "שליחת הפנייה")} resetOnSuccess>
          <div><label className="field-label" htmlFor="name">{t("Your name", "שם")}</label><input id="name" name="name" autoComplete="name" required className="input" /></div>
          <div><label className="field-label" htmlFor="companyName">{t("Company", "חברה")}</label><input id="companyName" name="companyName" autoComplete="organization" required className="input" /></div>
          <div><label className="field-label" htmlFor="email">{t("Work email", "מייל עבודה")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
          <div><label className="field-label" htmlFor="phone">{t("Phone", "טלפון")}</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="topic">{t("Topic", "נושא")}</label><select id="topic" name="topic" defaultValue={topic} className="input">{TOPICS.map(([en, he]) => <option key={en} value={en}>{l === "he" ? he : en}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="message">{t("Message", "הודעה")}</label><textarea id="message" name="message" rows={6} required minLength={10} className="input" /></div>
          <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </ActionForm>
      </div>
      <aside className="panel panel-pad self-start text-sm">
        <h2 className="font-semibold text-deep-900">{t("Direct contact", "יצירת קשר ישירה")}</h2>
        {c.email || c.phone || c.address ? (
          <div className="mt-3 space-y-1">{c.legalName && <p className="font-medium">{c.legalName}</p>}{c.address && <p>{c.address}</p>}{c.email && <p><a className="link" href={`mailto:${c.email}`}>{c.email}</a></p>}{c.phone && <p dir="ltr" className="text-start">{c.phone}</p>}</div>
        ) : <p className="mt-3 text-steel-500">{t("Use the form and we will reply by email.", "מלאו את הטופס ונחזור אליכם במייל.")}</p>}
      </aside>
    </div>
  );
}
