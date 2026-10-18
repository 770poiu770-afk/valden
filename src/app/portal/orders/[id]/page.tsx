import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { orderBundle } from "@/server/orders";
import { paypal, paypalPublicConfig } from "@/server/paypal";
import { paypalCapExceeded } from "@/server/orders";
import { getSettings } from "@/lib/settings";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { PayPalCheckout } from "@/components/client/PayPalCheckout";
import { OrderFacts, OrderItemsTable, Shipments, Timeline } from "@/components/OrderView";
import { Money, Notice, PageHeader, StatusPill, fmtDate } from "@/components/ui";
import { toBig } from "@/lib/money";
import { notFound } from "next/navigation";
import { getT } from "@/server/locale";
import { transferText } from "@/lib/labels";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Order", "הזמנה") }; }

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { id } = await params;
  const { l, t } = await getT();
  const b = await orderBundle(actor, id).catch(() => null);
  if (!b) notFound();
  const o = b.order;
  const s = await getSettings();
  const placed = (await searchParams).placed;
  const canPay = o.status === "AWAITING_PAYMENT" && ["UNPAID", "FAILED"].includes(o.paymentStatus);
  const cfg = paypalPublicConfig();
  const ppAllowed = s.payments.paypalEnabled && !paypalCapExceeded(toBig(o.totalCents), o.fxRate, s);
  const canCancel = ["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(o.status) && ["UNPAID", "FAILED"].includes(o.paymentStatus);

  return (
    <div className="space-y-6">
      <PageHeader title={t(`Order ${o.number}`, `הזמנה ${o.number}`)} back={{ href: "/portal/orders", label: t("All orders", "כל ההזמנות") }}
        intro={<span className="flex flex-wrap items-center gap-2">{t("Placed", "בוצעה")} {fmtDate(o.placedAt, true, l)} <StatusPill status={o.status} l={l} /> <StatusPill status={o.paymentStatus} l={l} /></span>}
        actions={<>
          <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=confirmation`} target="_blank">{t("Order confirmation", "אישור הזמנה")}</Link>
          {["AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED"].includes(o.status) && <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=proforma`} target="_blank">{t("Pro-forma invoice", "חשבון עסקה")}</Link>}
          {b.shipments.length > 0 && <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=packing`} target="_blank">{t("Packing list", "רשימת אריזה")}</Link>}
        </>} />

      {placed && <Notice tone="ok" title={t("Order received", "ההזמנה התקבלה")}>{o.status === "PENDING_REVIEW" ? t("Our trade desk will confirm availability, freight and account checks, then request payment. You will be notified by email.", "צוות המכירות יאשר זמינות, משלוח ובדיקות חשבון, ואז יבקש תשלום. תקבלו הודעה במייל.") : t("Your order is confirmed and awaiting payment.", "ההזמנה אושרה וממתינה לתשלום.")}</Notice>}
      {o.status === "PENDING_REVIEW" && !placed && <Notice tone="info" title={t("Under review", "בבדיקה")}>{t("We are confirming availability and freight. No payment is due yet.", "אנחנו מאשרים זמינות ומשלוח. עדיין לא נדרש תשלום.")}</Notice>}

      {canPay && (
        <section className="panel panel-pad">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="wide text-lg">{t("Payment due:", "לתשלום:")} <Money cents={o.totalCents} currency={o.currency} /></h2>
            {o.paymentStatus === "FAILED" && <span className="text-sm text-bad">{t("The last payment attempt failed. No funds were taken.", "ניסיון התשלום האחרון נכשל. לא נגבה כסף.")}</span>}
          </div>
          {o.paymentMethod === "PAYPAL" ? (
            cfg.clientId && paypal().isConfigured() && ppAllowed ? <PayPalCheckout orderId={o.id} clientId={cfg.clientId} currency={o.currency} /> : (
              <Notice tone="warn">{!ppAllowed ? t("This total exceeds the PayPal limit for the store.", "הסכום חורג מתקרת ה-PayPal של האתר.") : t("PayPal is not configured in this environment yet.", "PayPal עדיין לא הוגדר בסביבה זו.")} {t("Switch to bank transfer below, or contact the trade desk.", "עברו להעברה בנקאית למטה, או פנו לצוות המכירות.")}</Notice>
            )
          ) : (
            <div className="space-y-2 text-sm">
              <p>{transferText(s.payments.manualTransferInstructions, l)}</p>
              <p>{t("Quote reference", "ציינו את האסמכתא")} <span className="num font-semibold">{o.number}</span> {t("on your transfer. The order is marked paid only after our finance team verifies receipt.", "בהעברה. ההזמנה תסומן כמשולמת רק לאחר שמחלקת הכספים תאמת את קבלת הכסף.")}</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {o.paymentMethod === "PAYPAL" && s.payments.manualTransferEnabled && <ActionButton action={`/api/orders/${o.id}/payment-method`} body={{ method: "MANUAL_TRANSFER" }} label={t("Pay by bank transfer instead", "תשלום בהעברה בנקאית במקום")} />}
            {o.paymentMethod === "MANUAL_TRANSFER" && ppAllowed && <ActionButton action={`/api/orders/${o.id}/payment-method`} body={{ method: "PAYPAL" }} label={t("Pay with PayPal instead", "תשלום ב-PayPal במקום")} />}
          </div>
        </section>
      )}
      {o.paymentStatus === "PENDING" && <Notice tone="info" title={t("Payment pending", "התשלום בהמתנה")}>{t("PayPal reports this payment as pending. We will update the order automatically when it completes.", "PayPal מדווחת שהתשלום בהמתנה. נעדכן את ההזמנה אוטומטית כשהוא יושלם.")}</Notice>}

      <OrderItemsTable b={b} l={l} />
      <OrderFacts b={b} l={l} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="wide mb-3 text-lg">{t("Shipments", "משלוחים")}</h2><Shipments b={b} l={l} /></section>
        <section><h2 className="wide mb-3 text-lg">{t("History", "היסטוריה")}</h2><Timeline b={b} l={l} /></section>
      </div>
      {canCancel && (
        <details className="panel panel-pad">
          <summary className="cursor-pointer text-sm font-semibold text-bad">{t("Cancel this order", "ביטול ההזמנה")}</summary>
          <ActionForm action={`/api/orders/${o.id}/cancel`} className="mt-3 max-w-lg" submitLabel={t("Cancel order", "ביטול הזמנה")} submitClass="btn-danger" confirm={t("Cancel this order? This cannot be undone.", "לבטל את ההזמנה? אי אפשר לבטל את הפעולה.")}>
            <label className="field-label" htmlFor="reason">{t("Reason (optional)", "סיבה (רשות)")}</label><input id="reason" name="reason" className="input" />
          </ActionForm>
        </details>
      )}
    </div>
  );
}
