import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { companyInfo } from "@/lib/company";

export const metadata = { title: "Accessibility statement" };

/** Update this date whenever the accessibility review below is repeated or the statement changes. */
const LAST_REVIEWED = "18 October 2026";

export default function Accessibility() {
  const c = companyInfo();
  const a = c.accessibility;
  const hasCoordinator = !!(a.name || a.email || a.phone);
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
        <li>Text and interface colours were chosen for sufficient contrast; no page relies on colour alone to convey status.</li>
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

      <h2 lang="he" dir="rtl">הצהרת נגישות (תקציר בעברית)</h2>
      <div lang="he" dir="rtl">
        <p>אנו פועלים להנגשת האתר בהתאם להנחיות WCAG 2.1 ברמה AA ולתקן הישראלי 5568. האתר טרם נבדק על ידי מורשה נגישות או גורם בודק בלתי תלוי, ולכן איננו מצהירים כי הוא עומד במלוא דרישות התקן או תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות).</p>
        <p>בוצעו בדיקות אוטומטיות, בדיקות ניווט במקלדת, בדיקות הגדלת טקסט ותצוגה במסכים קטנים. מגבלות ידועות: חלון התשלום של PayPal מסופק על ידי PayPal; מסמכי ההזמנה להדפסה נבדקו באופן אוטומטי בלבד; טרם בוצעו בדיקות שיטתיות עם קוראי מסך.</p>
        <p>
          נתקלתם בקושי? {hasCoordinator ? <>פנו לרכז/ת הנגישות{a.name ? `: ${a.name}` : ""}{a.email ? <>, <a href={`mailto:${a.email}`}>{a.email}</a></> : null}{a.phone ? `, ${a.phone}` : ""}.</> : <><Link href="/contact?topic=Accessibility">פנו אלינו בטופס יצירת הקשר</Link> ובחרו בנושא &quot;Accessibility&quot;.</>}
        </p>
      </div>

      <p className="text-sm text-steel-500">Statement last updated: {LAST_REVIEWED}.</p>
    </ContentPage>
  );
}
