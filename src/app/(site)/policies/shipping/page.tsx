import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Shipping policy", "מדיניות משלוחים") }; }
export default async function Shipping() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="מדיניות משלוחים" legal>
      <h2>אפשרויות משלוח</h2>
      <p>בתשלום בוחרים בין הובלה מבוטחת שמארגנת Valden לבין איסוף על ידי משלח מטעמכם. דמי הובלה, ביטוח וטיפול במשלוחים שמארגנת Valden נמסרים לאחר בדיקת ההזמנה ומתווספים להזמנה לפני בקשת התשלום.</p>
      <h2>הערכות זמני אספקה</h2>
      <p>כל מועד אספקה או זמן מעבר שאנו מוסרים הוא הערכה, אלא אם אישרנו אותו בכתב. בחשבון שלכם ההערכות מסומנות כזמניות עד לאישורן.</p>
      <h2>משלוחים חלקיים</h2>
      <p>הזמנה עשויה להישלח בכמה משלוחים. כל משלוח מופיע בחשבון עם אסמכתא, תכולה, ובמידת האפשר חברת השילוח ומספר מעקב.</p>
      <h2>טובין מוגבלים</h2>
      <p>מוצרים עם סוללות ליתיום נשלחים לפי כללי חומרים מסוכנים. חלק מציוד התקשורת והאבטחה מחייב בדיקת פיקוח על יצוא, וייתכן שלא ניתן לשלוח אותו לכל יעד.</p>
      <h2>מכס ומיסים</h2>
      <p>אלא אם נקבע אחרת בתנאי ה-Incoterm שסוכמו, מכס, מיסי יבוא ושחרור מהמכס ביעד באחריות הקונה.</p>
      <h2>בדיקה בעת קבלה</h2>
      <p>בדקו את המשלוח בעת ההגעה ורשמו כל נזק נראה לעין או חוסר במסמכי המוביל. דווחו על פערים לצוות המכירות בהקדם, עם תמונות ואסמכתת המשלוח.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="Shipping policy" legal>
      <h2>Shipping options</h2>
      <p>At checkout you choose either insured freight arranged by Valden or collection by your appointed forwarder. Freight, insurance and handling charges for Valden-arranged shipments are quoted after order review and added to your order before payment is requested.</p>
      <h2>Delivery estimates</h2>
      <p>Any delivery date or transit time we provide is an estimate unless we confirm it in writing. Estimates are marked as provisional in your account until confirmed.</p>
      <h2>Partial shipments</h2>
      <p>Orders may be dispatched in more than one shipment. Each shipment is listed in your account with its reference, contents and, when available, carrier and tracking number.</p>
      <h2>Restricted goods</h2>
      <p>Products containing lithium batteries are shipped under the applicable dangerous-goods rules. Some network and security equipment requires export-control screening and may not be shippable to all destinations.</p>
      <h2>Customs and duties</h2>
      <p>Unless your agreed Incoterm states otherwise, import duties, taxes and customs clearance at destination are the buyer&apos;s responsibility.</p>
      <h2>Inspection on arrival</h2>
      <p>Inspect deliveries on arrival and note any visible damage or shortage on the carrier&apos;s documents. Report discrepancies to the trade desk promptly with photographs and shipment reference.</p>
    </ContentPage>
  );
}
