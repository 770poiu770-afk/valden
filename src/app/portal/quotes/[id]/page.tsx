import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { quoteBundle } from "@/server/quotes";
import { getSettings } from "@/lib/settings";
import { getRate } from "@/lib/fx";
import { ActionForm } from "@/components/ActionForm";
import { CheckoutFields } from "@/components/CheckoutFields";
import { DL, Money, Notice, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { convertMinor, isCurrency } from "@/lib/money";
import Link from "next/link";
import { getT } from "@/server/locale";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Quote", "הצעת מחיר") }; }

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { l, t } = await getT();
  const b = await quoteBundle(actor, (await params).id).catch(() => null);
  if (!b) notFound();
  const { quote: q, items } = b;
  const s = await getSettings();
  const cur = isCurrency(q.currency) ? q.currency : "USD";
  const rate = await getRate(cur);
  const conv = (c: number | bigint | null) => (c === null || !rate ? null : convertMinor(BigInt(c), rate.rate));
  const offered = q.status === "OFFERED";
  const addrs = offered ? await db.select().from(addresses).where(eq(addresses.companyId, actor.companyId)) : [];
  const offerTotal = q.offerTotalBaseCents;

  return (
    <div className="space-y-6">
      <PageHeader title={t(`Quote ${q.number}`, `הצעת מחיר ${q.number}`)} back={{ href: "/portal/quotes", label: t("Quotes & offers", "הצעות מחיר") }} intro={<span className="flex flex-wrap items-center gap-2">{t("Requested", "התבקשה")} {fmtDate(q.createdAt, false, l)} <StatusPill status={q.status} l={l} /></span>} />
      {(await searchParams).submitted && <Notice tone="ok" title={t("Request submitted", "הבקשה נשלחה")}>{t("Our trade desk will review it and issue a formal offer. We will email you when it is ready.", "צוות המכירות יבדוק אותה וישלח הצעה רשמית. נעדכן אתכם במייל כשהיא תהיה מוכנה.")}</Notice>}
      {q.status === "CONVERTED" && q.orderId && <Notice tone="ok">{t("Accepted and converted to an order.", "ההצעה אושרה והפכה להזמנה.")} <Link className="link" href={`/portal/orders/${q.orderId}`}>{t("View order", "לצפייה בהזמנה")}</Link></Notice>}
      {q.status === "EXPIRED" && <Notice tone="warn">{t("This offer has expired.", "תוקף ההצעה פג.")} <Link className="link" href="/contact?topic=Quote+request">{t("Ask the trade desk", "בקשו מצוות המכירות")}</Link> {t("to re-issue it.", "להנפיק אותה מחדש.")}</Notice>}
      {offered && <Notice tone="info" title={t(`Offer valid until ${fmtDate(q.offerExpiresAt, true)}`, `ההצעה בתוקף עד ${fmtDate(q.offerExpiresAt, true, l)}`)}>{q.offerNotes ? <span dir="auto">{q.offerNotes}</span> : t("Review the offered prices below and accept to place the order.", "עברו על המחירים המוצעים למטה ואשרו כדי לבצע את ההזמנה.")}</Notice>}

      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
        <table className="tbl min-w-[720px]">
          <thead><tr><th scope="col">{t("Product", "מוצר")}</th><th scope="col" className="text-end">{t("Qty", "כמות")}</th><th scope="col" className="text-end">{t("Your target", "מחיר היעד שלכם")}</th><th scope="col" className="text-end">{t("List unit", "מחירון ליחידה")}</th><th scope="col" className="text-end">{t("Offered unit", "מוצע ליחידה")}</th><th scope="col" className="text-end">{t("Offered line", "סה״כ מוצע")}</th></tr></thead>
          <tbody>{items.map((i) => (
            <tr key={i.id}>
              <td><Link className="font-medium text-deep-900 hover:underline" href={`/products/${i.slug}`} dir="auto">{i.name}</Link><p className="text-xs text-steel-500"><span dir="auto">{i.label}</span> · <span className="num">{i.sku}</span></p>{i.lineNote && <p className="text-xs text-info" dir="auto">{i.lineNote}</p>}</td>
              <td className="num text-end">{i.quantity}</td>
              <td className="text-end">{i.targetUnitCents !== null ? <Money cents={i.targetUnitCents} currency="USD" /> : "—"}</td>
              <td className="text-end text-steel-500"><Money cents={i.listUnitCents} currency="USD" /></td>
              <td className="text-end font-semibold text-deep-900">{i.offeredUnitCents !== null ? <Money cents={i.offeredUnitCents} currency="USD" /> : t("Pending", "ממתין")}</td>
              <td className="text-end">{i.offeredUnitCents !== null ? <Money cents={BigInt(i.offeredUnitCents) * BigInt(i.quantity)} currency="USD" /> : "—"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {offerTotal !== null && (
        <section className="panel panel-pad grid gap-6 md:grid-cols-2">
          <DL rows={[
            [t("Offer total (USD)", "סה״כ הצעה (דולר)"), <Money key="t" cents={offerTotal} currency="USD" className="font-semibold" />],
            [t(`Indicative in ${cur}`, `משוער ב-${cur}`), cur === "USD" ? "—" : <span key="c"><Money cents={conv(offerTotal)} currency={cur} />{rate?.isSample ? t(" (sample rate)", " (שער לדוגמה)") : ""}</span>],
            [t("Freight", "משלוח"), q.offerShippingBaseCents !== null ? <Money key="f" cents={q.offerShippingBaseCents} currency="USD" /> : t("Not included / buyer arranged", "לא כלול / באחריות הקונה")],
            [t("Freight terms", "תנאי משלוח"), q.offerShippingMethod],
          ]} />
          <p className="text-sm text-steel-500">{t(`Offered prices are set in USD. If you accept in ${cur}, amounts are converted at the exchange rate recorded on the day of acceptance and shown on your order. Tax is added according to the delivery country.`, `המחירים המוצעים נקבעים בדולר. אם תאשרו ב-${cur}, הסכומים יומרו לפי שער החליפין שנרשם ביום האישור ויוצגו בהזמנה. המע״מ יתווסף לפי ארץ המשלוח.`)}</p>
        </section>
      )}
      {q.buyerNotes && <section className="panel panel-pad text-sm"><h2 className="mb-1 font-semibold">{t("Your notes", "ההערות שלכם")}</h2><p className="whitespace-pre-line" dir="auto">{q.buyerNotes}</p></section>}

      {offered && (
        <section>
          <h2 className="wide mb-3 text-xl">{t("Accept this offer", "אישור ההצעה")}</h2>
          <ActionForm action={`/api/quotes/${q.id}/accept`} submitLabel={t("Accept offer and place order", "אישור ההצעה וביצוע ההזמנה")} submitClass="btn-primary px-8 py-3" confirm={t("Accept this offer and place the order at the offered prices?", "לאשר את ההצעה ולבצע את ההזמנה במחירים המוצעים?")}>
            <CheckoutFields l={l} addrs={addrs} settings={s} currency={cur} paypalBlocked={false} />
          </ActionForm>
          <details className="mt-6 panel panel-pad">
            <summary className="cursor-pointer text-sm font-semibold text-bad">{t("Decline this offer", "דחיית ההצעה")}</summary>
            <ActionForm action={`/api/quotes/${q.id}/decline`} className="mt-3 max-w-lg" submitLabel={t("Decline offer", "דחיית ההצעה")} submitClass="btn-danger">
              <label className="field-label" htmlFor="reason">{t("Reason (helps us improve future offers)", "סיבה (עוזרת לנו לשפר הצעות עתידיות)")}</label><input id="reason" name="reason" className="input" />
            </ActionForm>
          </details>
        </section>
      )}
      {["SUBMITTED", "UNDER_REVIEW"].includes(q.status) && (
        <ActionForm action={`/api/quotes/${q.id}/decline`} submitLabel={t("Withdraw request", "ביטול הבקשה")} submitClass="btn-ghost btn-sm" confirm={t("Withdraw this quote request?", "לבטל את הבקשה להצעת מחיר?")}><input type="hidden" name="reason" value="Withdrawn by buyer" /></ActionForm>
      )}
    </div>
  );
}
