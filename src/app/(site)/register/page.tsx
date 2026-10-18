import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { currentActor } from "@/server/http";
import { getT } from "@/server/locale";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Create an account", "יצירת חשבון") };
}

const COUNTRIES: [string, string, string][] = [
  ["IL", "Israel", "ישראל"], ["US", "United States", "ארצות הברית"], ["GB", "United Kingdom", "בריטניה"], ["DE", "Germany", "גרמניה"],
  ["FR", "France", "צרפת"], ["NL", "Netherlands", "הולנד"], ["IT", "Italy", "איטליה"], ["ES", "Spain", "ספרד"], ["CY", "Cyprus", "קפריסין"], ["GR", "Greece", "יוון"],
];

/** Open-store sign-up: email and password are all that is required. */
export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const { l, t } = await getT();
  const actor = await currentActor();
  if (actor) redirect(actor.isStaff ? "/admin" : "/portal");
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,28rem)_1fr]">
      <div>
        <h1 className="wide text-3xl">{t("Create an account", "יצירת חשבון")}</h1>
        <p className="mt-2 text-steel-500">{t("Takes a minute. Order a single item or thousands — no company documents needed.", "לוקח דקה. אפשר להזמין פריט אחד או אלפים — בלי מסמכי חברה.")}</p>
        {sp.error && <p role="alert" className="mt-4 rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{sp.error.slice(0, 200)}</p>}
        <ActionForm action="/api/auth/register" className="mt-6 space-y-4" submitLabel={t("Create account", "יצירת חשבון")} submitClass="btn-primary w-full py-3" pendingLabel={t("Creating your account…", "יוצרים את החשבון…")}>
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <div><label className="field-label" htmlFor="email">{t("Email", "אימייל")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
          <div>
            <label className="field-label" htmlFor="password">{t("Password", "סיסמה")}</label>
            <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-describedby="password-hint" className="input" />
            <p id="password-hint" className="field-hint">{t("At least 12 characters, including a letter and a number.", "לפחות 12 תווים, כולל אות ומספר.")}</p>
          </div>
          <div><label className="field-label" htmlFor="fullName">{t("Full name (optional)", "שם מלא (רשות)")}</label><input id="fullName" name="fullName" autoComplete="name" className="input" /></div>
          <div>
            <label className="field-label" htmlFor="countryCode">{t("Country", "מדינה")}</label>
            <select id="countryCode" name="countryCode" defaultValue="IL" autoComplete="country" className="input">
              {COUNTRIES.map(([cc, en, he]) => <option key={cc} value={cc}>{l === "he" ? he : en}</option>)}
            </select>
          </div>
          <details className="rounded border border-line bg-white p-3 text-sm">
            <summary className="cursor-pointer font-medium text-deep-900">{t("Buying for a business? (optional)", "קונים עבור עסק? (רשות)")}</summary>
            <p className="mt-2 text-steel-500">{t("Add your company name and VAT number to show them on invoices. You can also add or change them later.", "הוסיפו שם חברה ומספר עוסק כדי שיופיעו בחשבוניות. אפשר להוסיף או לשנות גם אחר כך.")}</p>
            <input type="hidden" name="isBusiness" value="true" />
            <div className="mt-3 space-y-3">
              <div><label className="field-label" htmlFor="companyName">{t("Company name", "שם החברה")}</label><input id="companyName" name="companyName" autoComplete="organization" className="input" /></div>
              <div><label className="field-label" htmlFor="taxId">{t("VAT / company number", "מספר עוסק / ח.פ.")}</label><input id="taxId" name="taxId" className="input" /></div>
              <div><label className="field-label" htmlFor="phone">{t("Phone", "טלפון")}</label><input id="phone" name="phone" type="tel" autoComplete="tel" className="input" /></div>
            </div>
          </details>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="acceptTerms" required className="mt-1 accent-deep" /> <span>{l === "he"
            ? <>אני מסכים/ה ל<Link href="/terms" className="link" target="_blank">תנאי השימוש והמכירה</Link> ול<Link href="/privacy" className="link" target="_blank">מדיניות הפרטיות</Link>.</>
            : <>I agree to the <Link href="/terms" className="link" target="_blank">terms of sale</Link> and <Link href="/privacy" className="link" target="_blank">privacy policy</Link>.</>}</span></label>
        </ActionForm>
        <p className="mt-4 text-sm">{t("Already have an account?", "כבר יש לכם חשבון?")} <Link className="link" href={sp.next ? `/login?next=${encodeURIComponent(sp.next)}` : "/login"}>{t("Sign in", "כניסה")}</Link></p>
      </div>
      <aside className="space-y-4 self-start">
        <div className="panel panel-pad text-sm">
          <h2 className="font-semibold text-deep-900">{t("What you get", "מה מקבלים")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-steel-500">
            <li>{t("Buy from one unit — or in bulk with automatic quantity discounts.", "קנייה מיחידה אחת — או בכמויות עם הנחות כמות אוטומטיות.")}</li>
            <li>{t("A saved cart, order history, tracking and printable invoices.", "סל שמור, היסטוריית הזמנות, מעקב משלוחים וחשבוניות להדפסה.")}</li>
            <li>{t("Formal quotations for very large orders.", "הצעות מחיר רשמיות להזמנות גדולות במיוחד.")}</li>
            <li>{t("Pay with PayPal or by bank transfer. Payments are verified before an order is marked paid.", "תשלום ב-PayPal או בהעברה בנקאית. תשלומים מאומתים לפני שהזמנה מסומנת כמשולמת.")}</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
