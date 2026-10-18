import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { businessDocuments, companyStatusEvents, orders, quotes } from "@/db/schema";
import { currentActor } from "@/server/http";
import { cartCount } from "@/server/cart";
import { expireQuotes } from "@/server/quotes";
import { Empty, Money, Notice, PageHeader, Stat, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Dashboard", "לוח בקרה") }; }

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const sp = await searchParams;
  const { l, t } = await getT();

  if (actor.companyStatus !== "APPROVED") {
    const [events, docs] = await Promise.all([
      db.select().from(companyStatusEvents).where(eq(companyStatusEvents.companyId, actor.companyId)).orderBy(desc(companyStatusEvents.createdAt)),
      db.select().from(businessDocuments).where(eq(businessDocuments.companyId, actor.companyId)).orderBy(desc(businessDocuments.createdAt)),
    ]);
    const s = actor.companyStatus;
    const latestReason = events.find((e) => e.toStatus === s)?.reason;
    const steps = [
      { label: t("Application submitted", "הבקשה נשלחה"), done: true },
      { label: t("Verification by our trade desk", "אימות על ידי צוות המכירות"), done: false, current: s === "PENDING_REVIEW" || s === "MORE_INFO_REQUIRED" },
      { label: t("Wholesale access enabled", "גישה לסיטונאות נפתחה"), done: false },
    ];
    return (
      <div className="space-y-6">
        <PageHeader title={s === "REJECTED" ? t("Application not approved", "הבקשה לא אושרה") : s === "SUSPENDED" ? t("Account suspended", "החשבון מושעה") : t("Your application is under review", "הבקשה שלכם בבדיקה")}
          intro={s === "PENDING_REVIEW" ? t("We review every trade application manually. You will receive an email when pricing and ordering are enabled.", "אנחנו בודקים כל בקשה ידנית. תקבלו מייל כשמחירים והזמנות ייפתחו.") : undefined} />
        {sp.registered && <Notice tone="ok" title={t("Application received", "הבקשה התקבלה")}>{t("Thank you. Your company details and documents have been submitted.", "תודה. פרטי החברה והמסמכים נשלחו.")}</Notice>}
        {s === "MORE_INFO_REQUIRED" && <Notice tone="warn" title={t("More information needed", "נדרש מידע נוסף")}>{latestReason ?? t("Please check your email for details.", "פרטים נשלחו אליכם במייל.")} {t("Upload additional documents from", "אפשר להעלות מסמכים נוספים בעמוד")} <Link className="link" href="/portal/company">{t("Company & addresses", "חברה וכתובות")}</Link>.</Notice>}
        {(s === "REJECTED" || s === "SUSPENDED") && <Notice tone="bad">{latestReason ?? t("Contact the trade desk for details.", "לפרטים, פנו לצוות המכירות.")} <Link className="link" href="/contact?topic=Trade+account">{t("Contact the trade desk", "פנייה לצוות המכירות")}</Link>.</Notice>}
        {(s === "PENDING_REVIEW" || s === "MORE_INFO_REQUIRED") && (
          <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st.label} className={`p-5 ${st.current ? "bg-tag-soft" : "bg-white"}`}>
                <span className={`num mb-2 flex h-7 w-7 items-center justify-center rounded-sm text-sm font-bold ${st.done ? "bg-ok text-white" : st.current ? "bg-deep text-white" : "bg-paper text-steel-500 border border-line"}`}>{st.done ? "✓" : i + 1}</span>
                <p className="font-semibold text-deep-900">{st.label}</p>
                {st.current && <p className="text-sm text-steel-500">{t("In progress", "בתהליך")}</p>}
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold">{t("Verification history", "היסטוריית אימות")}</h2>
            <ul className="space-y-3 text-sm">{events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3"><div><StatusPill status={e.toStatus} l={l} />{e.reason && <p className="mt-1 text-steel-500" dir="auto">{e.reason}</p>}</div><span className="shrink-0 text-xs text-steel-500">{fmtDate(e.createdAt, true, l)}</span></li>
            ))}</ul>
          </section>
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold">{t("Documents submitted", "מסמכים שנשלחו")}</h2>
            <ul className="space-y-2 text-sm">{docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3"><span dir="auto">{d.docType}<span className="block text-xs text-steel-500">{d.originalName}</span></span><StatusPill l={l} status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "PENDING" ? t("Awaiting review", "ממתין לבדיקה") : d.status === "ACCEPTED" ? t("Accepted", "התקבל") : undefined} /></li>
            ))}</ul>
            <Link href="/portal/company" className="btn-outline btn-sm mt-4">{t("Upload another document", "העלאת מסמך נוסף")}</Link>
          </section>
        </div>
        <p className="text-sm text-steel-500">{l === "he" ? <>בינתיים אפשר <Link href="/catalog" className="link">לעיין בקטלוג</Link> — המחירים יופיעו לאחר האישור.</> : <>While you wait, you can <Link href="/catalog" className="link">browse the catalog</Link> — prices appear once you are approved.</>}</p>
      </div>
    );
  }

  await expireQuotes();
  const [recent, open, offers, lines] = await Promise.all([
    db.select().from(orders).where(eq(orders.companyId, actor.companyId)).orderBy(desc(orders.placedAt)).limit(6),
    db.select({ id: orders.id, status: orders.status }).from(orders).where(and(eq(orders.companyId, actor.companyId), inArray(orders.status, ["PENDING_REVIEW", "AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED"]))),
    db.select().from(quotes).where(and(eq(quotes.companyId, actor.companyId), inArray(quotes.status, ["SUBMITTED", "UNDER_REVIEW", "OFFERED"]))).orderBy(desc(quotes.updatedAt)),
    cartCount(actor.userId),
  ]);
  const awaiting = open.filter((o) => o.status === "AWAITING_PAYMENT").length;
  const liveOffers = offers.filter((q) => q.status === "OFFERED");
  return (
    <div className="space-y-8">
      <PageHeader title={t(`Welcome back, ${actor.fullName.split(" ")[0]}`, `שלום, ${actor.fullName.split(" ")[0]}`)} actions={<><Link href="/portal/bulk" className="btn-outline">{t("Bulk order builder", "הזמנה מרשימה")}</Link><Link href="/catalog" className="btn-deep">{t("Browse catalog", "לקטלוג")}</Link></>} />
      {awaiting > 0 && <Notice tone="warn" title={t(`${awaiting} order${awaiting > 1 ? "s" : ""} awaiting payment`, awaiting > 1 ? `${awaiting} הזמנות ממתינות לתשלום` : "הזמנה אחת ממתינה לתשלום")}>{t("Confirmed orders are held until payment is verified.", "הזמנות מאושרות מוחזקות עד לאימות התשלום.")} <Link className="link" href="/portal/orders">{t("View orders", "לצפייה בהזמנות")}</Link></Notice>}
      {liveOffers.length > 0 && <Notice tone="info" title={t("Offers waiting for your decision", "הצעות שממתינות להחלטה שלכם")}>{liveOffers.map((q) => <span key={q.id} className="me-3"><Link className="link" href={`/portal/quotes/${q.id}`}>{q.number}</Link> ({t("expires", "בתוקף עד")} {fmtDate(q.offerExpiresAt, false, l)})</span>)}</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={t("Open orders", "הזמנות פתוחות")} value={open.length} />
        <Stat label={t("Awaiting payment", "ממתינות לתשלום")} value={awaiting} />
        <Stat label={t("Open quote requests", "בקשות פתוחות להצעת מחיר")} value={offers.length} sub={t(`${liveOffers.length} with offers`, `${liveOffers.length} עם הצעה`)} />
        <Stat label={t("Lines in cart", "שורות בסל")} value={lines} />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="wide text-lg">{t("Recent orders", "הזמנות אחרונות")}</h2><Link className="link text-sm" href="/portal/orders">{t("All orders", "כל ההזמנות")}</Link></div>
        {recent.length === 0 ? <Empty title={t("No orders yet", "עדיין אין הזמנות")} action={<Link className="btn-deep" href="/catalog">{t("Start an order", "התחלת הזמנה")}</Link>}>{t("Add products from the catalog or paste a SKU list into the bulk order builder.", "הוסיפו מוצרים מהקטלוג או הדביקו רשימת מק״טים בהזמנה מרשימה.")}</Empty> : (
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
            <table className="tbl"><thead><tr><th scope="col">{t("Order", "הזמנה")}</th><th scope="col">{t("Placed", "תאריך")}</th><th scope="col">{t("Status", "סטטוס")}</th><th scope="col">{t("Payment", "תשלום")}</th><th scope="col" className="text-end">{t("Total", "סה״כ")}</th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id}><td><Link className="link" href={`/portal/orders/${o.id}`}>{o.number}</Link></td><td>{fmtDate(o.placedAt, false, l)}</td><td><StatusPill status={o.status} l={l} /></td><td><StatusPill status={o.paymentStatus} l={l} /></td><td className="text-end"><Money cents={o.totalCents} currency={o.currency} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
