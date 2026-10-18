import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("About", "אודות") }; }
export default async function About() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="דסק הפצה לקונים עסקיים" intro="Valden מוכרת אלקטרוניקה יקרת ערך לחברות מאומתות בלבד — סיטונאים, מפיצים, רשתות קמעונאות, משווקים, יבואנים ורוכשי IT בארגונים.">
      <h2>מה אנחנו עושים</h2>
      <p>אנו מרכזים ביקוש למכשירים ולרכיבים מתקדמים — סמארטפונים, תחנות עבודה, כרטיסי מסך, מסכים, תקשורת וציוד ליוצרי תוכן — ומספקים אותם בכמויות סחר, עם כמויות הזמנה מינימליות מפורסמות, מדרגות כמות והצעות מחיר מותאמות.</p>
      <h2>איך אנחנו עובדים</h2>
      <ul>
        <li>כל קונה הוא עסק מאומת. אנו בודקים פרטי רישום ומס ומסמכים תומכים לפני שפותחים מחירים.</li>
        <li>הזמינות מאושרת בכל הזמנה. כשאיננו יכולים לאשר מלאי או זמן אספקה, אנו אומרים זאת לפני שמבקשים תשלום.</li>
        <li>הזמנות גדולות עוברות בדיקה של זמינות, משלוח ותשלום לפני כל חיוב.</li>
        <li>תשלומים מאומתים מול ספק התשלום לפני שהזמנה מסומנת כמשולמת.</li>
      </ul>
      <h2>עצמאות</h2>
      <p>‏Valden היא מפיצה עצמאית. המותגים בקטלוג הם סימני מסחר של בעליהם; הצגתם אינה אומרת שאנו מפיץ מורשה של יצרן כלשהו, אלא אם מוצר מסוים מציין זאת.</p>
      <p><Link href="/register" className="link">פתיחת חשבון עסקי</Link> או <Link href="/contact" className="link">פנייה לצוות המכירות</Link>.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="A distribution desk for business buyers" intro="Valden sells high-value electronics exclusively to verified companies — wholesalers, distributors, retail chains, resellers, importers and corporate IT buyers.">
      <h2>What we do</h2>
      <p>We consolidate demand for premium devices and components — smartphones, workstations, graphics cards, displays, networking and creator equipment — and supply them in trade quantities with published minimum order quantities, quantity breaks and negotiated quotations.</p>
      <h2>How we work</h2>
      <ul>
        <li>Every buyer is a verified business. We review registration and tax details and supporting documents before enabling pricing.</li>
        <li>Availability is confirmed per order. Where we cannot confirm stock or lead time, we say so before asking for payment.</li>
        <li>Large orders go through a review of availability, freight and payment before anything is charged.</li>
        <li>Payments are verified with the payment provider before an order is marked as paid.</li>
      </ul>
      <h2>Independence</h2>
      <p>Valden is an independent distributor. The brands in our catalog are trademarks of their owners; listing them does not mean we are an authorised distributor for any manufacturer unless a specific listing says so.</p>
      <p><Link href="/register" className="link">Open a trade account</Link> or <Link href="/contact" className="link">contact the trade desk</Link>.</p>
    </ContentPage>
  );
}
