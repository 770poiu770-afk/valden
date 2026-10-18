/** Hebrew labels for codes and catalog structure. English labels stay where they were defined. */
import type { Locale } from "./i18n";

export const STATUS_HE: Record<string, string> = {
  APPROVED: "מאושר", PENDING_REVIEW: "ממתין לבדיקה", MORE_INFO_REQUIRED: "נדרש מידע נוסף", REJECTED: "נדחה", SUSPENDED: "מושעה",
  AWAITING_PAYMENT: "ממתין לתשלום", PAID: "שולם", PROCESSING: "בטיפול", PARTIALLY_SHIPPED: "נשלח חלקית", SHIPPED: "נשלח", DELIVERED: "נמסר", CANCELLED: "בוטל",
  UNPAID: "לא שולם", PENDING: "בהמתנה", FAILED: "נכשל", PARTIALLY_REFUNDED: "הוחזר חלקית", REFUNDED: "הוחזר", DISPUTED: "במחלוקת",
  SUBMITTED: "נשלח", UNDER_REVIEW: "בבדיקה", OFFERED: "הוצעה הצעה", ACCEPTED: "התקבל", DECLINED: "נדחה", EXPIRED: "פג תוקף", CONVERTED: "הומר להזמנה", WITHDRAWN: "בוטל",
  CREATED: "נוצר", COMPLETED: "הושלם", REVERSED: "בוטל חיוב", NOT_REQUIRED: "לא נדרש",
  PREPARING: "בהכנה", READY: "מוכן", IN_TRANSIT: "בדרך", EXCEPTION: "תקלה", RETURNED: "הוחזר לשולח",
};
export function statusLabel(status: string, l: Locale = "en") {
  if (l === "he" && STATUS_HE[status]) return STATUS_HE[status];
  return status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
}

export const AVAILABILITY_HE: Record<string, string> = {
  INDICATIVE_AVAILABLE: "זמינות משוערת · לאישור",
  LIMITED_CONFIRM: "מוגבל · דורש אישור",
  BUILD_TO_ORDER: "בהרכבה לפי הזמנה",
  PRE_ORDER: "הזמנה מוקדמת",
  ON_REQUEST: "באספקה לפי בקשה",
  UNAVAILABLE: "לא זמין כרגע",
};
export const CONDITION_HE: Record<string, string> = { NEW: "חדש", REFURBISHED: "מחודש", USED: "משומש" };

export const CATEGORY_HE: Record<string, { name: string; description: string }> = {
  iphone: { name: "Apple iPhone", description: "iPhone 17 Pro,‏ 17 Pro Max,‏ iPhone Air ודורות קודמים מחודשים." },
  galaxy: { name: "Samsung Galaxy Ultra ומתקפלים", description: "דגלי Galaxy S Ultra ומכשירי Z Fold / Z Flip מתקפלים." },
  "gaming-desktops": { name: "מחשבי גיימינג", description: "מערכות גיימינג מובילות בהרכבת יצרן." },
  "custom-gaming-pcs": { name: "מחשבי ביצועים בהרכבה לפי הזמנה", description: "מערכות ביצועים קיצוניים בתצורה לפי הזמנה." },
  workstations: { name: "תחנות עבודה מקצועיות", description: "תחנות עבודה Xeon,‏ Threadripper PRO ו-Apple silicon לעבודה מקצועית." },
  laptops: { name: "MacBook Pro ומחשבים ניידים מתקדמים", description: "MacBook Pro, תחנות עבודה ניידות ומחשבי גיימינג ניידים מובילים." },
  "graphics-cards": { name: "כרטיסי מסך", description: "כרטיסי GeForce RTX סדרה 50 ו-RTX PRO Blackwell." },
  "cpus-motherboards": { name: "מעבדים ולוחות אם", description: "מעבדים לשולחן עבודה, HEDT ותחנות עבודה, עם לוחות אם תואמים." },
  "memory-storage": { name: "זיכרון ואחסון", description: "DDR5 בנפח גבוה, ECC RDIMM,‏ PCIe 5.0 ו-NVMe ארגוני." },
  monitors: { name: "מסכי OLED ומסכים מקצועיים", description: "מסכי גיימינג QD-OLED, מסכים רחבים ומסכי ייחוס מקצועיים." },
  tablets: { name: "iPad Pro וטאבלטים מתקדמים", description: "iPad Pro M5,‏ iPad Air וטאבלטים מובילים של Android ו-Windows." },
  networking: { name: "תקשורת ארגונית", description: "מתגים, רשתות אלחוטיות, שערי אבטחה ואחסון רשת." },
  creator: { name: "ציוד סטרימינג ויוצרי תוכן", description: "מצלמות קולנוע, הפקה חיה, אודיו ותאורה." },
  components: { name: "רכיבים ואביזרים", description: "ספקי כוח, קירור, מארזים, ציוד היקפי, תחנות עגינה והגנת חשמל." },
  audio: { name: "אוזניות ורמקולים", description: "אוזניות עם סינון רעשים, אוזניות אלחוטיות, רמקולים ניידים וביתיים ומקרני קול." },
  smartwatches: { name: "שעונים חכמים", description: "Apple Watch,‏ Galaxy Watch,‏ Pixel Watch ושעוני ספורט ושטח של Garmin." },
  chargers: { name: "מטענים וחשמל", description: "מטעני USB-C ו-GaN, מטענים אלחוטיים, סוללות ניידות וכבלי טעינה." },
  consoles: { name: "קונסולות ומכשירים ניידים", description: "קונסולות PlayStation,‏ Xbox ו-Nintendo, מחשבי גיימינג ניידים, בקרים ו-VR." },
};
export function categoryText(c: { slug: string; name: string; description?: string }, l: Locale) {
  const he = l === "he" ? CATEGORY_HE[c.slug] : undefined;
  return { name: he?.name ?? c.name, description: he?.description ?? c.description ?? "" };
}

