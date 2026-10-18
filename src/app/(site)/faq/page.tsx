import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Frequently asked questions", "שאלות נפוצות") }; }
const QA: [string, string][] = [
  ["Who can buy from Valden?", "Registered businesses only: wholesalers, distributors, retail chains, electronics retailers, hardware resellers, importers and exporters, and corporate IT procurement teams. We do not sell to consumers."],
  ["Why can't I see prices?", "Wholesale pricing is shown only to approved trade accounts. Register your business and we will review your application; prices appear as soon as you are approved."],
  ["What documents do you need?", "A business registration certificate or equivalent, plus a VAT/tax registration where applicable. We may ask for proof of address or identification of the authorised signatory."],
  ["Is there a minimum order?", "Yes. Each listing has a minimum order quantity, and online orders have a minimum order value shown at checkout. Larger programmes are handled by quotation."],
  ["Is the stock shown live?", "No. Unless a listing states that a quantity is confirmed, availability is indicative and is confirmed by our trade desk before payment is requested."],
  ["How do quantity breaks work?", "Unit prices step down at multiples of the minimum order quantity. If your company has a contract price, you automatically pay the lower of the two."],
  ["How do I pay?", "By PayPal where your order is within the store's PayPal limit and PayPal supports your account, or by bank transfer against a pro-forma invoice. An order is only marked paid after the payment is verified."],
  ["Can I pay a ₪300,000 order by PayPal?", "Possibly, but PayPal applies its own limits and eligibility rules. Orders above the configured PayPal limit are paid by bank transfer."],
  ["Which currencies do you invoice in?", "USD, EUR and ILS. Prices are maintained in USD and converted at exchange rates recorded by our finance team; the rate used is stored on your order."],
  ["How is freight priced?", "Insured freight arranged by us is quoted after order review. Alternatively, your own forwarder can collect. Delivery estimates are provisional until confirmed."],
  ["Can I cancel an order?", "Yes, online, while the order is under review or awaiting payment. After payment, contact the trade desk; refunds are issued to the original payment method."],
  ["Are you an authorised distributor for these brands?", "Not unless a specific listing says so. Valden is an independent distributor; brand names are trademarks of their owners."],
];
const QA_HE: [string, string][] = [
  ["מי יכול לקנות ב-Valden?", "עסקים רשומים בלבד: סיטונאים, מפיצים, רשתות קמעונאות, חנויות אלקטרוניקה, משווקי חומרה, יבואנים ויצואנים, וצוותי רכש IT בארגונים. איננו מוכרים לצרכנים פרטיים."],
  ["למה אני לא רואה מחירים?", "מחירי סיטונאות מוצגים רק לחשבונות עסקיים מאושרים. רשמו את העסק ואנחנו נבדוק את הבקשה; המחירים יופיעו מיד לאחר האישור."],
  ["אילו מסמכים נדרשים?", "תעודת רישום עסק או מקבילה, ותעודת עוסק מורשה / רישום במע״מ אם רלוונטי. ייתכן שנבקש אישור כתובת או זיהוי של מורשה החתימה."],
  ["יש הזמנה מינימלית?", "כן. לכל מוצר יש כמות הזמנה מינימלית, ולהזמנות באתר יש סכום מינימלי שמוצג בתשלום. פרויקטים גדולים מטופלים בהצעת מחיר."],
  ["המלאי שמוצג הוא בזמן אמת?", "לא. אלא אם מוצר מציין כמות מאושרת, הזמינות משוערת וצוות המכירות מאשר אותה לפני בקשת התשלום."],
  ["איך עובדות מדרגות הכמות?", "מחיר היחידה יורד בכפולות של כמות ההזמנה המינימלית. אם לחברה שלכם יש מחיר חוזה, תשלמו אוטומטית את הנמוך מבין השניים."],
  ["איך משלמים?", "ב-PayPal, כשההזמנה בתוך תקרת ה-PayPal של האתר ו-PayPal תומכת בחשבון שלכם, או בהעברה בנקאית לפי חשבון עסקה. הזמנה מסומנת כמשולמת רק לאחר אימות התשלום."],
  ["אפשר לשלם הזמנה של ₪300,000 ב-PayPal?", "ייתכן, אבל PayPal מפעילה מגבלות וכללי זכאות משלה. הזמנות מעל תקרת ה-PayPal שהוגדרה משולמות בהעברה בנקאית."],
  ["באילו מטבעות מוציאים חשבונית?", "דולר, אירו ושקל. המחירים מנוהלים בדולר ומומרים לפי שערי חליפין שמחלקת הכספים רושמת; השער שבו השתמשנו נשמר בהזמנה."],
  ["איך מתומחר המשלוח?", "הובלה מבוטחת שאנו מארגנים מתומחרת לאחר בדיקת ההזמנה. לחלופין, משלח מטעמכם יכול לאסוף. הערכות זמני אספקה הן זמניות עד לאישור."],
  ["אפשר לבטל הזמנה?", "כן, באתר, כל עוד ההזמנה בבדיקה או ממתינה לתשלום. לאחר התשלום, פנו לצוות המכירות; החזרים מבוצעים לאמצעי התשלום המקורי."],
  ["אתם מפיץ מורשה של המותגים האלה?", "לא, אלא אם מוצר מסוים מציין זאת. ‏Valden היא מפיצה עצמאית; שמות המותגים הם סימני מסחר של בעליהם."],
];
export default async function Faq() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="שאלות נפוצות">
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {QA_HE.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold text-deep-900 marker:hidden">{q}</summary>
            <p className="mb-0 mt-2 text-steel">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
  return (
    <ContentPage title="Frequently asked questions">
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {QA.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold text-deep-900 marker:hidden">{q}</summary>
            <p className="mb-0 mt-2 text-steel">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
