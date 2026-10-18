import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { listCompanyOrders } from "@/server/orders";
import { Empty, Money, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { getT } from "@/server/locale";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Orders", "הזמנות") }; }

export default async function Orders() {
  const actor = await requireApprovedBuyer();
  const list = await listCompanyOrders(actor);
  const { l, t } = await getT();
  return (
    <div>
      <PageHeader title={t("Orders", "הזמנות")} intro={t("All orders placed by your company.", "כל ההזמנות שבוצעו על ידי החברה שלכם.")} />
      {list.length === 0 ? <Empty title={t("No orders yet", "עדיין אין הזמנות")} action={<Link href="/catalog" className="btn-deep">{t("Browse catalog", "לקטלוג")}</Link>} /> : (
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
          <table className="tbl min-w-[720px]">
            <thead><tr><th scope="col">{t("Order", "הזמנה")}</th><th scope="col">{t("PO", "הזמנת רכש")}</th><th scope="col">{t("Placed", "תאריך")}</th><th scope="col">{t("Status", "סטטוס")}</th><th scope="col">{t("Payment", "תשלום")}</th><th scope="col" className="text-end">{t("Total", "סה״כ")}</th></tr></thead>
            <tbody>{list.map((o) => (
              <tr key={o.id}>
                <td><Link className="link" href={`/portal/orders/${o.id}`}>{o.number}</Link></td><td>{o.poNumber ?? "—"}</td><td>{fmtDate(o.placedAt, false, l)}</td>
                <td><StatusPill status={o.status} l={l} /></td><td><StatusPill status={o.paymentStatus} l={l} /></td>
                <td className="text-end font-medium"><Money cents={o.totalCents} currency={o.currency} /></td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
