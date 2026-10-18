import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { listQuotes } from "@/server/quotes";
import { Empty, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Quotes & offers", "הצעות מחיר") }; }
export default async function Quotes() {
  const actor = await requireApprovedBuyer();
  const list = await listQuotes(actor);
  const { l, t } = await getT();
  return (
    <div>
      <PageHeader title={t("Quotes & offers", "הצעות מחיר")} intro={t("Request negotiated pricing for volume purchases. Accepted offers become orders at the agreed prices.", "בקשו מחיר מותאם לרכישות בכמויות. הצעות שאושרו הופכות להזמנות במחירים שסוכמו.")} actions={<Link href="/portal/quotes/new" className="btn-deep">{t("New quote request", "בקשה חדשה להצעת מחיר")}</Link>} />
      {list.length === 0 ? <Empty title={t("No quote requests yet", "עדיין אין בקשות להצעת מחיר")} action={<Link href="/portal/quotes/new" className="btn-deep">{t("New quote request", "בקשה חדשה להצעת מחיר")}</Link>}>{t("Use quotations for large or recurring volumes, or for items not orderable online.", "השתמשו בהצעות מחיר לכמויות גדולות או חוזרות, או למוצרים שלא ניתן להזמין באתר.")}</Empty> : (
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}><table className="tbl min-w-[640px]">
          <thead><tr><th scope="col">{t("Quote", "הצעה")}</th><th scope="col">{t("Requested", "תאריך בקשה")}</th><th scope="col">{t("Status", "סטטוס")}</th><th scope="col">{t("Offer expires", "תוקף ההצעה")}</th><th scope="col" className="text-end">{t("Offer total (USD)", "סה״כ הצעה (דולר)")}</th></tr></thead>
          <tbody>{list.map((q) => (
            <tr key={q.id}><td><Link className="link" href={`/portal/quotes/${q.id}`}>{q.number}</Link></td><td>{fmtDate(q.createdAt, false, l)}</td><td><StatusPill status={q.status} l={l} /></td><td>{q.status === "OFFERED" ? fmtDate(q.offerExpiresAt, true, l) : "—"}</td><td className="text-end">{q.offerTotalBaseCents !== null ? <Money cents={q.offerTotalBaseCents} currency="USD" /> : "—"}</td></tr>
          ))}</tbody></table></div>
      )}
    </div>
  );
}
