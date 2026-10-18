import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Frequently asked questions", "שאלות נפוצות") }; }
const QA: [string, string][] = [
  ["Who can buy from Valden?", "Anyone. Individual shoppers, small businesses, retailers, resellers and corporate buyers all use the same simple account — just an email and a password."],
  ["Do I need a company or company documents to buy?", "No. Business details (company name, VAT/company number) are optional and only appear on your invoices if you add them. No documents or approval are needed."],
  ["Can I buy a single item?", "Yes. You can order one unit of any product that is in stock."],
  ["How does bulk pricing work?", "Each product shows its volume tiers. When your quantity reaches a tier, the lower unit price applies automatically and the total updates in your cart. If your account has a contract price, you automatically pay the lower of the two."],
  ["Is there a maximum quantity?", "You can order up to the available stock. For very large quantities we may confirm availability or offer a formal quotation before payment."],
  ["Is the stock shown live?", "Unless a listing states that a quantity is confirmed, availability is indicative and is confirmed before payment is requested."],
  ["Why is my order reviewed before I pay?", "We confirm stock, price the delivery for your address and run fraud checks first, so you are only asked to pay once we know we can deliver. You are notified as soon as payment can be made."],
  ["How do I pay?", "By PayPal where PayPal supports your order and account, or by bank transfer. An order is only marked paid after the payment is verified."],
  ["Do prices include VAT?", "Prices are shown before VAT and delivery unless stated otherwise. VAT and delivery are shown separately at checkout and on your invoice."],
  ["Which currencies can I pay in?", "USD, EUR and ILS. Prices are maintained in USD and converted at exchange rates recorded by our finance team; the rate used is stored on your order."],
  ["Can I cancel an order or return a product?", "You can cancel online while the order is under review or awaiting payment. After delivery, see our returns policy — including the statutory cancellation rights for consumers."],
  ["Are you an authorised distributor for these brands?", "Not unless a specific listing says so. Valden is independent; brand names are trademarks of their owners."],
];
const QA_HE: [string, string][] = [
  ["מי יכול לקנות ב-Valden?", "כולם. לקוחות פרטיים, עסקים קטנים, חנויות, משווקים ורוכשים בארגונים משתמשים באותו חשבון פשוט — רק אימייל וסיסמה."],
  ["צריך חברה או מסמכי חברה כדי לקנות?", "לא. פרטי עסק (שם חברה, מספר עוסק/ח.פ.) הם רשות ויופיעו בחשבונית רק אם תוסיפו אותם. לא נדרשים מסמכים או אישור."],
  ["אפשר לקנות פריט אחד?", "כן. אפשר להזמין יחידה אחת מכל מוצר שבמלאי."],
  ["איך עובדים מחירי כמות?", "בכל מוצר מוצגות מדרגות הכמות. כשהכמות מגיעה למדרגה, מחיר היחידה הנמוך יותר חל אוטומטית והסכום מתעדכן בסל. אם לחשבון שלכם יש מחיר חוזה, תשלמו אוטומטית את הנמוך מבין השניים."],
  ["יש כמות מקסימלית?", "אפשר להזמין עד המלאי הזמין. בכמויות גדולות מאוד ייתכן שנאשר זמינות או נציע הצעת מחיר רשמית לפני התשלום."],
  ["המלאי שמוצג הוא בזמן אמת?", "אלא אם מוצר מציין כמות מאושרת, הזמינות משוערת ומאושרת לפני בקשת התשלום."],
  ["למה ההזמנה נבדקת לפני התשלום?", "קודם אנחנו מאשרים מלאי, מתמחרים את המשלוח לכתובת שלכם ומבצעים בדיקות נגד הונאה — כך שתתבקשו לשלם רק כשברור שנוכל לספק. תקבלו הודעה ברגע שאפשר לשלם."],
  ["איך משלמים?", "ב-PayPal, כש-PayPal תומכת בהזמנה ובחשבון שלכם, או בהעברה בנקאית. הזמנה מסומנת כמשולמת רק לאחר אימות התשלום."],
  ["המחירים כוללים מע״מ?", "המחירים מוצגים לפני מע״מ ומשלוח, אלא אם צוין אחרת. המע״מ והמשלוח מוצגים בנפרד בתשלום ובחשבונית."],
  ["באילו מטבעות אפשר לשלם?", "דולר, אירו ושקל. המחירים מנוהלים בדולר ומומרים לפי שערי חליפין שמחלקת הכספים רושמת; השער שבו השתמשנו נשמר בהזמנה."],
  ["אפשר לבטל הזמנה או להחזיר מוצר?", "אפשר לבטל באתר כל עוד ההזמנה בבדיקה או ממתינה לתשלום. אחרי האספקה, ראו את מדיניות ההחזרות — כולל זכות הביטול של צרכנים על פי חוק."],
  ["אתם מפיץ מורשה של המותגים האלה?", "לא, אלא אם מוצר מסוים מציין זאת. ‏Valden עצמאית; שמות המותגים הם סימני מסחר של בעליהם."],
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
