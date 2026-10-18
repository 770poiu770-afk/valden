/**
 * Hebrew versions of buyer-facing server messages (API errors, cart issues, success messages).
 * Services keep producing English; the API layer translates for Hebrew visitors. Staff-only messages
 * are not listed because the admin portal is English-only. Unknown messages fall back to English.
 */
import type { Locale } from "./i18n";

const EXACT: Record<string, string> = {
  "Please sign in to continue.": "יש להתחבר כדי להמשיך.",
  "You do not have permission to perform this action.": "אין לכם הרשאה לבצע פעולה זו.",
  "Not found.": "לא נמצא.",
  "Too many requests. Please wait and try again.": "יותר מדי בקשות. המתינו ונסו שוב.",
  "Something went wrong. Our team has been notified.": "משהו השתבש. הצוות שלנו קיבל התראה.",
  "Malformed request body.": "הבקשה אינה תקינה.",
  "Invalid input.": "הקלט אינו תקין.",
  "Request body too large.": "הבקשה גדולה מדי.",
  "Missing origin.": "הבקשה נחסמה מטעמי אבטחה. רעננו את הדף ונסו שוב.",
  "Invalid origin.": "הבקשה נחסמה מטעמי אבטחה. רעננו את הדף ונסו שוב.",
  "Cross-origin request blocked.": "הבקשה נחסמה מטעמי אבטחה. רעננו את הדף ונסו שוב.",
  // sign-in and accounts
  "Email or password is incorrect.": "המייל או הסיסמה שגויים.",
  "Too many failed attempts. The account is locked for 15 minutes.": "יותר מדי ניסיונות כושלים. החשבון נעול ל-15 דקות.",
  "This account is deactivated. Contact the trade desk.": "החשבון הושבת. פנו לצוות המכירות.",
  "An account with this email already exists. Sign in or reset your password.": "כבר קיים חשבון עם המייל הזה. היכנסו או אפסו את הסיסמה.",
  "Please upload at least one business verification document.": "יש להעלות לפחות מסמך אחד לאימות העסק.",
  "Upload at most 6 documents.": "אפשר להעלות עד 6 מסמכים.",
  "Only PDF, PNG or JPEG documents are accepted.": "אפשר להעלות רק מסמכי PDF,‏ PNG או JPEG.",
  "The file content does not match its declared type.": "תוכן הקובץ אינו תואם לסוג הקובץ.",
  "The uploaded file is empty.": "הקובץ שהועלה ריק.",
  "No file received.": "לא התקבל קובץ.",
  "Choose a file to upload.": "בחרו קובץ להעלאה.",
  "Choose a document type.": "בחרו סוג מסמך.",
  "This reset link is invalid or has expired. Please request a new one.": "קישור האיפוס אינו תקין או שפג תוקפו. בקשו קישור חדש.",
  "Your business account must be approved first.": "החשבון העסקי צריך להיות מאושר קודם.",
  "Keep at least one address of each type.": "יש להשאיר לפחות כתובת אחת מכל סוג.",
  "Company not found.": "החברה לא נמצאה.",
  // cart and checkout
  "Your cart is empty.": "הסל ריק.",
  "Minimum order value not reached.": "לא הגעתם לסכום ההזמנה המינימלי.",
  "A product in your list is no longer available.": "מוצר ברשימה כבר אינו זמין.",
  "Line not in cart.": "השורה אינה בסל.",
  "No lines supplied.": "לא נשלחו שורות.",
  "Quantities must be whole numbers.": "הכמויות צריכות להיות מספרים שלמים.",
  "Too many lines in one request (max 500).": "יותר מדי שורות בבקשה אחת (עד 500).",
  "Unknown product slug.": "המוצר לא נמצא.",
  "Unknown shipping method.": "שיטת משלוח לא מוכרת.",
  "Your cart is empty — this order may already have been placed.": "הסל ריק — ייתכן שההזמנה כבר בוצעה.",
  "Your order cannot be placed yet.": "עדיין לא ניתן לבצע את ההזמנה.",
  "Please choose a valid delivery and billing address from your company profile.": "בחרו כתובת משלוח וכתובת חיוב תקינות מפרופיל החברה.",
  "No exchange rate configured for the selected currency.": "לא הוגדר שער חליפין למטבע שנבחר.",
  "Checkout in this currency is temporarily unavailable: exchange rate has not been verified.": "תשלום במטבע זה אינו זמין כרגע: שער החליפין טרם אומת.",
  "Order not found.": "ההזמנה לא נמצאה.",
  "This order can no longer be cancelled online. Contact the trade desk.": "כבר לא ניתן לבטל את ההזמנה באתר. פנו לצוות המכירות.",
  "A payment is in progress or completed for this order. Contact the trade desk to cancel with a refund.": "יש תשלום בתהליך או שהושלם להזמנה זו. לביטול עם החזר כספי, פנו לצוות המכירות.",
  // payments
  "PayPal payments are currently disabled.": "תשלומי PayPal מושבתים כרגע.",
  "PayPal is not configured for this environment yet. Please choose bank transfer or contact the trade desk.": "PayPal עדיין לא הוגדר בסביבה זו. בחרו העברה בנקאית או פנו לצוות המכירות.",
  "Payments are temporarily unavailable. Please contact the trade desk.": "התשלומים אינם זמינים כרגע. פנו לצוות המכירות.",
  "This order is set to bank transfer.": "ההזמנה מוגדרת לתשלום בהעברה בנקאית.",
  "A payment for this order is already pending or completed.": "כבר קיים תשלום בהמתנה או שהושלם להזמנה זו.",
  "This order total exceeds the PayPal limit configured for the store. Please switch to bank transfer.": "סכום ההזמנה חורג מתקרת ה-PayPal של האתר. עברו לתשלום בהעברה בנקאית.",
  "Payment is being initialised. Please retry in a moment.": "התשלום בהכנה. נסו שוב בעוד רגע.",
  "PayPal could not create the payment. Please try again or choose bank transfer.": "PayPal לא הצליחה ליצור את התשלום. נסו שוב או בחרו העברה בנקאית.",
  "Payment not found for this order.": "לא נמצא תשלום להזמנה זו.",
  "This payment attempt is closed. Please start a new payment.": "ניסיון התשלום הזה נסגר. התחילו תשלום חדש.",
  "The payment could not be completed. No funds were captured. Please try again.": "לא ניתן היה להשלים את התשלום. לא נגבה כסף. נסו שוב.",
  "PayPal could not complete the capture. Try again shortly.": "PayPal לא השלימה את הגבייה. נסו שוב בעוד מעט.",
  "Payment method can no longer be changed.": "כבר לא ניתן לשנות את אמצעי התשלום.",
  "PayPal is not available for this order.": "PayPal אינו זמין להזמנה זו.",
  "Bank transfer is not available.": "העברה בנקאית אינה זמינה.",
  "Bank transfer is not enabled.": "העברה בנקאית אינה מופעלת.",
  "PayPal is not enabled. Choose bank transfer.": "PayPal אינו מופעל. בחרו העברה בנקאית.",
  // quotes
  "Quote not found.": "הצעת המחיר לא נמצאה.",
  "This offer has expired. Ask the trade desk to re-issue it.": "תוקף ההצעה פג. בקשו מצוות המכירות להנפיק אותה מחדש.",
  // success messages returned by the API
  "Saved.": "נשמר.",
  "Freight, insurance and delivery estimate to be confirmed by our logistics desk.": "דמי ההובלה, הביטוח והערכת האספקה יאושרו על ידי מחלקת הלוגיסטיקה.",
  "Payment recorded.": "התשלום נרשם.",
};

