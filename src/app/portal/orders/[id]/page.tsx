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

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ placed?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { id } = await params;
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
      <PageHeader title={`Order ${o.number}`} back={{ href: "/portal/orders", label: "All orders" }}
        intro={<span className="flex flex-wrap items-center gap-2">Placed {fmtDate(o.placedAt, true)} <StatusPill status={o.status} /> <StatusPill status={o.paymentStatus} /></span>}
        actions={<>
          <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=confirmation`} target="_blank">Order confirmation</Link>
          {["AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED"].includes(o.status) && <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=proforma`} target="_blank">Pro-forma invoice</Link>}
          {b.shipments.length > 0 && <Link className="btn-outline btn-sm" href={`/documents/orders/${o.id}?type=packing`} target="_blank">Packing list</Link>}
        </>} />

      {placed && <Notice tone="ok" title="Order received">{o.status === "PENDING_REVIEW" ? "Our trade desk will confirm availability, freight and account checks, then request payment. You will be notified by email." : "Your order is confirmed and awaiting payment."}</Notice>}
      {o.status === "PENDING_REVIEW" && !placed && <Notice tone="info" title="Under review">We are confirming availability and freight. No payment is due yet.</Notice>}

      {canPay && (
        <section className="panel panel-pad">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="wide text-lg">Payment due: <Money cents={o.totalCents} currency={o.currency} /></h2>
            {o.paymentStatus === "FAILED" && <span className="text-sm text-bad">The last payment attempt failed. No funds were taken.</span>}
          </div>
          {o.paymentMethod === "PAYPAL" ? (
            cfg.clientId && paypal().isConfigured() && ppAllowed ? <PayPalCheckout orderId={o.id} clientId={cfg.clientId} currency={o.currency} /> : (
              <Notice tone="warn">{!ppAllowed ? "This total exceeds the PayPal limit for the store." : "PayPal is not configured in this environment yet."} Switch to bank transfer below, or contact the trade desk.</Notice>
            )
          ) : (
            <div className="space-y-2 text-sm">
              <p>{s.payments.manualTransferInstructions}</p>
              <p>Quote reference <span className="num font-semibold">{o.number}</span> on your transfer. The order is marked paid only after our finance team verifies receipt.</p>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            {o.paymentMethod === "PAYPAL" && s.payments.manualTransferEnabled && <ActionButton action={`/api/orders/${o.id}/payment-method`} body={{ method: "MANUAL_TRANSFER" }} label="Pay by bank transfer instead" />}
            {o.paymentMethod === "MANUAL_TRANSFER" && ppAllowed && <ActionButton action={`/api/orders/${o.id}/payment-method`} body={{ method: "PAYPAL" }} label="Pay with PayPal instead" />}
          </div>
        </section>
      )}
      {o.paymentStatus === "PENDING" && <Notice tone="info" title="Payment pending">PayPal reports this payment as pending. We will update the order automatically when it completes.</Notice>}

      <OrderItemsTable b={b} />
      <OrderFacts b={b} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section><h2 className="wide mb-3 text-lg">Shipments</h2><Shipments b={b} /></section>
        <section><h2 className="wide mb-3 text-lg">History</h2><Timeline b={b} /></section>
      </div>
      {canCancel && (
        <details className="panel panel-pad">
          <summary className="cursor-pointer text-sm font-semibold text-bad">Cancel this order</summary>
          <ActionForm action={`/api/orders/${o.id}/cancel`} className="mt-3 max-w-lg" submitLabel="Cancel order" submitClass="btn-danger" confirm="Cancel this order? This cannot be undone.">
            <label className="field-label" htmlFor="reason">Reason (optional)</label><input id="reason" name="reason" className="input" />
          </ActionForm>
        </details>
      )}
    </div>
  );
}
