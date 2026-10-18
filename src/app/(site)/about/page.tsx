import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("About", "אודות") }; }
export default async function About() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="אלקטרוניקה לכולם — מיחידה אחת ועד אלפים" intro="Valden היא חנות אלקטרוניקה פתוחה לכולם: לקוחות פרטיים, עסקים קטנים, חנויות, משווקים ורוכשי IT בארגונים.">
      <h2>מה אנחנו עושים</h2>
      <p>אנו מוכרים מכשירים ורכיבים מתקדמים — סמארטפונים, מחשבים, אוזניות ורמקולים, גיימינג, שעונים חכמים ומטענים. אפשר לקנות יחידה אחת, וכשקונים יותר — מחיר היחידה יורד אוטומטית לפי מדרגות כמות שמוצגות בכל מוצר.</p>
      <h2>איך אנחנו עובדים</h2>
      <ul>
        <li>כל אחד יכול לפתוח חשבון עם אימייל וסיסמה. פרטי עסק הם רשות, למי שרוצה אותם בחשבונית.</li>
        <li>המחירים גלויים לכולם, והסכומים מחושבים אוטומטית לפי הכמות.</li>
        <li>הזמנות נבדקות לפני התשלום — אישור מלאי, תמחור משלוח ובדיקות נגד הונאה — כדי שלא תחויבו על משהו שאיננו יכולים לספק.</li>
        <li>תשלומים מאומתים מול ספק התשלום לפני שהזמנה מסומנת כמשולמת.</li>
        <li>להזמנות גדולות במיוחד אפשר לבקש הצעת מחיר רשמית.</li>
      </ul>
      <h2>עצמאות</h2>
      <p>‏Valden היא משווקת עצמאית. המותגים בקטלוג הם סימני מסחר של בעליהם; הצגתם אינה אומרת שאנו מפיץ מורשה של יצרן כלשהו, אלא אם מוצר מסוים מציין זאת.</p>
      <p><Link href="/register" className="link">פתיחת חשבון</Link> או <Link href="/contact" className="link">יצירת קשר</Link>.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="Electronics for everyone — from one unit to thousands" intro="Valden is an electronics store open to everyone: individual shoppers, small businesses, retailers, resellers and corporate IT buyers.">
      <h2>What we do</h2>
      <p>We sell premium devices and components — phones, computers, headphones and speakers, gaming, smartwatches and chargers. You can buy a single unit, and when you buy more the unit price steps down automatically according to the volume tiers shown on each product.</p>
      <h2>How we work</h2>
      <ul>
        <li>Anyone can open an account with an email and password. Business details are optional, for those who want them on invoices.</li>
        <li>Prices are visible to everyone, and totals are calculated automatically from the quantity.</li>
        <li>Orders are reviewed before payment — stock confirmation, freight pricing and fraud checks — so you are never charged for something we cannot supply.</li>
        <li>Payments are verified with the payment provider before an order is marked as paid.</li>
        <li>Very large orders can be handled by a formal quotation.</li>
      </ul>
      <h2>Independence</h2>
      <p>Valden is an independent retailer and distributor. The brands in our catalog are trademarks of their owners; listing them does not mean we are an authorised distributor for any manufacturer unless a specific listing says so.</p>
      <p><Link href="/register" className="link">Create an account</Link> or <Link href="/contact" className="link">contact us</Link>.</p>
    </ContentPage>
  );
}