const PATTERNS: [RegExp, (...m: string[]) => string][] = [
  [/^(.+): minimum order quantity is (\d+) units\.$/, (n, q) => `${n}: כמות ההזמנה המינימלית היא ${q} יח׳.`],
  [/^(.+): order in multiples of (\d+) units \(case pack\)\.$/, (n, q) => `${n}: יש להזמין בכפולות של ${q} יח׳ (אריזה).`],
  [/^(.+): quantity must be a positive whole number\.$/, (n) => `${n}: הכמות צריכה להיות מספר שלם וחיובי.`],
  [/^(.+): quantity exceeds the per-line limit of 100,000 units\. Please request a quote\.$/, (n) => `${n}: הכמות חורגת מהמגבלה של 100,000 יח׳ לשורה. בקשו הצעת מחיר.`],
  [/^(.+): only (\d+) units confirmed available\.$/, (n, q) => `${n}: רק ${q} יח׳ מאושרות במלאי.`],
  [/^(.+): this SKU is no longer offered\.$/, (n) => `${n}: מק״ט זה כבר אינו מוצע.`],
  [/^(.+): not currently orderable online( \(pricing under review\))? — please request a quote\.$/, (n, r) => `${n}: לא ניתן להזמין באתר כרגע${r ? " (המחיר בבדיקה)" : ""} — בקשו הצעת מחיר.`],
  [/^No exchange rate is configured for (\w+)\. Choose another currency or contact the trade desk\.$/, (c) => `לא הוגדר שער חליפין ל-${c}. בחרו מטבע אחר או פנו לצוות המכירות.`],
  [/^Minimum order value cannot be evaluated: no (\w+) exchange rate configured\.$/, (c) => `לא ניתן לבדוק את סכום ההזמנה המינימלי: לא הוגדר שער חליפין ל-${c}.`],
  [/^Unknown or inactive SKU: (.+)$/, (s) => `מק״ט לא מוכר או לא פעיל: ${s}`],
  [/^Invalid quantity for (.+)\.$/, (s) => `כמות לא תקינה עבור ${s}.`],
  [/^Quantity for (.+) exceeds 100,000 units\.$/, (s) => `הכמות עבור ${s} חורגת מ-100,000 יח׳.`],
  [/^Files must be (\d+)MB or smaller\.$/, (m) => `גודל הקבצים צריך להיות עד ${m}MB.`],
  [/^Quote is (\w+); it cannot be accepted\.$/, () => "לא ניתן לאשר את הצעת המחיר במצבה הנוכחי."],
  [/^Order is (\w+); payment is not possible\.$/, () => "לא ניתן לשלם על ההזמנה במצבה הנוכחי."],
  [/^This order is still being reviewed by our trade desk\. You will be notified when payment can be made\.$/, () => "ההזמנה עדיין בבדיקה של צוות המכירות. תקבלו הודעה כשאפשר יהיה לשלם."],
  [/^This order exceeds the PayPal limit configured for this store \((.+)\)\. Choose bank transfer\.?$/, (a) => `ההזמנה חורגת מתקרת ה-PayPal של האתר (${a}). בחרו העברה בנקאית.`],
  [/^(\d+) lines? added to (?:your )?cart\.?$/, (n) => `${n} שורות נוספו לסל.`],
  // order history (stored in English, shown to buyers)
  [/^Order received\. Awaiting availability, freight and account review before payment is requested\.$/, () => "ההזמנה התקבלה. ממתינה לבדיקת זמינות, משלוח וחשבון לפני בקשת תשלום."],
  [/^Order received and confirmed\. Awaiting payment\.$/, () => "ההזמנה התקבלה ואושרה. ממתינה לתשלום."],
  [/^Order confirmed by trade desk\. Freight: (\S+)\. Total due: (\S+)\.(?: Delivery estimate \(provisional\): (.+))?$/, (f, tot, est) => `צוות המכירות אישר את ההזמנה. משלוח: ${f}. לתשלום: ${tot}.${est ? ` הערכת אספקה (זמנית): ${est}` : ""}`],
  [/^Order declined: (.+)$/, (r) => `ההזמנה נדחתה: ${r}`],
  [/^Order cancelled( by buyer| by trade desk)(?:: (.+))?\.$/, (who, r) => `ההזמנה בוטלה ${who === " by buyer" ? "על ידי הקונה" : "על ידי צוות המכירות"}${r ? `: ${r}` : ""}.`],
  [/^Order is being prepared for dispatch\.$/, () => "ההזמנה בהכנה למשלוח."],
  [/^Shipment (\S+) created \((\d+) units\)\.$/, (ref, n) => `משלוח ${ref} נוצר (${n} יח׳).`],
  [/^Shipment (\S+): (.+)\.$/, (ref, st) => `משלוח ${ref}: ${({ preparing: "בהכנה", ready: "מוכן", "in transit": "בדרך", delivered: "נמסר", exception: "תקלה", cancelled: "בוטל" } as Record<string, string>)[st] ?? st}.`],
  [/^Order status: (.+)\.$/, (st) => `סטטוס ההזמנה: ${({ "partially shipped": "נשלחה חלקית", shipped: "נשלחה", delivered: "נמסרה", processing: "בטיפול", paid: "שולמה" } as Record<string, string>)[st] ?? st}.`],
  [/^Payment of (\S+) received via PayPal and verified\.$/, (a) => `תשלום של ${a} התקבל ב-PayPal ואומת.`],
  [/^Bank transfer of (\S+) verified as received by finance\.$/, (a) => `מחלקת הכספים אימתה קבלת העברה בנקאית של ${a}.`],
  [/^PayPal payment was cancelled\. Nothing was charged; the order is still awaiting payment\.$/, () => "תשלום ה-PayPal בוטל. לא נגבה כסף; ההזמנה עדיין ממתינה לתשלום."],
  [/^PayPal declined the payment\. No funds were collected\. You may retry or choose bank transfer\.$/, () => "PayPal דחתה את התשלום. לא נגבה כסף. אפשר לנסות שוב או לבחור העברה בנקאית."],
  [/^PayPal payment could not be completed\. You can try again or switch to bank transfer\.$/, () => "לא ניתן היה להשלים את תשלום ה-PayPal. אפשר לנסות שוב או לעבור להעברה בנקאית."],
  [/^PayPal reports the payment as pending(?: \((.+)\))?\. The order will proceed once PayPal confirms completion\.$/, (r) => `PayPal מדווחת שהתשלום בהמתנה${r ? ` (${r})` : ""}. ההזמנה תתקדם לאחר ש-PayPal תאשר את השלמתו.`],
  [/^Payment method changed to (PayPal|bank transfer)\.$/, (m) => `אמצעי התשלום שונה ל${m === "PayPal" ? "-PayPal" : "העברה בנקאית"}.`],
  [/^Refund of (\S+) issued via PayPal\.$/, (a) => `בוצע החזר של ${a} דרך PayPal.`],
  [/^Refund of (\S+) confirmed by PayPal\.$/, (a) => `PayPal אישרה החזר של ${a}.`],
  [/^Refund of (\S+) recorded \(bank transfer\)\.$/, (a) => `נרשם החזר של ${a} (העברה בנקאית).`],
  [/^Order cancelled following full refund\.$/, () => "ההזמנה בוטלה בעקבות החזר מלא."],
];

/** Translate a server message for display. Field-prefixed validation errors ("email: Invalid email") are generalised. */
export function trMessage(msg: string | undefined | null, l: Locale): string | undefined {
  if (msg == null) return undefined;
  if (l !== "he") return msg;
  if (EXACT[msg]) return EXACT[msg];
  for (const [re, f] of PATTERNS) {
    const m = msg.match(re);
    if (m) return f(...m.slice(1));
  }
  if (/^[\w.]+: /.test(msg) && /(Invalid|Required|Expected|String must|Number must|too_small|too_big)/i.test(msg)) return "אחד השדות אינו תקין. בדקו את הטופס ונסו שוב.";
  return msg;
}
