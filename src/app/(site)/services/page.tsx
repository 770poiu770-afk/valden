import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Bulk buying", "קנייה בכמויות") }; }
export const dynamic = "force-dynamic";
export default async function Services() {
  const s = await getSettings();
  const mov = formatMoney(BigInt(s.minimumOrderValue.amountMinor), s.minimumOrderValue.currency).replace(/\.00$/, "");
  const { l } = await getT();
  const hasMin = s.minimumOrderValue.amountMinor > 0;
  const movEn = hasMin ? `The online minimum order value is currently ${mov}.` : "There is no minimum order value.";
  const movHe = hasMin ? <>סכום ההזמנה המינימלי באתר הוא כרגע <span className="num">{mov}</span>.</> : "אין סכום הזמנה מינימלי.";
  if (l === "he") return (
    <ContentPage title="קנייה בכמויות" intro="כל אחד יכול לקנות בכמויות — מחירי מדרגות אוטומטיים באתר, הצעות מחיר רשמיות להזמנות גדולות במיוחד, ותהליך מבוקר עד המשלוח.">
      <h2>הזמנה בכמויות באתר</h2>
      <p>כל בעל חשבון — פרטי או עסקי — מזמין ישירות מהקטלוג, מיחידה אחת ועד המלאי הזמין. בכל מוצר מוצגות מדרגות הכמות, ומחיר היחידה יורד אוטומטית כשהכמות מגיעה למדרגה. {movHe} הסכומים תמיד מחושבים על ידי המערכת שלנו בתשלום — לעולם לא לפי מה שהדפדפן שולח.</p>
      <h2>הצעות מחיר לכמויות גדולות</h2>
      <p>שלחו רשימת מק״טים, כמויות ומחירי יעד. צוות המכירות ישיב בהצעה רשמית עם תאריך תפוגה; אשרו אותה באתר והיא תהפוך להזמנה במחירים שסוכמו. הצעות מחיר מתאימות להקצאות חודשיות, פריסה בכמה אתרים ורכישות בהיקף של מכולות.</p>
      <h2>מחירי חוזה</h2>
      <p>קונים עסקיים קבועים יכולים לקבל מחירי יחידה חוזיים למוצרים מסוימים. החשבון שלכם תמיד משתמש במחיר הטוב מבין מחיר החוזה ומחיר מדרגת הכמות שפורסם.</p>
      <h2>מטבעות ותשלום</h2>
      <p>המחירים מנוהלים בדולר ואפשר להציג אותם ולקבל חשבונית בדולר, אירו או שקל, לפי שערי חליפין שמחלקת הכספים רושמת. התשלום ב-PayPal (בכפוף למגבלות ולזכאות של חשבון PayPal) או בהעברה בנקאית לפי חשבון עסקה. הזמנות מסומנות כמשולמות רק לאחר אימות התשלום.</p>
      <h2>לוגיסטיקה</h2>
      <p>בחרו במשלוח מבוטח שאנו מארגנים — שמתומחרת לאחר בדיקת ההזמנה — או באיסוף על ידי משלח מטעמכם. הערכות זמני אספקה הן זמניות עד לאישור בכתב. משלוחים, אסמכתאות ומספרי מעקב מופיעים בחשבון שלכם ברגע שהם נוצרים.</p>
      <h2>מסמכי יצוא</h2>
      <p>בתשלום נאספים תנאי Incoterms, היבואן והיצואן הרשומים, ומספרי המס של הנמען כשרלוונטי. חלק מהמוצרים, כמו ציוד תקשורת עם הצפנה, מחייבים בדיקת פיקוח על יצוא לפני המשלוח.</p>
      <p><Link className="link" href="/quote">בקשת הצעת מחיר</Link></p>
    </ContentPage>
  );
  return (
    <ContentPage title="Bulk buying" intro="Anyone can buy in bulk — automatic volume pricing online, formal quotations for very large orders, and a reviewed path to dispatch.">
      <h2>Bulk ordering online</h2>
      <p>Every account holder — personal or business — orders directly from the catalog, from one unit up to the available stock. Each listing shows its volume tiers, and the unit price steps down automatically when your quantity reaches a tier. {movEn} Totals are always calculated by our system at checkout — never taken from the browser.</p>
      <h2>Quotations for large volumes</h2>
      <p>Send a list of SKUs, quantities and target prices. Our trade desk returns a formal offer with an expiry date; accept it online and it becomes an order at the agreed prices. Quotations suit monthly allocations, multi-site rollouts and container-scale purchases.</p>
      <h2>Contract pricing</h2>
      <p>Regular business buyers can hold contract unit prices on specific listings. Your account always uses the better of your contract price and the published quantity-break price.</p>
      <h2>Currencies and payment</h2>
      <p>Prices are maintained in US dollars and can be displayed and invoiced in USD, EUR or ILS using exchange rates recorded by our finance team. Payment is by PayPal (subject to PayPal account limits and eligibility) or by bank transfer against a pro-forma invoice. Orders are only marked as paid once payment is verified.</p>
      <h2>Logistics</h2>
      <p>Choose insured freight arranged by us — quoted after order review — or collection by your own forwarder. Delivery estimates are provisional until confirmed in writing. Shipments, references and tracking numbers appear in your account as they are created.</p>
      <h2>Export documentation</h2>
      <p>Checkout captures Incoterms, importer and exporter of record, and consignee tax IDs where relevant. Some products, such as encryption-capable network equipment, require export-control screening before dispatch.</p>
      <p><Link className="link" href="/quote">Request a quote</Link></p>
    </ContentPage>
  );
}
