import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { companyStatusEvents, orders, quotes } from "@/db/schema";
import { currentActor } from "@/server/http";
import { cartCount } from "@/server/cart";
import { expireQuotes } from "@/server/quotes";
import { Empty, Money, Notice, PageHeader, Stat, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";
import { accountActive } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Dashboard", "לוח בקרה") }; }

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const sp = await searchParams;
  const { l, t } = await getT();

  if (!accountActive(actor.companyStatus)) {
    // Only suspended or closed accounts are blocked in the open store.
    const events = await db.select().from(companyStatusEvents).where(eq(companyStatusEvents.companyId, actor.companyId)).orderBy(desc(companyStatusEvents.createdAt));
    const s = actor.companyStatus;
    const latestReason = events.find((e) => e.toStatus === s)?.reason;
    return (
      <div className="space-y-6">
        <PageHeader title={s === "REJECTED" ? t("Account closed", "החשבון סגור") : t("Account suspended", "החשבון מושעה")} />
        <Notice tone="bad"><span dir="auto">{latestReason ?? t("Please contact us for details.", "לפרטים, פנו אלינו.")}</span> <Link className="link" href="/contact?topic=Order+support">{t("Contact us", "צור קשר")}</Link>.</Notice>
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
      {sp.welcome && <Notice tone="ok" title={t("Your account is ready", "החשבון שלכם מוכן")}>{t("You can order right away — a single unit or in bulk. Your delivery address is asked for at checkout.", "אפשר להזמין מיד — יחידה אחת או בכמויות. כתובת המשלוח תתבקש בתשלום.")}</Notice>}
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
