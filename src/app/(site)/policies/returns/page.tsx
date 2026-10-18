import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Returns and refunds", "החזרות והחזרים כספיים") }; }
export default async function Returns() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="החזרות והחזרים כספיים" legal>
      <h2>מכירה עסקית</h2>
      <p>המכירות הן בין עסקים (B2B). זכויות ביטול של צרכנים אינן חלות. החזרות מתקבלות כאשר הסחורה פגומה, ניזוקה בהובלה או אינה תואמת את ההזמנה, בכפוף לתנאים שלהלן.</p>
      <h2>איך מבקשים החזרה</h2>
      <ul>
        <li>פנו לצוות המכירות עם מספר ההזמנה, המק״טים והכמויות הרלוונטיים, וראיות כמו תמונות.</li>
        <li>אין להחזיר סחורה ללא אישור החזרה; החזרות ללא אישור עלולות להידחות.</li>
        <li>יש להחזיר את הסחורה באריזתה המקורית עם כל האביזרים והמסמכים.</li>
      </ul>
      <h2>החזרים כספיים</h2>
      <p>החזרים מאושרים מבוצעים לאמצעי התשלום המקורי — דרך PayPal לתשלומי PayPal, או בהעברה בנקאית לתשלומים שבוצעו בהעברה. החזרים חלקיים אפשריים בהחזרה חלקית או בהתאמת מחיר. ההחזרים מופיעים בהיסטוריית ההזמנה לאחר הביצוע.</p>
      <h2>תביעות אחריות</h2>
      <p>תנאי אחריות היצרן משתנים לפי מוצר, אזור וערוץ מכירה ומאושרים בהצעה או במסמכי ההזמנה. נעזור להפנות תביעות אחריות לערוץ השירות הנכון.</p>
      <h2>ביטולים</h2>
      <p>אפשר לבטל הזמנה באתר כל עוד היא בבדיקה או ממתינה לתשלום. לאחר התשלום, ביטול נתון לשיקול דעתנו ובכפוף לעלויות שכבר נגרמו.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="Returns and refunds" legal>
      <h2>Trade sales</h2>
      <p>Sales are business-to-business. Consumer cooling-off rights do not apply. Returns are accepted where goods are defective, damaged in transit, or not what was ordered, subject to the conditions below.</p>
      <h2>How to request a return</h2>
      <ul>
        <li>Contact the trade desk with the order number, affected SKUs and quantities, and evidence such as photographs.</li>
        <li>Do not return goods without a return authorisation; unauthorised returns may be refused.</li>
        <li>Returned goods must be in their original packaging with all accessories and documentation.</li>
      </ul>
      <h2>Refunds</h2>
      <p>Approved refunds are issued to the original payment method — through PayPal for PayPal payments, or by bank transfer for bank-transfer payments. Partial refunds may be issued for partial returns or price adjustments. Refunds appear in your order history once processed.</p>
      <h2>Warranty claims</h2>
      <p>Manufacturer warranty terms vary by product, region and channel and are confirmed in your offer or order documents. We will help direct warranty claims to the correct service channel.</p>
      <h2>Cancellations</h2>
      <p>You can cancel an order online while it is under review or awaiting payment. After payment, cancellation is at our discretion and subject to any costs already incurred.</p>
    </ContentPage>
  );
}
