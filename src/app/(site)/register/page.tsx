import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { DOC_TYPES } from "@/server/uploads";
import { getT } from "@/server/locale";
import type { T } from "@/lib/i18n";
import { DOC_HE } from "@/lib/labels";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Register your business", "רישום העסק") };
}

// Submitted values stay in English (validated server-side); only the visible labels are translated.
const TYPES: [string, string][] = [
  ["Wholesaler", "סיטונאי"], ["Distributor", "מפיץ"], ["Retail chain", "רשת קמעונאית"], ["Electronics retailer", "חנות אלקטרוניקה"],
  ["Hardware reseller", "משווק חומרה"], ["Corporate IT procurement", "רכש IT בארגון"], ["Importer / exporter", "יבואן / יצואן"], ["Other", "אחר"],
];

function Address({ prefix, required, t }: { prefix: "billing" | "shipping"; required: boolean; t: T }) {
  const r = required ? { required: true } : {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="field-label" htmlFor={`${prefix}.contactName`}>{t("Contact name", "שם איש קשר")}</label><input id={`${prefix}.contactName`} name={`${prefix}.contactName`} autoComplete="name" className="input" {...r} /></div>
      <div><label className="field-label" htmlFor={`${prefix}.phone`}>{t("Phone", "טלפון")}</label><input id={`${prefix}.phone`} name={`${prefix}.phone`} type="tel" autoComplete="tel" className="input" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor={`${prefix}.line1`}>{t("Address line 1", "כתובת, שורה 1")}</label><input id={`${prefix}.line1`} name={`${prefix}.line1`} autoComplete={`${prefix} address-line1`} className="input" {...r} /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor={`${prefix}.line2`}>{t("Address line 2", "כתובת, שורה 2")}</label><input id={`${prefix}.line2`} name={`${prefix}.line2`} autoComplete={`${prefix} address-line2`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.city`}>{t("City", "עיר")}</label><input id={`${prefix}.city`} name={`${prefix}.city`} autoComplete={`${prefix} address-level2`} className="input" {...r} /></div>
      <div><label className="field-label" htmlFor={`${prefix}.region`}>{t("Region / state", "מחוז / מדינה")}</label><input id={`${prefix}.region`} name={`${prefix}.region`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.postalCode`}>{t("Postal code", "מיקוד")}</label><input id={`${prefix}.postalCode`} name={`${prefix}.postalCode`} autoComplete={`${prefix} postal-code`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.countryCode`}>{t("Country (ISO code)", "ארץ (קוד ISO, למשל IL)")}</label><input id={`${prefix}.countryCode`} name={`${prefix}.countryCode`} maxLength={2} placeholder="IL" dir="ltr" className="input uppercase" {...r} /></div>
    </div>
  );
}

function Section({ step, title, intro, children }: { step: number; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel panel-pad">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        <span aria-hidden className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-deep text-sm font-bold text-white">{step}</span>
        <div><h2 className="text-lg font-semibold">{title}</h2>{intro && <p className="text-sm text-steel-500">{intro}</p>}</div>
      </div>
      {children}
    </fieldset>
  );
}

export default async function Register() {
  const { l, t } = await getT();
  return (
    <div className="container-page py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="wide text-3xl">{t("Register your business", "רישום העסק")}</h1>
          <p className="mt-2 max-w-[62ch] text-steel-500">{t("Trade accounts are reviewed by our team before wholesale prices and ordering are enabled. Provide accurate company details — applications with incomplete or unverifiable information are declined.", "חשבונות עסקיים נבדקים על ידי הצוות שלנו לפני שמחירי סיטונאות והזמנות נפתחים. מלאו פרטי חברה מדויקים — בקשות עם מידע חסר או שאינו ניתן לאימות נדחות.")}</p>
          <ActionForm action="/api/auth/register" encoding="multipart" className="mt-8 space-y-6" submitLabel={t("Submit application", "שליחת הבקשה")} submitClass="btn-primary px-8 py-3" pendingLabel={t("Submitting…", "שולח…")}>
            <Section step={1} title={t("Company", "החברה")} intro={t("As shown on your registration documents.", "כפי שמופיע במסמכי הרישום.")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="field-label" htmlFor="legalName">{t("Registered legal name", "שם משפטי רשום")}</label><input id="legalName" name="legalName" autoComplete="organization" required className="input" /></div>
                <div><label className="field-label" htmlFor="tradingName">{t("Trading name (if different)", "שם מסחרי (אם שונה)")}</label><input id="tradingName" name="tradingName" className="input" /></div>
                <div><label className="field-label" htmlFor="businessType">{t("Business type", "סוג העסק")}</label><select id="businessType" name="businessType" className="input" required>{TYPES.map(([en, he]) => <option key={en} value={en}>{l === "he" ? he : en}</option>)}</select></div>
                <div><label className="field-label" htmlFor="countryCode">{t("Country of registration (ISO code)", "ארץ הרישום (קוד ISO, למשל IL)")}</label><input id="countryCode" name="countryCode" maxLength={2} placeholder="IL" dir="ltr" required className="input uppercase" /></div>
                <div><label className="field-label" htmlFor="registrationNumber">{t("Company registration number", "מספר חברה / ח.פ.")}</label><input id="registrationNumber" name="registrationNumber" required className="input" /></div>
                <div><label className="field-label" htmlFor="taxId">{t("VAT / tax ID (where applicable)", "מספר עוסק / מע״מ (אם רלוונטי)")}</label><input id="taxId" name="taxId" className="input" /></div>
                <div><label className="field-label" htmlFor="website">{t("Website", "אתר אינטרנט")}</label><input id="website" name="website" type="url" placeholder="https://" className="input" /></div>
                <div><label className="field-label" htmlFor="businessEmail">{t("Company email", "מייל החברה")}</label><input id="businessEmail" name="businessEmail" type="email" required className="input" /></div>
                <div><label className="field-label" htmlFor="businessPhone">{t("Company phone", "טלפון החברה")}</label><input id="businessPhone" name="businessPhone" type="tel" required className="input" /></div>
                <div className="sm:col-span-2"><label className="field-label" htmlFor="expectedMonthlyVolume">{t("Expected monthly purchasing volume", "היקף רכש חודשי צפוי")}</label>
                  <select id="expectedMonthlyVolume" name="expectedMonthlyVolume" className="input">
                    <option value="">{t("Prefer not to say", "מעדיפים לא לציין")}</option>
                    <option value="Under ₪100,000">{t("Under ₪100,000", "פחות מ-₪100,000")}</option>
                    <option value="₪100,000 – ₪500,000">₪100,000 – ₪500,000</option>
                    <option value="₪500,000 – ₪2,000,000">₪500,000 – ₪2,000,000</option>
                    <option value="Over ₪2,000,000">{t("Over ₪2,000,000", "יותר מ-₪2,000,000")}</option>
                  </select></div>
              </div>
            </Section>

            <Section step={2} title={t("Authorised purchasing contact", "איש קשר מורשה לרכש")} intro={t("This person will hold the account login and can place orders.", "לאדם זה יהיו פרטי הכניסה לחשבון והוא יוכל לבצע הזמנות.")}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="field-label" htmlFor="contactName">{t("Full name", "שם מלא")}</label><input id="contactName" name="contactName" autoComplete="name" required className="input" /></div>
                <div><label className="field-label" htmlFor="jobTitle">{t("Job title", "תפקיד")}</label><input id="jobTitle" name="jobTitle" autoComplete="organization-title" required className="input" /></div>
                <div><label className="field-label" htmlFor="email">{t("Work email (login)", "מייל עבודה (לכניסה)")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
                <div><label className="field-label" htmlFor="contactPhone">{t("Direct phone", "טלפון ישיר")}</label><input id="contactPhone" name="contactPhone" type="tel" autoComplete="tel" className="input" /></div>
                <div className="sm:col-span-2"><label className="field-label" htmlFor="password">{t("Password", "סיסמה")}</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-describedby="password-hint" className="input" /><p id="password-hint" className="field-hint">{t("At least 12 characters, including a letter and a number.", "לפחות 12 תווים, כולל אות ומספר.")}</p></div>
              </div>
            </Section>

            <Section step={3} title={t("Billing and delivery", "חיוב ומשלוח")}>
              <h3 className="mb-3 text-sm font-semibold text-deep-900">{t("Billing address", "כתובת לחיוב")}</h3>
              <Address prefix="billing" required t={t} />
              <div className="mt-6">
                <input id="sameAsBilling" type="checkbox" name="sameAsBilling" defaultChecked className="peer me-2 accent-deep" />
                <label htmlFor="sameAsBilling" className="text-sm font-medium">{t("Delivery address is the same as billing", "כתובת המשלוח זהה לכתובת החיוב")}</label>
                <div className="mt-4 peer-checked:hidden">
                  <h3 className="mb-3 text-sm font-semibold text-deep-900">{t("Delivery address", "כתובת למשלוח")}</h3>
                  <Address prefix="shipping" required={false} t={t} />
                </div>
              </div>
            </Section>

            <Section step={4} title={t("Verification documents", "מסמכים לאימות")} intro={t("PDF, PNG or JPEG, up to 10MB each. At least one document is required.", "PDF,‏ PNG או JPEG, עד 10MB לקובץ. נדרש לפחות מסמך אחד.")}>
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <select name="docTypes" aria-label={t(`Document ${i + 1} type`, `סוג מסמך ${i + 1}`)} className="input" defaultValue={DOC_TYPES[i]}>{DOC_TYPES.map((d) => <option key={d} value={d}>{l === "he" ? DOC_HE[d] ?? d : d}</option>)}</select>
                    <input name="documents" type="file" accept="application/pdf,image/png,image/jpeg" aria-label={t(`Document ${i + 1} file`, `קובץ מסמך ${i + 1}`)} className="input file:me-3 file:rounded-sm file:border-0 file:bg-deep-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-deep" required={i === 0} />
                  </div>
                ))}
              </div>
            </Section>

            <div className="panel panel-pad space-y-3 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" name="acceptTerms" required className="mt-1 accent-deep" /> <span>{l === "he"
                ? <>אני מקבל/ת את <Link href="/terms" className="link" target="_blank">תנאי הסחר</Link> ואת <Link href="/privacy" className="link" target="_blank">מדיניות הפרטיות</Link>.</>
                : <>I accept the <Link href="/terms" className="link" target="_blank">terms of trade</Link> and <Link href="/privacy" className="link" target="_blank">privacy policy</Link>.</>}</span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="declareAuthorized" required className="mt-1 accent-deep" /> <span>{t("I confirm I am authorised to register this business and that the information provided is accurate.", "אני מאשר/ת שאני מורשה לרשום את העסק ושהמידע שמסרתי נכון.")}</span></label>
            </div>
          </ActionForm>
        </div>
        <aside className="space-y-4 self-start lg:sticky lg:top-6">
          <div className="panel panel-pad text-sm">
            <h2 className="font-semibold text-deep-900">{t("What happens next", "מה קורה אחר כך")}</h2>
            <ol className="mt-3 list-decimal space-y-2 ps-5 text-steel-500">
              <li>{t("You can sign in straight away and follow the review status.", "אפשר להיכנס מיד ולעקוב אחרי סטטוס הבדיקה.")}</li>
              <li>{t("Our trade desk checks your company and documents. We may ask for more information.", "צוות המכירות בודק את החברה ואת המסמכים. ייתכן שנבקש מידע נוסף.")}</li>
              <li>{t("Once approved, wholesale pricing, quotations and ordering are switched on.", "לאחר האישור נפתחים מחירי סיטונאות, הצעות מחיר והזמנות.")}</li>
            </ol>
          </div>
          <div className="panel panel-pad text-sm text-steel-500">{t("Individuals and consumer purchases are not supported. Documents are stored privately and only reviewed by authorised staff.", "לא ניתן לרכוש כאדם פרטי או לצריכה פרטית. המסמכים נשמרים באופן פרטי ונבדקים רק על ידי צוות מורשה.")}</div>
        </aside>
      </div>
    </div>
  );
}
