import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { currentActor } from "@/server/http";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Request a wholesale quote", "בקשת הצעת מחיר סיטונאית") }; }
export default async function Quote() {
  const { t } = await getT();
  const actor = await currentActor();
  if (actor?.companyStatus === "APPROVED" && !actor.isStaff) redirect("/portal/quotes/new");
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_22rem]">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[44px]">{t("Request a wholesale quote", "בקשת הצעת מחיר סיטונאית")}</h1>
        <p className="mt-3 text-steel-500">{t("For volume programmes, mixed container loads and items not listed online. Approved account holders build quotations line by line in their portal and accept offers online.", "לפרויקטים בכמויות, מכולות מעורבות ומוצרים שאינם מופיעים באתר. בעלי חשבון מאושר בונים הצעות מחיר שורה אחר שורה באזור האישי ומאשרים הצעות באתר.")}</p>
        {actor && <p className="mt-4 rounded border border-warn/30 bg-warn-soft px-4 py-3 text-sm">{t("Your account is still under review. You can send a preliminary request here; formal offers are issued once your account is approved.", "החשבון שלכם עדיין בבדיקה. אפשר לשלוח כאן בקשה ראשונית; הצעות רשמיות נשלחות לאחר אישור החשבון.")}</p>}
        <ActionForm action="/api/contact" className="mt-8 grid gap-4 sm:grid-cols-2" submitLabel={t("Send quote request", "שליחת בקשה להצעת מחיר")} resetOnSuccess>
          <input type="hidden" name="topic" value="Quote request" />
          <div><label className="field-label" htmlFor="name">{t("Your name", "שם")}</label><input id="name" name="name" autoComplete="name" required className="input" /></div>
          <div><label className="field-label" htmlFor="companyName">{t("Company", "חברה")}</label><input id="companyName" name="companyName" autoComplete="organization" required className="input" /></div>
          <div><label className="field-label" htmlFor="email">{t("Work email", "מייל עבודה")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
          <div><label className="field-label" htmlFor="phone">{t("Phone", "טלפון")}</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" /></div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="message">{t("Products, quantities and target prices", "מוצרים, כמויות ומחירי יעד")}</label>
            <textarea id="message" name="message" rows={8} required minLength={10} className="input" dir="auto" placeholder={t("VLD-IPH-XXXXXX-01, 500 units, target $1,450\nRTX 5090 board-partner cards, 120 units\nDelivery: Ashdod, Israel — DAP", "VLD-IPH-XXXXXX-01, 500 יח׳, מחיר יעד $1,450\nכרטיסי RTX 5090, 120 יח׳\nמשלוח: אשדוד — DAP")} />
          </div>
          <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </ActionForm>
      </div>
      <aside className="space-y-4 self-start">
        <div className="panel panel-pad text-sm">
          <h2 className="font-semibold text-deep-900">{t("Faster with an account", "מהיר יותר עם חשבון")}</h2>
          <p className="mt-2 text-steel-500">{t("With an approved account, quote requests are priced against your contract terms, offers arrive in your portal with an expiry date, and you can accept and convert to an order in one step.", "עם חשבון מאושר, בקשות להצעת מחיר מתומחרות לפי תנאי החוזה שלכם, ההצעות מגיעות לאזור האישי עם תאריך תפוגה, ואפשר לאשר ולהפוך להזמנה בצעד אחד.")}</p>
          {!actor && <Link href="/register" className="btn-primary mt-4">{t("Register your business", "רישום העסק")}</Link>}
        </div>
      </aside>
    </div>
  );
}