export const DEPARTMENT_HE: Record<string, { name: string; description: string }> = {
  phones: { name: "טלפונים", description: "סמארטפונים מובילים ומתקפלים של iPhone ו-Samsung Galaxy." },
  computers: { name: "מחשבים", description: "מחשבים ניידים, תחנות עבודה, טאבלטים, מסכים, רכיבים, תקשורת וציוד ליוצרי תוכן." },
  audio: { name: "אוזניות ורמקולים", description: "אוזניות, אוזניות אלחוטיות ורמקולים." },
  gaming: { name: "גיימינג", description: "קונסולות, מכשירים ניידים, מחשבי גיימינג וכרטיסי מסך." },
  smartwatches: { name: "שעונים חכמים", description: "שעונים חכמים ושעוני ספורט." },
  chargers: { name: "מטענים", description: "מטענים, סוללות ניידות וכבלים." },
};
export function departmentText(d: { slug: string; name: string; description: string }, l: Locale) {
  const he = l === "he" ? DEPARTMENT_HE[d.slug] : undefined;
  return { name: he?.name ?? d.name, description: he?.description ?? d.description };
}

/** Hebrew for the default shipping methods and bank-transfer text; staff-customised text is shown as entered. */
const SHIPPING_HE: Record<string, { en: string; name: string; description: string }> = {
  VALDEN_FREIGHT: { en: "Insured freight arranged by Valden", name: "הובלה מבוטחת שמארגנת Valden", description: "דמי ההובלה, הביטוח והטיפול נמסרים על ידי מחלקת הלוגיסטיקה לאחר בדיקת ההזמנה." },
  BUYER_FORWARDER: { en: "Buyer's own forwarder (collection)", name: "משלח מטעם הקונה (איסוף)", description: "המשלח מטעמכם אוסף מנקודת המשלוח שסוכמה. ללא דמי הובלה מ-Valden." },
};
export function shippingText(m: { code: string; name: string; description: string }, l: Locale) {
  const he = l === "he" ? SHIPPING_HE[m.code] : undefined;
  return he && he.en === m.name ? { name: he.name, description: he.description } : { name: m.name, description: m.description };
}
const DEFAULT_TRANSFER_EN = "Bank transfer details are issued by our finance team on a pro-forma invoice once the order is confirmed. Payment is only recorded after funds are verified as received.";
export function transferText(s: string, l: Locale) {
  return l === "he" && s === DEFAULT_TRANSFER_EN ? "פרטי ההעברה הבנקאית נשלחים על ידי מחלקת הכספים בחשבון עסקה לאחר אישור ההזמנה. התשלום נרשם רק לאחר אימות קבלת הכסף." : s;
}

/** Hebrew names for verification document types (submitted values stay English). */
export const DOC_HE: Record<string, string> = {
  "Certificate of incorporation / business registration": "תעודת התאגדות / רישום עסק",
  "VAT / tax registration certificate": "תעודת עוסק מורשה / רישום במע״מ",
  "Trade or import licence": "רישיון סחר או יבוא",
  "Proof of business address": "אישור כתובת העסק",
  "Authorised signatory identification": "זיהוי מורשה החתימה",
  "Other supporting document": "מסמך תומך אחר",
};
