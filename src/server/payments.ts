import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { orderEvents, orders, paymentEvents, payments, refunds, shipments } from "@/db/schema";
import { assertBuyer, assertCan, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { AppError, badRequest, conflict, notFound } from "@/lib/errors";
import { decimalStringToMinor, formatMoney, minorToDecimalString, toBig } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { log } from "@/lib/log";
import { loadOrderFor, paypalCapExceeded } from "./orders";
import { paypal, paypalMode, PayPalApiError, type PayPalCapture, type PayPalOrder, type PayPalRefund, type WebhookHeaders } from "./paypal";


type PaymentRow = typeof payments.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

async function orderEvent(tx: DbOrTx, orderId: string, type: string, message: string, visible = true, actorId: string | null = null) {
  await tx.insert(orderEvents).values({ orderId, type, message, visibleToBuyer: visible, actorUserId: actorId });
}

/* ========================================================================= */
/* PayPal checkout                                                            */
/* ========================================================================= */

export async function startPayPalPayment(actor: Actor, orderId: string): Promise<{ paypalOrderId: string; paymentId: string }> {
  assertBuyer(actor, "orders.place");
  const s = await getSettings();
  if (!s.payments.paypalEnabled) throw badRequest("PayPal payments are currently disabled.");
  if (!paypal().isConfigured()) throw new AppError(503, "PayPal is not configured for this environment yet. Please choose bank transfer or contact the trade desk.", "PAYPAL_NOT_CONFIGURED");
  if (paypalMode() === "live" && process.env.ALLOW_SAMPLE_DATA === "true") {
    // Safety: never take real money while sample prices/rates are allowed.
    log.error("paypal_live_with_sample_data_blocked", { orderId });
    throw new AppError(503, "Payments are temporarily unavailable. Please contact the trade desk.", "LIVE_WITH_SAMPLE_DATA");
  }

  const prepared = await db.transaction(async (tx) => {
    const o = await loadOrderFor(actor, orderId, tx);
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${o.id} FOR UPDATE`);
    const order = (await tx.select().from(orders).where(eq(orders.id, o.id)))[0];
    if (order.status !== "AWAITING_PAYMENT") throw conflict(order.status === "PENDING_REVIEW" ? "This order is still being reviewed by our trade desk. You will be notified when payment can be made." : `Order is ${order.status}; payment is not possible.`);
    if (order.paymentMethod !== "PAYPAL") throw conflict("This order is set to bank transfer.");
    if (!["UNPAID", "FAILED"].includes(order.paymentStatus)) throw conflict("A payment for this order is already pending or completed.");
    if (paypalCapExceeded(toBig(order.totalCents), order.fxRate, s)) throw new AppError(422, "This order total exceeds the PayPal limit configured for the store. Please switch to bank transfer.", "PAYPAL_LIMIT");
    const open = (await tx.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.provider, "PAYPAL"), inArray(payments.status, ["CREATED", "APPROVED"]))).orderBy(desc(payments.createdAt)))[0];
    if (open && open.amountCents === toBig(order.totalCents) && open.currency === order.currency) {
      if (open.providerOrderId) return { reuse: open, order };
      if (Date.now() - open.createdAt.getTime() < 60_000) throw conflict("Payment is being initialised. Please retry in a moment.");
      await tx.update(payments).set({ status: "FAILED", failureReason: "Initialisation did not complete", updatedAt: new Date() }).where(eq(payments.id, open.id));
    } else if (open) {
      await tx.update(payments).set({ status: "CANCELLED", failureReason: "Superseded (order amount changed)", updatedAt: new Date() }).where(eq(payments.id, open.id));
    }
    const p = (await tx.insert(payments).values({
      orderId: order.id, provider: "PAYPAL", status: "CREATED", amountCents: toBig(order.totalCents), currency: order.currency, idempotencyKey: `pp-create-${randomUUID()}`,
    }).returning())[0];
    return { reuse: null as PaymentRow | null, payment: p, order };
  });
  if (prepared.reuse) return { paypalOrderId: prepared.reuse.providerOrderId!, paymentId: prepared.reuse.id };

  const { payment, order } = prepared as { payment: PaymentRow; order: OrderRow };
  try {
    const pp = await paypal().createOrder({
      requestId: payment.idempotencyKey, amount: { currency_code: order.currency, value: minorToDecimalString(toBig(order.totalCents)) },
      referenceId: order.id, customId: order.id, invoiceId: `${order.number}-${payment.id.slice(0, 8)}`, description: `Valden order ${order.number}`,
    });
    await db.update(payments).set({ providerOrderId: pp.id, providerStatus: pp.status, updatedAt: new Date() }).where(eq(payments.id, payment.id));
    await audit(actor, "payment.paypal_create", "payment", payment.id, { orderId: order.id, providerOrderId: pp.id, amount: payment.amountCents, currency: payment.currency });
    return { paypalOrderId: pp.id, paymentId: payment.id };
  } catch (e) {
    const msg = e instanceof PayPalApiError ? `${e.issue ?? "ERROR"}: ${e.message}` : (e as Error).message;
    await db.update(payments).set({ status: "FAILED", failureReason: msg.slice(0, 500), updatedAt: new Date() }).where(eq(payments.id, payment.id));
    throw new AppError(502, "PayPal could not create the payment. Please try again or choose bank transfer.", "PAYPAL_CREATE_FAILED");
  }
}

/** Called after the buyer approves in the PayPal popup. The browser's success callback is NOT trusted:
 *  we capture server-side and use PayPal's response (and later webhooks) as the source of truth. */
export async function capturePayPalPayment(actor: Actor, orderId: string, paypalOrderId: string) {
  assertBuyer(actor, "orders.place");
  const order = await loadOrderFor(actor, orderId);
  const payment = (await db.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.providerOrderId, paypalOrderId))).limit(1))[0];
  if (!payment) throw notFound("Payment not found for this order.");
  if (payment.status === "COMPLETED") return { status: "COMPLETED" as const };
  if (["CANCELLED", "FAILED", "DECLINED"].includes(payment.status)) throw conflict("This payment attempt is closed. Please start a new payment.");

  let result: PayPalOrder;
  try {
    result = await paypal().captureOrder(paypalOrderId, `pp-capture-${payment.id}`);
  } catch (e) {
    if (e instanceof PayPalApiError && e.issue === "INSTRUMENT_DECLINED") {
      await db.update(payments).set({ providerStatus: "INSTRUMENT_DECLINED", updatedAt: new Date() }).where(eq(payments.id, payment.id));
      return { status: "INSTRUMENT_DECLINED" as const };
    }
    if (e instanceof PayPalApiError && e.issue === "ORDER_ALREADY_CAPTURED") {
      result = await paypal().getOrder(paypalOrderId);
    } else {
      const msg = e instanceof PayPalApiError ? `${e.issue ?? "ERROR"}: ${e.message}` : (e as Error).message;
      await db.transaction(async (tx) => {
        await tx.update(payments).set({ status: "FAILED", failureReason: msg.slice(0, 500), updatedAt: new Date() }).where(eq(payments.id, payment.id));
        await tx.update(orders).set({ paymentStatus: "FAILED", updatedAt: new Date() }).where(and(eq(orders.id, order.id), eq(orders.paymentStatus, "UNPAID")));
        await orderEvent(tx, order.id, "PAYMENT_FAILED", "PayPal payment could not be completed. You can try again or switch to bank transfer.");
      });
      log.warn("paypal_capture_failed", { orderId: order.id, paymentId: payment.id });
      throw new AppError(502, "The payment could not be completed. No funds were captured. Please try again.", "PAYPAL_CAPTURE_FAILED");
    }
  }
  const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) {
    await db.update(payments).set({ providerStatus: result.status, updatedAt: new Date() }).where(eq(payments.id, payment.id));
    return { status: "PENDING" as const };
  }
  const outcome = await db.transaction((tx) => applyCapture(tx, payment.id, capture, "capture_api", result.payer?.payer_id));
  return { status: outcome };
}

/**
 * Apply a capture result to our records. Shared by the capture endpoint and webhooks; idempotent.
 * Amount, currency and order reference are verified against what we expected to collect.
 */
export async function applyCapture(tx: DbOrTx, paymentId: string, capture: PayPalCapture, source: string, payerId?: string): Promise<"COMPLETED" | "PENDING" | "FAILED" | "MISMATCH"> {
  const payment = (await tx.select().from(payments).where(eq(payments.id, paymentId)).for("update"))[0];
  const order = (await tx.select().from(orders).where(eq(orders.id, payment.orderId)).for("update"))[0];
  const base = { providerCaptureId: capture.id, providerStatus: capture.status, payerId: payerId ?? payment.payerId, updatedAt: new Date() };

  if (capture.status === "COMPLETED") {
    if (payment.status === "COMPLETED" || payment.status === "PARTIALLY_REFUNDED" || payment.status === "REFUNDED") return "COMPLETED";
    const expected = minorToDecimalString(payment.amountCents);
    const refOk = !capture.custom_id || capture.custom_id === order.id;
    if (capture.amount.value !== expected || capture.amount.currency_code !== payment.currency || !refOk) {
      await tx.update(payments).set({ ...base, status: "PENDING", failureReason: `Verification mismatch: received ${capture.amount.currency_code} ${capture.amount.value}, expected ${payment.currency} ${expected}` }).where(eq(payments.id, payment.id));
      await tx.update(orders).set({ paymentStatus: "PENDING", updatedAt: new Date() }).where(eq(orders.id, order.id));
      await orderEvent(tx, order.id, "PAYMENT_MISMATCH", `Captured amount did not match the order (${source}). Finance review required.`, false);
      log.error("payment_amount_mismatch", { orderId: order.id, paymentId: payment.id });
      return "MISMATCH";
    }
    await tx.update(payments).set({ ...base, status: "COMPLETED", capturedAt: new Date(), failureReason: null }).where(eq(payments.id, payment.id));
    if (order.status === "AWAITING_PAYMENT") {
      await tx.update(orders).set({ paymentStatus: "PAID", status: "PAID", updatedAt: new Date() }).where(eq(orders.id, order.id));
      await orderEvent(tx, order.id, "PAID", `Payment of ${formatMoney(payment.amountCents, payment.currency)} received via PayPal and verified.`);
    } else {
      await tx.update(orders).set({ paymentStatus: "PAID", updatedAt: new Date() }).where(eq(orders.id, order.id));
      const dup = order.paymentStatus === "PAID" || ["PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED"].includes(order.status);
      await orderEvent(tx, order.id, dup ? "DUPLICATE_PAYMENT" : "PAYMENT_ON_CLOSED_ORDER", dup
        ? `A second payment (capture ${capture.id}) was received for an order that was already paid. Refund this capture.`
        : `Payment captured while order was ${order.status}. Refund or reinstatement required.`, false);
      log.error(dup ? "duplicate_payment_captured" : "payment_on_closed_order", { orderId: order.id, paymentId: payment.id });
    }
    await audit(null, "payment.captured", "payment", payment.id, { orderId: order.id, captureId: capture.id, source });
    return "COMPLETED";
  }
  if (capture.status === "PENDING") {
    if (payment.status === "COMPLETED") return "COMPLETED";
    await tx.update(payments).set({ ...base, status: "PENDING", failureReason: capture.status_details?.reason ?? null }).where(eq(payments.id, payment.id));
    await tx.update(orders).set({ paymentStatus: "PENDING", updatedAt: new Date() }).where(eq(orders.id, order.id));
    await orderEvent(tx, order.id, "PAYMENT_PENDING", `PayPal reports the payment as pending${capture.status_details?.reason ? ` (${capture.status_details.reason})` : ""}. The order will proceed once PayPal confirms completion.`);
    return "PENDING";
  }
  // DECLINED / FAILED
  if (payment.status === "COMPLETED") return "COMPLETED";
  await tx.update(payments).set({ ...base, status: capture.status === "DECLINED" ? "DECLINED" : "FAILED", failureReason: capture.status_details?.reason ?? capture.status }).where(eq(payments.id, payment.id));
  await tx.update(orders).set({ paymentStatus: "FAILED", updatedAt: new Date() }).where(eq(orders.id, order.id));
  await orderEvent(tx, order.id, "PAYMENT_FAILED", "PayPal declined the payment. No funds were collected. You may retry or choose bank transfer.");
  return "FAILED";
}

/**
 * The buyer closed or cancelled the PayPal window. The browser's word is not trusted: we ask PayPal
 * for the order status and only close our payment attempt if PayPal has not been approved/captured.
 */
export async function cancelPayPalPayment(actor: Actor, orderId: string, paypalOrderId: string) {
  assertBuyer(actor, "orders.place");
  const order = await loadOrderFor(actor, orderId);
  const payment = (await db.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.providerOrderId, paypalOrderId))).limit(1))[0];
  if (!payment) throw notFound("Payment not found for this order.");
  if (!["CREATED", "APPROVED"].includes(payment.status)) return { status: payment.status };
  let pp: PayPalOrder | null = null;
  try { pp = await paypal().getOrder(paypalOrderId); } catch (e) { log.warn("paypal_cancel_lookup_failed", { paymentId: payment.id, message: (e as Error).message }); }
  if (pp && (pp.status === "APPROVED" || pp.status === "COMPLETED")) {
    // Approved after all (e.g. the popup closed late) — reconcile instead of cancelling.
    return reconcilePayPalOrder(payment.id, pp, "buyer_cancel_check");
  }
  await db.transaction(async (tx) => {
    const res = await tx.update(payments).set({ status: "CANCELLED", providerStatus: pp?.status ?? payment.providerStatus, failureReason: "Cancelled by buyer at PayPal", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), inArray(payments.status, ["CREATED", "APPROVED"]))).returning({ id: payments.id });
    if (res.length) await orderEvent(tx, order.id, "PAYMENT_CANCELLED", "PayPal payment was cancelled. Nothing was charged; the order is still awaiting payment.");
  });
  return { status: "CANCELLED" };
}

/** Bring one PayPal payment in line with PayPal's own record (capture if approved but not captured). */
async function reconcilePayPalOrder(paymentId: string, pp: PayPalOrder, source: string): Promise<{ status: string }> {
  const payment = (await db.select().from(payments).where(eq(payments.id, paymentId)))[0];
  let current = pp;
  if (current.status === "APPROVED") {
    try { current = await paypal().captureOrder(current.id, `pp-capture-${payment.id}`); }
    catch (e) {
      if (e instanceof PayPalApiError && e.issue === "ORDER_ALREADY_CAPTURED") current = await paypal().getOrder(current.id);
      else throw new AppError(502, "PayPal could not complete the capture. Try again shortly.", "PAYPAL_RECONCILE_FAILED");
    }
  }
  const capture = current.purchase_units?.[0]?.payments?.captures?.[0];
  if (capture) return { status: await db.transaction((tx) => applyCapture(tx, payment.id, capture, source, current.payer?.payer_id)) };
  if (current.status === "VOIDED") {
    await db.update(payments).set({ status: "CANCELLED", providerStatus: "VOIDED", updatedAt: new Date() }).where(and(eq(payments.id, payment.id), inArray(payments.status, ["CREATED", "APPROVED"])));
    return { status: "CANCELLED" };
  }
  await db.update(payments).set({ providerStatus: current.status, updatedAt: new Date() }).where(eq(payments.id, payment.id));
  return { status: current.status };
}

/** Staff action: re-check a PayPal payment against PayPal (e.g. buyer closed the browser after approving). */
export async function reconcilePayPalPayment(actor: Actor, paymentId: string) {
  assertCan(actor, "payments.manage");
  const payment = (await db.select().from(payments).where(eq(payments.id, paymentId)))[0];
  if (!payment || payment.provider !== "PAYPAL" || !payment.providerOrderId) throw notFound("PayPal payment not found.");
  const pp = await paypal().getOrder(payment.providerOrderId);
  const r = await reconcilePayPalOrder(payment.id, pp, "staff_reconcile");
  await audit(actor, "payment.reconcile", "payment", payment.id, { providerStatus: pp.status, result: r.status });
  return r;
}

export async function switchPaymentMethod(actor: Actor, orderId: string, method: "PAYPAL" | "MANUAL_TRANSFER") {
  assertBuyer(actor, "orders.place");
  const s = await getSettings();
  return db.transaction(async (tx) => {
    const o = await loadOrderFor(actor, orderId, tx);
    const order = (await tx.select().from(orders).where(eq(orders.id, o.id)).for("update"))[0];
    if (!["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(order.status) || !["UNPAID", "FAILED"].includes(order.paymentStatus)) throw conflict("Payment method can no longer be changed.");
    if (method === "PAYPAL" && (!s.payments.paypalEnabled || paypalCapExceeded(toBig(order.totalCents), order.fxRate, s))) throw badRequest("PayPal is not available for this order.");
    if (method === "MANUAL_TRANSFER" && !s.payments.manualTransferEnabled) throw badRequest("Bank transfer is not available.");
    await tx.update(payments).set({ status: "CANCELLED", updatedAt: new Date() }).where(and(eq(payments.orderId, order.id), inArray(payments.status, ["CREATED", "APPROVED"])));
    await tx.update(orders).set({ paymentMethod: method, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await orderEvent(tx, order.id, "PAYMENT_METHOD", `Payment method changed to ${method === "PAYPAL" ? "PayPal" : "bank transfer"}.`, true, actor.userId);
    await audit(actor, "order.payment_method", "order", order.id, { method }, tx);
  });
}

/* ========================================================================= */
/* Manual (bank transfer) payments — recorded by finance after verification   */
/* ========================================================================= */

export async function recordManualPayment(actor: Actor, orderId: string, input: { amount: string; reference: string; note?: string }) {
  assertCan(actor, "payments.manage");
  if (!input.reference || input.reference.trim().length < 4) throw badRequest("Enter the bank transfer reference.");
  const amount = decimalStringToMinor(input.amount);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!order) throw notFound();
    if (order.status !== "AWAITING_PAYMENT" || !["UNPAID", "FAILED"].includes(order.paymentStatus)) throw conflict("Payment can only be recorded for orders awaiting payment.");
    if (order.paymentMethod !== "MANUAL_TRANSFER") throw conflict("This order is set to PayPal. Switch the order to bank transfer first.");
    if (amount !== toBig(order.totalCents)) throw badRequest(`Amount must equal the order total (${formatMoney(toBig(order.totalCents), order.currency)}). For part-payments, contact engineering to enable instalments.`);
    const p = (await tx.insert(payments).values({
      orderId, provider: "MANUAL", status: "COMPLETED", amountCents: amount, currency: order.currency, manualReference: input.reference.trim(),
      idempotencyKey: `manual-${orderId}-${input.reference.trim()}`, recordedById: actor.userId, capturedAt: new Date(), providerStatus: "VERIFIED_BY_STAFF",
    }).onConflictDoNothing().returning())[0];
    if (!p) throw conflict("This transfer reference has already been recorded for this order.");
    await tx.update(orders).set({ status: "PAID", paymentStatus: "PAID", updatedAt: new Date() }).where(eq(orders.id, orderId));
    await orderEvent(tx, orderId, "PAID", `Bank transfer of ${formatMoney(amount, order.currency)} verified as received by finance.`, true, actor.userId);
    if (input.note) await orderEvent(tx, orderId, "NOTE", input.note, false, actor.userId);
    await audit(actor, "payment.manual_record", "payment", p.id, { orderId, amount, reference: input.reference }, tx);
    return p;
  });
}

/* ========================================================================= */
/* Refunds                                                                    */
/* ========================================================================= */

export async function issueRefund(actor: Actor, orderId: string, input: { amount: string; reason: string; manualReference?: string }) {
  assertCan(actor, "payments.manage");
  if (!input.reason || input.reason.trim().length < 5) throw badRequest("Please give a refund reason.");
  const amount = decimalStringToMinor(input.amount);
  if (amount <= 0n) throw badRequest("Refund amount must be positive.");
  const prep = await db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!order) throw notFound();
    const pay = (await tx.select().from(payments).where(and(eq(payments.orderId, orderId), inArray(payments.status, ["COMPLETED", "PARTIALLY_REFUNDED"]))).orderBy(desc(payments.capturedAt)).limit(1))[0];
    if (!pay) throw conflict("There is no completed payment to refund.");
    const existing = await tx.select().from(refunds).where(and(eq(refunds.paymentId, pay.id), inArray(refunds.status, ["PENDING", "COMPLETED"])));
    const used = existing.reduce((s, r) => s + r.amountCents, 0n);
    const refundable = pay.amountCents - used;
    if (amount > refundable) throw badRequest(`Maximum refundable is ${formatMoney(refundable, pay.currency)}.`);
    if (pay.provider === "MANUAL" && (!input.manualReference || input.manualReference.trim().length < 4)) throw badRequest("Enter the outgoing bank transfer reference for this manual refund.");
    const r = (await tx.insert(refunds).values({
      orderId, paymentId: pay.id, amountCents: amount, currency: pay.currency, reason: input.reason.trim(), requestedById: actor.userId,
      idempotencyKey: `refund-${randomUUID()}`, status: pay.provider === "MANUAL" ? "COMPLETED" : "PENDING",
      providerRefundId: pay.provider === "MANUAL" ? `MANUAL-${input.manualReference!.trim()}` : null,
    }).returning())[0];
    await audit(actor, "refund.request", "refund", r.id, { orderId, amount, provider: pay.provider, reason: input.reason }, tx);
    if (pay.provider === "MANUAL") {
      await orderEvent(tx, orderId, "REFUND", `Refund of ${formatMoney(amount, pay.currency)} recorded (bank transfer).`, true, actor.userId);
      await recomputeRefunds(tx, pay.id);
    }
    return { refund: r, payment: pay, order };
  });
  if (prep.payment.provider === "MANUAL") return prep.refund;

  // PayPal refund — outside the DB transaction; idempotent via PayPal-Request-Id
  let res: PayPalRefund;
  try {
    res = await paypal().refundCapture(prep.payment.providerCaptureId!, {
      requestId: prep.refund.idempotencyKey, amount: { currency_code: prep.payment.currency, value: minorToDecimalString(amount) },
      invoiceId: `${prep.order.number}-R${prep.refund.id.slice(0, 6)}`, note: `Refund for order ${prep.order.number}`,
    });
  } catch (e) {
    const msg = e instanceof PayPalApiError ? `${e.issue ?? "ERROR"}: ${e.message}` : (e as Error).message;
    await db.update(refunds).set({ status: "FAILED", failureReason: msg.slice(0, 500), updatedAt: new Date() }).where(eq(refunds.id, prep.refund.id));
    throw new AppError(502, `PayPal refund failed: ${msg}`, "PAYPAL_REFUND_FAILED");
  }
  await db.transaction(async (tx) => {
    const status = res.status === "COMPLETED" ? "COMPLETED" : res.status === "PENDING" ? "PENDING" : "FAILED";
    await tx.update(refunds).set({ providerRefundId: res.id, status, failureReason: res.status_details?.reason ?? null, updatedAt: new Date() }).where(eq(refunds.id, prep.refund.id));
    if (status === "COMPLETED") await orderEvent(tx, orderId, "REFUND", `Refund of ${formatMoney(amount, prep.payment.currency)} issued via PayPal.`, true, actor.userId);
    await recomputeRefunds(tx, prep.payment.id);
  });
  return (await db.select().from(refunds).where(eq(refunds.id, prep.refund.id)))[0];
}

export async function recomputeRefunds(tx: DbOrTx, paymentId: string) {
  const pay = (await tx.select().from(payments).where(eq(payments.id, paymentId)))[0];
  const done = await tx.select().from(refunds).where(and(eq(refunds.paymentId, paymentId), eq(refunds.status, "COMPLETED")));
  const total = done.reduce((s, r) => s + r.amountCents, 0n);
  if (total <= 0n || ["DISPUTED", "REVERSED"].includes(pay.status)) return;
  const full = total >= pay.amountCents;
  await tx.update(payments).set({ status: full ? "REFUNDED" : "PARTIALLY_REFUNDED", updatedAt: new Date() }).where(eq(payments.id, paymentId));
  const order = (await tx.select().from(orders).where(eq(orders.id, pay.orderId)))[0];
  const patch: Partial<OrderRow> = { refundedCents: total, paymentStatus: full ? "REFUNDED" : "PARTIALLY_REFUNDED", updatedAt: new Date() };
  if (full && ["PAID", "PROCESSING"].includes(order.status)) {
    const shipped = await tx.select().from(shipments).where(and(eq(shipments.orderId, order.id), inArray(shipments.status, ["IN_TRANSIT", "DELIVERED"])));
    if (!shipped.length) { patch.status = "CANCELLED"; patch.cancelledAt = new Date(); patch.cancelReason = "Cancelled following full refund"; }
  }
  await tx.update(orders).set(patch).where(eq(orders.id, order.id));
  if (patch.status === "CANCELLED") await orderEvent(tx, order.id, "CANCELLED", "Order cancelled following full refund.");
}

/* ========================================================================= */
/* Webhooks                                                                   */
/* ========================================================================= */

type WebhookEvent = { id: string; event_type: string; resource_type?: string; resource: Record<string, unknown> };

export async function handlePayPalWebhook(headers: WebhookHeaders, rawBody: string): Promise<{ status: number; result: string }> {
  let event: WebhookEvent;
  try { event = JSON.parse(rawBody); } catch { return { status: 400, result: "invalid_json" }; }
  if (!event?.id || !event?.event_type || typeof event.resource !== "object") return { status: 400, result: "invalid_event" };

  let verified = false;
  try { verified = await paypal().verifyWebhook(headers, event); } catch (e) { log.warn("paypal_webhook_verify_error", { message: (e as Error).message }); }
  if (!verified) {
    log.warn("paypal_webhook_unverified", { eventType: event.event_type });
    return { status: 400, result: "signature_verification_failed" };
  }

  try {
    return await db.transaction(async (tx) => {
      const inserted = await tx.insert(paymentEvents).values({
        provider: "PAYPAL", providerEventId: event.id, eventType: event.event_type, resourceId: String(event.resource.id ?? ""),
        verified: true, result: "processing", payload: sanitize(event),
      }).onConflictDoNothing().returning({ id: paymentEvents.id });
      if (!inserted.length) return { status: 200, result: "duplicate_ignored" };
      const result = await processEvent(tx, event);
      await tx.update(paymentEvents).set({ result: result.result, paymentId: result.paymentId ?? null }).where(eq(paymentEvents.id, inserted[0].id));
      return { status: 200, result: result.result };
    });
  } catch (e) {
    log.error("paypal_webhook_processing_failed", { eventType: event.event_type, message: (e as Error).message });
    return { status: 500, result: "processing_error" }; // PayPal will retry; event row rolled back
  }
}

function sanitize(e: WebhookEvent) {
  const r = e.resource as Record<string, unknown>;
  // Keep reconciliation fields only — never store payer personal data beyond IDs.
  return { id: e.id, event_type: e.event_type, resource_type: e.resource_type, resource: {
    id: r.id, status: r.status, amount: r.amount, custom_id: r.custom_id, invoice_id: r.invoice_id,
    supplementary_data: r.supplementary_data, links: Array.isArray(r.links) ? (r.links as { rel: string; href: string }[]).filter((l) => l.rel === "up") : undefined,
    disputed_transactions: Array.isArray(r.disputed_transactions) ? (r.disputed_transactions as { seller_transaction_id?: string }[]).map((d) => ({ seller_transaction_id: d.seller_transaction_id })) : undefined,
    dispute_outcome: r.dispute_outcome, reason: r.reason,
  } };
}

async function findPaymentForCapture(tx: DbOrTx, capture: PayPalCapture) {
  const byCapture = (await tx.select().from(payments).where(eq(payments.providerCaptureId, capture.id)).limit(1))[0];
  if (byCapture) return byCapture;
  const ppOrderId = capture.supplementary_data?.related_ids?.order_id;
  if (ppOrderId) return (await tx.select().from(payments).where(eq(payments.providerOrderId, ppOrderId)).limit(1))[0];
  return undefined;
}

async function processEvent(tx: DbOrTx, event: WebhookEvent): Promise<{ result: string; paymentId?: string }> {
  const r = event.resource;
  switch (event.event_type) {
    case "CHECKOUT.ORDER.APPROVED": {
      const p = (await tx.select().from(payments).where(eq(payments.providerOrderId, String(r.id))).limit(1))[0];
      if (!p) return { result: "unknown_payment" };
      if (p.status === "CREATED") await tx.update(payments).set({ status: "APPROVED", providerStatus: "APPROVED", updatedAt: new Date() }).where(eq(payments.id, p.id));
      return { result: "approved", paymentId: p.id };
    }
    case "PAYMENT.CAPTURE.COMPLETED":
    case "PAYMENT.CAPTURE.PENDING":
    case "PAYMENT.CAPTURE.DENIED":
    case "PAYMENT.CAPTURE.DECLINED": {
      const capture = r as unknown as PayPalCapture;
      if (event.event_type === "PAYMENT.CAPTURE.DENIED") capture.status = "DECLINED";
      const p = await findPaymentForCapture(tx, capture);
      if (!p) return { result: "unknown_payment" };
      const outcome = await applyCapture(tx, p.id, capture, `webhook:${event.event_type}`);
      return { result: `capture_${outcome.toLowerCase()}`, paymentId: p.id };
    }
    case "PAYMENT.CAPTURE.REFUNDED": {
      const refund = r as unknown as PayPalRefund & { links?: { rel: string; href: string }[] };
      const up = refund.links?.find((l) => l.rel === "up")?.href ?? "";
      const captureId = up.split("/captures/")[1]?.split(/[/?]/)[0];
      const p = captureId ? (await tx.select().from(payments).where(eq(payments.providerCaptureId, captureId)).limit(1))[0] : undefined;
      if (!p) return { result: "unknown_payment" };
      const existing = (await tx.select().from(refunds).where(eq(refunds.providerRefundId, refund.id)).limit(1))[0];
      if (existing) {
        if (existing.status !== "COMPLETED") await tx.update(refunds).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(refunds.id, existing.id));
      } else {
        const amt = refund.amount ? decimalStringToMinor(refund.amount.value) : 0n;
        await tx.insert(refunds).values({ orderId: p.orderId, paymentId: p.id, amountCents: amt, currency: refund.amount?.currency_code ?? p.currency, reason: "Refund issued directly in PayPal (recorded from webhook)", providerRefundId: refund.id, idempotencyKey: `pp-webhook-${refund.id}`, status: "COMPLETED" });
        await orderEvent(tx, p.orderId, "REFUND", `Refund of ${formatMoney(amt, p.currency)} confirmed by PayPal.`);
      }
      await recomputeRefunds(tx, p.id);
      return { result: "refund_recorded", paymentId: p.id };
    }
    case "PAYMENT.CAPTURE.REVERSED": {
      const p = (await tx.select().from(payments).where(eq(payments.providerCaptureId, String(r.id))).limit(1))[0];
      if (!p) return { result: "unknown_payment" };
      await tx.update(payments).set({ status: "REVERSED", providerStatus: "REVERSED", updatedAt: new Date() }).where(eq(payments.id, p.id));
      await tx.update(orders).set({ paymentStatus: "REFUNDED", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
      await orderEvent(tx, p.orderId, "PAYMENT_REVERSED", "PayPal reversed this payment. Fulfillment must be held; finance review required.", false);
      return { result: "reversed", paymentId: p.id };
    }
    case "CUSTOMER.DISPUTE.CREATED":
    case "CUSTOMER.DISPUTE.UPDATED":
    case "CUSTOMER.DISPUTE.RESOLVED": {
      const txs = (r.disputed_transactions as { seller_transaction_id?: string }[] | undefined) ?? [];
      const capId = txs.find((t) => t.seller_transaction_id)?.seller_transaction_id;
      const p = capId ? (await tx.select().from(payments).where(eq(payments.providerCaptureId, capId)).limit(1))[0] : undefined;
      if (!p) return { result: "unknown_payment" };
      if (event.event_type === "CUSTOMER.DISPUTE.RESOLVED") {
        const outcome = (r.dispute_outcome as { outcome_code?: string } | undefined)?.outcome_code ?? "UNKNOWN";
        const sellerWon = outcome === "RESOLVED_SELLER_FAVOUR";
        await tx.update(payments).set({ status: sellerWon ? "COMPLETED" : "REFUNDED", updatedAt: new Date() }).where(eq(payments.id, p.id));
        await tx.update(orders).set({ paymentStatus: sellerWon ? "PAID" : "REFUNDED", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
        await orderEvent(tx, p.orderId, "DISPUTE_RESOLVED", `PayPal dispute resolved: ${outcome}.`, false);
        return { result: "dispute_resolved", paymentId: p.id };
      }
      await tx.update(payments).set({ status: "DISPUTED", updatedAt: new Date() }).where(eq(payments.id, p.id));
      await tx.update(orders).set({ paymentStatus: "DISPUTED", updatedAt: new Date() }).where(eq(orders.id, p.orderId));
      await orderEvent(tx, p.orderId, "DISPUTE", `PayPal dispute ${event.event_type === "CUSTOMER.DISPUTE.CREATED" ? "opened" : "updated"}. Hold fulfillment pending finance review.`, false);
      return { result: "disputed", paymentId: p.id };
    }
    default:
      return { result: "ignored" };
  }
}

