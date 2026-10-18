import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { companyInfo } from "@/lib/company";
import { getT } from "@/server/locale";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Accessibility statement", "הצהרת נגישות") };
}

/** Update these dates whenever the accessibility review below is repeated or the statement changes. */
const LAST_REVIEWED = { en: "18 October 2026", he: "18 באוקטובר 2026" };

export default async function Accessibility() {
  const { l } = await getT();
  const c = companyInfo();
  const a = c.accessibility;
  const hasCoordinator = !!(a.name || a.email || a.phone);

  if (l === "he") return (
    <ContentPage title="הצהרת נגישות" legal>
      <p>אנחנו רוצים שכל קונה עסקי יוכל להשתמש באתר, כולל מי שמשתמשים במקלדת במקום בעכבר, בקוראי מסך, בהגדלת מסך, בשליטה קולית או בהגדרות ניגודיות גבוהה.</p>

      <h2>מצב נוכחי</h2>
      <p>
        אנו פועלים להנגשת האתר בהתאם להנחיות WCAG 2.1 ברמה AA, הרמה שאליה מפנה התקן הישראלי 5568.{" "}
        <strong>האתר טרם נבדק על ידי מורשה נגישות או גורם בודק בלתי תלוי, ולכן איננו מצהירים שהוא עומד במלוא דרישות התקן או תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות).</strong>
        {" "}נעדכן הצהרה זו לאחר בדיקה מקצועית.
      </p>

      <h2>מה עשינו עד כה</h2>
      <ul>
        <li>בדיקות אוטומטיות של הדפים הציבוריים, אזור הלקוח והתשלום באמצעות axe-core, לפי כללי WCAG 2.0,‏ 2.1 ו-2.2 ברמות A ו-AA, במסכי מחשב ובמסכי טלפון.</li>
        <li>בדיקות מקלדת: אפשר להגיע לכל הרכיבים האינטראקטיביים במקש Tab, ולכל רכיב יש סימון פוקוס נראה; קישור &quot;דילוג לתוכן&quot; הוא הפריט הראשון בכל דף.</li>
        <li>בדיקות תצוגה ברוחב 320 פיקסלים (שווה ערך להגדלה של 400%) ובהגדלת טקסט ל-200%, ללא גלילה אופקית בדפים שנבדקו.</li>
        <li>לשדות בטפסים יש תוויות טקסט גלויות; שגיאות מוקראות לקוראי מסך; טבלאות שנגללות הצידה במסכים קטנים ניתנות לגלילה במקלדת.</li>
        <li>לאיורי המוצרים יש טקסט חלופי, או שהם מוסתרים מקוראי מסך כשהם רק חוזרים על טקסט הקישור שלידם.</li>
        <li>האתר זמין בעברית מימין לשמאל ובאנגלית; צבעי הטקסט והממשק נבחרו לניגודיות מספקת, ושום דף אינו מסתמך על צבע בלבד כדי להעביר מידע.</li>
      </ul>

      <h2>מגבלות ידועות</h2>
      <ul>
        <li>חלון התשלום של PayPal מסופק על ידי PayPal והנגישות שלו באחריותה; העברה בנקאית זמינה תמיד כחלופה.</li>
        <li>מסמכי ההזמנה להדפסה (אישור הזמנה, חשבון עסקה, רשימת אריזה) הם דפי אינטרנט שנועדו להדפסה ונבדקו באופן אוטומטי בלבד.</li>
        <li>נתוני המוצרים (שמות, מפרטים ותיאורים) מוצגים באנגלית.</li>
        <li>תמונות המוצרים הן איורים כלליים עד שיתווספו תמונות מוצר ברישיון.</li>
        <li>טרם בוצעו בדיקות שיטתיות עם קוראי המסך NVDA,‏ JAWS,‏ VoiceOver ו-TalkBack.</li>
      </ul>

      <h2>פנייה בנושא נגישות</h2>
      {hasCoordinator ? (
        <>
          <p>אם נתקלתם בקושי בשימוש בחלק כלשהו של האתר, או שאתם צריכים מידע בפורמט אחר, פנו לרכז/ת הנגישות:</p>
          <ul>
            {a.name && <li>שם: {a.name}</li>}
            {a.email && <li>מייל: <a href={`mailto:${a.email}`}>{a.email}</a></li>}
            {a.phone && <li>טלפון: <span dir="ltr">{a.phone}</span></li>}
          </ul>
        </>
      ) : (
        <p>
          אם נתקלתם בקושי בשימוש בחלק כלשהו של האתר, או שאתם צריכים מידע בפורמט אחר,{" "}
          <Link href="/contact?topic=Accessibility">פנו אלינו בטופס יצירת הקשר ובחרו בנושא &quot;נגישות&quot;</Link>
          {c.email ? <>, או כתבו ל-<a href={`mailto:${c.email}`}>{c.email}</a></> : null}.
        </p>
      )}
      <p>נא לתאר את הדף ואת הבעיה, ואם רלוונטי גם את הטכנולוגיה המסייעת שבה אתם משתמשים. נשתדל להשיב תוך חמישה ימי עסקים.</p>

      <p className="text-sm text-steel-500">ההצהרה עודכנה לאחרונה: {LAST_REVIEWED.he}.</p>
    </ContentPage>
  );

  return (
    <ContentPage title="Accessibility statement" legal>
      <p>We want every business buyer to be able to use this website, including people who use a keyboard instead of a mouse, screen readers, screen magnification, voice control or high contrast settings.</p>

      <h2>Current status</h2>
      <p>
        We are working toward the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA, the level referenced by Israeli Standard
        IS 5568. <strong>This website has not yet been reviewed by an independent accessibility auditor, and we do not claim that it fully conforms
        to WCAG 2.1 AA, IS 5568 or the Equal Rights for Persons with Disabilities (Accessibility Adjustments to Service) Regulations.</strong>
        {" "}We will update this statement after a professional audit.
      </p>

      <h2>What we have done so far</h2>
      <ul>
        <li>Automated testing of the main public, buyer and checkout pages with axe-core against WCAG 2.0, 2.1 and 2.2 level A and AA rules, on desktop and mobile screen sizes.</li>
        <li>Keyboard checks: all interactive elements can be reached with the Tab key and show a visible focus outline; a &quot;Skip to content&quot; link is the first item on every page.</li>
        <li>Layout checks at 320 CSS pixels wide (equivalent to 400% zoom) and with text enlarged to 200%, without horizontal scrolling on the pages tested.</li>
        <li>Form fields have visible text labels; errors are announced to screen readers; tables that scroll sideways on small screens can be scrolled with the keyboard.</li>
        <li>Product illustrations carry text alternatives, or are hidden from screen readers when they only repeat the link text next to them.</li>
        <li>The site is available in English and in right-to-left Hebrew; text and interface colours were chosen for sufficient contrast, and no page relies on colour alone to convey status.</li>
      </ul>

      <h2>Known limitations</h2>
      <ul>
        <li>The PayPal payment window is provided by PayPal. Its accessibility is PayPal&apos;s responsibility; bank transfer is always available as an alternative.</li>
        <li>Printable order documents (confirmation, pro-forma invoice, packing list) are web pages designed for printing and have only had automated checks.</li>
        <li>Product pictures are generic line drawings until licensed product photography is added.</li>
        <li>Screen-reader testing with NVDA, JAWS, VoiceOver and TalkBack has not yet been carried out systematically.</li>
      </ul>

      <h2>Contact us about accessibility</h2>
      {hasCoordinator ? (
        <>
          <p>If you have difficulty using any part of the website, or need information in another format, contact our accessibility coordinator:</p>
          <ul>
            {a.name && <li>Name: {a.name}</li>}
            {a.email && <li>Email: <a href={`mailto:${a.email}`}>{a.email}</a></li>}
            {a.phone && <li>Phone: {a.phone}</li>}
          </ul>
        </>
      ) : (
        <p>
          If you have difficulty using any part of the website, or need information in another format, please{" "}
          <Link href="/contact?topic=Accessibility">contact us using the form and choose the topic &quot;Accessibility&quot;</Link>
          {c.email ? <>, or email <a href={`mailto:${c.email}`}>{c.email}</a></> : null}.
        </p>
      )}
      <p>Please describe the page and the problem, and the assistive technology you use if relevant. We aim to respond within five business days.</p>
      <p>
        <a href="/api/lang?l=he&amp;next=%2Faccessibility" lang="he" hrefLang="he">הצהרת הנגישות בעברית</a>
      </p>

      <p className="text-sm text-steel-500">Statement last updated: {LAST_REVIEWED.en}.</p>
    </ContentPage>
  );
}
