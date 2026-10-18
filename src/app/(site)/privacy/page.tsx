import { ContentPage } from "@/components/ContentPage";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Privacy policy", "מדיניות פרטיות") }; }
export default async function Privacy() {
  const { l } = await getT();
  if (l === "he") return (
    <ContentPage title="מדיניות פרטיות" legal>
      <h2>אילו נתונים אנו אוספים</h2>
      <p>פרטי החשבון (אימייל, שם, טלפון, מדינה וכתובות משלוח וחיוב), ואם בחרתם להוסיף — שם חברה ומספר עוסק/ח.פ., רשומות של הזמנות, הצעות מחיר ותשלומים, ויומנים טכניים הדרושים לאבטחת השירות.</p>
      <h2>נתוני תשלום</h2>
      <p>איננו אוספים או שומרים מספרי כרטיסי אשראי, קודי אבטחה או סיסמאות PayPal. ‏PayPal מעבדת את התשלומים; אנו שומרים רק מזהי עסקאות וסטטוסים הדרושים להתאמה.</p>
      <h2>למה אנו משתמשים בנתונים</h2>
      <ul>
        <li>כדי לתפעל את החשבון שלכם ולהוציא חשבוניות.</li>
        <li>כדי לטפל בהצעות מחיר, הזמנות, תשלומים, משלוחים והחזרים.</li>
        <li>כדי למנוע הונאות ולעמוד בחובות חוקיות, מס ופיקוח על יצוא.</li>
      </ul>
      <h2>מי רואה את הנתונים</h2>
      <p>עובדי Valden מורשים, לפי תפקידם, ונותני שירות הפועלים מטעמנו כמו מעבדי תשלומים, חברות שילוח וספקי אחסון. מסמכים שהועלו בעבר נשמרים באופן פרטי ואינם נגישים לציבור.</p>
      <h2>שמירה וזכויותיכם</h2>
      <p>אנו שומרים רשומות כל עוד הן נחוצות למטרות שלעיל וכנדרש בחוק. לבקשת עיון, תיקון או מחיקה של מידע אישי, פנו לשירות הלקוחות, בכפוף לחובות שמירה על פי דין.</p>
      <h2>עוגיות</h2>
      <p>אנו משתמשים בעוגיית התחברות הכרחית כדי לשמור על הכניסה לחשבון, ובעוגייה ששומרת את השפה שבחרתם. איננו משתמשים בעוגיות פרסום.</p>
    </ContentPage>
  );
  return (
    <ContentPage title="Privacy policy" legal>
      <h2>What we collect</h2>
      <p>Account details (email, name, phone, country and delivery/billing addresses), and — if you choose to add them — a company name and VAT/company number, order, quotation and payment records, and technical logs needed to secure the service.</p>
      <h2>Payment data</h2>
      <p>We do not collect or store card numbers, security codes or PayPal passwords. PayPal processes payments; we store only transaction identifiers and statuses needed for reconciliation.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To operate your account and issue invoices.</li>
        <li>To process quotations, orders, payments, shipments and refunds.</li>
        <li>To prevent fraud and meet legal, tax and export-control obligations.</li>
      </ul>
      <h2>Who can see it</h2>
      <p>Authorised Valden staff, according to their role, and service providers acting for us such as payment processors, carriers and hosting providers. Any documents uploaded in the past are stored privately and are not publicly accessible.</p>
      <h2>Retention and your rights</h2>
      <p>We retain records for as long as needed for the purposes above and as required by law. Contact customer service to request access to, correction of, or deletion of personal data, subject to legal retention requirements.</p>
      <h2>Cookies</h2>
      <p>We use a strictly necessary session cookie to keep you signed in, and a cookie that remembers your chosen language. We do not use advertising cookies.</p>
    </ContentPage>
  );
}
