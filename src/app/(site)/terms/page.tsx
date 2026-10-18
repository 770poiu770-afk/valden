import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Terms of trade", "תנאי סחר") }; }
export default async function Terms() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="תנאי סחר" legal>
      <h2>זכאות</h2>
      <p>הפלטפורמה זמינה רק לעסקים שאימתנו ואישרנו. אתם מאשרים שהרכישות נעשות לצורכי העסק ושהמשתמש בחשבון מוסמך לחייב את החברה.</p>
      <h2>מחירים והצעות מחיר</h2>
      <p>המחירים המוצגים הם מחירון משוער לחשבונות מאושרים ואינם כוללים מע״מ ומשלוח, אלא אם צוין אחרת. הצעות מחיר תקפות עד תאריך התפוגה שצוין. המחיר הסופי הוא המחיר שבהזמנה המאושרת.</p>
      <h2>קבלת הזמנה</h2>
      <p>שליחת הזמנה היא הצעה לרכישה. ההזמנה מתקבלת כאשר אנו מאשרים אותה ומבקשים תשלום. אנו רשאים לדחות או לבטל הזמנות, למשל כשלא ניתן לאשר זמינות, כשהאימות לא הושלם או כשלא ניתן לאמת את התשלום.</p>
      <h2>זמינות</h2>
      <p>אלא אם מוצר מציין כמות מאושרת, הזמינות וזמני האספקה משוערים ומאושרים בבדיקת ההזמנה.</p>
      <h2>תשלום</h2>
      <p>התשלום יבוצע כמפורט בהזמנה המאושרת. הזמנה נחשבת משולמת רק לאחר שהתשלום אומת מול ספק התשלום או אושר כהתקבל על ידי מחלקת הכספים.</p>
      <h2>בעלות וסיכון</h2>
      <p>הבעלות עוברת עם קבלת התשלום המלא. הסיכון עובר לפי ה-Incoterm שסוכם, ואם לא סוכם — במסירה לקונה או למשלח מטעמו.</p>
      <h2>ציות לרגולציה</h2>
      <p>אתם אחראים לעמוד בדיני יבוא, יצוא, סנקציות ותקינת מוצרים החלים על המכירה או השימוש שלכם בסחורה.</p>
      <h2>סימני מסחר</h2>
      <p>שמות מותגים ומוצרים הם סימני מסחר של בעליהם. השימוש בהם בפלטפורמה נועד לזיהוי בלבד ואינו מעיד על מעמד של מפיץ מורשה.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="Terms of trade" legal>
      <h2>Eligibility</h2>
      <p>The platform is available only to businesses we have verified and approved. You confirm that purchases are made for business purposes and that the person using the account is authorised to bind your company.</p>
      <h2>Prices and quotations</h2>
      <p>Prices shown are indicative list prices for approved accounts and exclude tax and freight unless stated. Quotations are valid until the stated expiry date. Final prices are those shown on your confirmed order.</p>
      <h2>Order acceptance</h2>
      <p>Submitting an order is an offer to buy. An order is accepted when we confirm it and request payment. We may decline or cancel orders, for example where availability cannot be confirmed, verification is incomplete, or payment cannot be verified.</p>
      <h2>Availability</h2>
      <p>Unless a listing states a confirmed quantity, availability and lead times are indicative and confirmed during order review.</p>
      <h2>Payment</h2>
      <p>Payment is due as stated on the confirmed order. An order is treated as paid only once payment has been verified with the payment provider or confirmed as received by our finance team.</p>
      <h2>Title and risk</h2>
      <p>Title passes on receipt of full payment. Risk passes according to the agreed Incoterm or, if none, on delivery to the buyer or the buyer&apos;s forwarder.</p>
      <h2>Compliance</h2>
      <p>You are responsible for complying with import, export, sanctions and product regulations applicable to your onward sale or use of the goods.</p>
      <h2>Trademarks</h2>
      <p>Brand and product names are trademarks of their respective owners. Their use on this platform is for identification only and does not imply an authorised-distributor relationship.</p>
    </ContentPage>
  );
}
