import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { currentActor } from "@/server/http";
import { getT } from "@/server/locale";
import { accountActive } from "@/lib/auth";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Request a bulk quote", "בקשת הצעת מחיר לכמויות") }; }
export default async function Quote() {
  const { t } = await getT();
  const actor = await currentActor();
  if (actor?.companyId && !actor.isStaff && accountActive(actor.companyStatus)) redirect("/portal/quotes/new");
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_22rem]">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[44px]">{t("Request a bulk quote", "בקשת הצעת מחיר לכמויות")}</h1>
        <p className="mt-3 text-steel-500">{t("For very large quantities, mixed loads and items not listed online. Most bulk orders can simply be placed from the catalog — volume pricing applies automatically. Account holders can also build quotations line by line and accept offers online.", "לכמויות גדולות במיוחד, משלוחים מעורבים ומוצרים שאינם מופיעים באתר. את רוב ההזמנות בכמויות אפשר פשוט לבצע מהקטלוג — מחירי הכמות חלים אוטומטית. בעלי חשבון יכולים גם לבנות הצעות מחיר שורה אחר שורה ולאשר הצעות באתר.")}</p>
        <ActionForm action="/api/contact" className="mt-8 grid gap-4 sm:grid-cols-2" submitLabel={t("Send quote request", "שליחת בקשה להצעת מחיר")} resetOnSuccess>
          <input type="hidden" name="topic" value="Quote request" />
          <div><label className="field-label" htmlFor="name">{t("Your name", "שם")}</label><input id="name" name="name" autoComplete="name" required className="input" /></div>
          <div><label className="field-label" htmlFor="companyName">{t("Company (optional)", "חברה (רשות)")}</label><input id="companyName" name="companyName" autoComplete="organization" className="input" /></div>
          <div><label className="field-label" htmlFor="email">{t("Email", "אימייל")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
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
          <p className="mt-2 text-steel-500">{t("With a free account, offers arrive in your account with an expiry date and you can accept and convert them to an order in one step. No company documents needed.", "עם חשבון חינמי, ההצעות מגיעות לחשבון שלכם עם תאריך תפוגה, ואפשר לאשר ולהפוך אותן להזמנה בצעד אחד. בלי מסמכי חברה.")}</p>
          {!actor && <Link href="/register?next=/portal/quotes/new" className="btn-primary mt-4">{t("Create an account", "יצירת חשבון")}</Link>}
        </div>
      </aside>
    </div>
  );
}
