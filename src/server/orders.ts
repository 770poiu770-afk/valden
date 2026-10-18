import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx, type Tx } from "@/db";
import {
  addresses, cartItems, companies, orderEvents, orderItems, orders, payments, shipments, type AddressSnapshot, type ShipmentLine,
} from "@/db/schema";
import { assertBuyer, assertCan, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { convertMinor, convertMinorInverse, formatMoney, percentOfBps, toBig } from "@/lib/money";
import { sampleRatesAllowed } from "@/lib/fx";
import type { AppSettings } from "@/lib/settings";
import { getCartItems, getOrCreateCart } from "./cart";
import { blockingIssues, priceLines, type LineInput, type PricedCart } from "./pricing-engine";
import { appUrl, queueEmail } from "./mail";
import { saveCheckoutAddress } from "./accounts";

export const CheckoutInput = z.object({
  currency: z.enum(["USD", "EUR", "ILS"]),
  shippingAddressId: z.string().uuid(),
  billingAddressId: z.string().uuid(),
  shippingMethod: z.string().min(2).max(40),
  paymentMethod: z.enum(["PAYPAL", "MANUAL_TRANSFER"]),
  poNumber: z.string().trim().max(60).optional(),
  deliveryInstructions: z.string().trim().max(1000).optional(),
  incoterm: z.enum(["", "EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CIF"]).optional(),
  exporterOfRecord: z.string().trim().max(200).optional(),
  importerOfRecord: z.string().trim().max(200).optional(),
  consigneeTaxId: z.string().trim().max(80).optional(),
  exportNotes: z.string().trim().max(1000).optional(),
});
export type CheckoutInput = z.infer<typeof CheckoutInput>;

/**
 * First-time customers enter their address at checkout ("newShipping.*", optional "newBilling.*").
 * Save those to the account and return the body with address IDs, so the normal checkout validation applies.
 */
export async function withCheckoutAddresses(actor: Actor, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  assertBuyer(actor, "orders.place");
  const out = { ...body };
  const ns = body.newShipping as Record<string, unknown> | undefined;
  if (!out.shippingAddressId && ns && typeof ns === "object") {
    out.shippingAddressId = await saveCheckoutAddress(actor as Actor & { companyId: string }, "SHIPPING", ns);
    const nb = body.newBilling as Record<string, unknown> | undefined;
    const separate = body.billingSameAsShipping === false && nb && typeof nb === "object";
    if (!out.billingAddressId) out.billingAddressId = await saveCheckoutAddress(actor as Actor & { companyId: string }, "BILLING", separate ? nb : ns);
  } else if (out.shippingAddressId && !out.billingAddressId && typeof out.shippingAddressId === "string") {
    // No billing address saved yet: bill to the chosen delivery address.
    const ship = (await db.select().from(addresses).where(and(eq(addresses.id, out.shippingAddressId), eq(addresses.companyId, actor.companyId!))))[0];
    if (ship) out.billingAddressId = await saveCheckoutAddress(actor as Actor & { companyId: string }, "BILLING", { contactName: ship.contactName, phone: ship.phone ?? undefined, line1: ship.line1, line2: ship.line2 ?? undefined, city: ship.city, region: ship.region ?? undefined, postalCode: ship.postalCode ?? undefined, countryCode: ship.countryCode });
  }
  delete out.newShipping; delete out.newBilling; delete out.billingSameAsShipping;
  return out;
}

async function nextOrderNumber(tx: DbOrTx) {
  const r = await tx.execute(sql`SELECT nextval('order_number_seq') AS n`);
  return `VLD-${new Date().getFullYear()}-${String((r.rows[0] as { n: string }).n).padStart(6, "0")}`;
}

function snapshot(a: typeof addresses.$inferSelect, companyName: string): AddressSnapshot {
  return { companyName, contactName: a.contactName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, countryCode: a.countryCode };
}

export function taxRateFor(country: string, s: AppSettings) {
  return s.taxRules.byCountry[country] ?? s.taxRules.defaultRateBps;
}

export function paypalCapExceeded(totalCents: bigint, fxRate: string, s: AppSettings) {
  if (s.payments.paypalMaxOrderBaseMinor <= 0) return false;
  const base = convertMinorInverse(totalCents, fxRate);
  return base > BigInt(s.payments.paypalMaxOrderBaseMinor);
}

async function evaluateRisk(tx: DbOrTx, companyId: string, subtotalBase: bigint, shipCountry: string, s: AppSettings) {
  const reasons: string[] = [];
  const co = (await tx.select().from(companies).where(eq(companies.id, companyId)))[0];
  if (subtotalBase >= BigInt(s.orderRules.riskReviewThresholdBaseMinor)) reasons.push(`Order value at or above review threshold (${formatMoney(BigInt(s.orderRules.riskReviewThresholdBaseMinor), "USD")})`);
  if (s.orderRules.reviewFirstOrder) {
    const prior = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.companyId, companyId), inArray(orders.status, ["PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED"]))).limit(1);
    if (!prior.length) reasons.push("First paid order for this account");
  }
  if (co.approvedAt && Date.now() - co.approvedAt.getTime() < s.orderRules.newCompanyReviewDays * 86400_000) reasons.push(`Account approved less than ${s.orderRules.newCompanyReviewDays} days ago`);
  if (shipCountry !== co.countryCode) reasons.push(`Delivery country (${shipCountry}) differs from registration country (${co.countryCode})`);
  return { reasons, company: co };
}

type CreateArgs = {
  actor: Actor & { companyId: string }; priced: PricedCart; input: CheckoutInput; quoteId?: string | null;
  shippingBaseCents?: bigint | null; staffConfirmed?: boolean;
};

/** Shared order-creation core. Must run inside a transaction. */
async function insertOrder(tx: Tx, a: CreateArgs) {
  const { actor, priced, input } = a;
  const s = priced.settings;
  const problems = blockingIssues(priced);
  if (problems.length) throw new AppError(422, "Your order cannot be placed yet.", "ORDER_INVALID", problems);
  if (!priced.rate || priced.subtotalCents === null) throw badRequest("No exchange rate configured for the selected currency.");
  if (priced.rate.isSample && !sampleRatesAllowed()) throw new AppError(422, "Checkout in this currency is temporarily unavailable: exchange rate has not been verified.", "FX_NOT_VERIFIED");
  const method = s.shippingMethods.find((m) => m.code === input.shippingMethod);
  if (!method) throw badRequest("Unknown shipping method.");
  if (input.paymentMethod === "PAYPAL" && !s.payments.paypalEnabled) throw badRequest("PayPal is not enabled. Choose bank transfer.");
  if (input.paymentMethod === "MANUAL_TRANSFER" && !s.payments.manualTransferEnabled) throw badRequest("Bank transfer is not enabled.");

  const addr = await tx.select().from(addresses).where(and(eq(addresses.companyId, actor.companyId), inArray(addresses.id, [input.shippingAddressId, input.billingAddressId])));
  const ship = addr.find((x) => x.id === input.shippingAddressId && x.kind === "SHIPPING");
  const bill = addr.find((x) => x.id === input.billingAddressId && x.kind === "BILLING");
  if (!ship || !bill) throw badRequest("Please choose a valid delivery and billing address from your company profile.");

  const { reasons, company } = await evaluateRisk(tx, actor.companyId, priced.subtotalBaseCents, ship.countryCode, s);
  const needsConfirmation = !a.staffConfirmed && (s.orderRules.requireOrderConfirmation || method.quotedByStaff);
  const pendingReview = reasons.length > 0 || needsConfirmation;

  const shippingCents = a.shippingBaseCents ? convertMinor(a.shippingBaseCents, priced.rate.rate) : 0n;
  const taxRateBps = taxRateFor(ship.countryCode, s);
  const taxCents = percentOfBps(priced.subtotalCents + shippingCents, taxRateBps);
  const totalCents = priced.subtotalCents + shippingCents + taxCents;
  if (input.paymentMethod === "PAYPAL" && paypalCapExceeded(totalCents, priced.rate.rate, s)) {
    throw new AppError(422, `This order exceeds the PayPal limit configured for this store (${formatMoney(BigInt(s.payments.paypalMaxOrderBaseMinor), "USD")}). Please choose bank transfer, or split the order.`, "PAYPAL_LIMIT");
  }

  const number = await nextOrderNumber(tx);
  const exportDetails: Record<string, string> = {};
  for (const k of ["exporterOfRecord", "importerOfRecord", "consigneeTaxId", "exportNotes"] as const) if (input[k]) exportDetails[k] = input[k]!;
  const order = (await tx.insert(orders).values({
    number, companyId: actor.companyId, placedById: actor.userId, quoteId: a.quoteId ?? null,
    status: pendingReview ? "PENDING_REVIEW" : "AWAITING_PAYMENT",
    riskStatus: reasons.length ? "PENDING_REVIEW" : "NOT_REQUIRED", riskReasons: reasons,
    paymentMethod: input.paymentMethod, currency: priced.currency, fxRate: priced.rate.rate, fxSource: priced.rate.source, fxIsSample: priced.rate.isSample,
    subtotalBaseCents: priced.subtotalBaseCents, subtotalCents: priced.subtotalCents, shippingCents, taxRateBps, taxCents, totalCents,
    poNumber: input.poNumber || null, deliveryInstructions: input.deliveryInstructions || null,
    shippingMethod: method.name, shippingEstimateNote: method.quotedByStaff && !a.shippingBaseCents ? "Freight, insurance and delivery estimate to be confirmed by our logistics desk." : null,
    incoterm: input.incoterm || null, exportDetails,
    shippingAddress: snapshot(ship, company.legalName), billingAddress: snapshot(bill, company.legalName),
  }).returning())[0];
  await tx.insert(orderItems).values(priced.lines.map((l) => ({
    orderId: order.id, productId: l.productId, variantId: l.variantId, sku: l.sku, name: `${l.name} — ${l.variantLabel}`,
    quantity: l.quantity, unitBaseCents: l.unitBaseCents, unitCents: l.unitCents, lineCents: l.lineCents, priceSource: l.source,
  })));
  await tx.insert(orderEvents).values({
    orderId: order.id, type: "PLACED", actorUserId: actor.userId,
    message: pendingReview ? "Order received. Awaiting availability, freight and account review before payment is requested." : "Order received and confirmed. Awaiting payment.",
  });
  if (reasons.length) await tx.insert(orderEvents).values({ orderId: order.id, type: "RISK_FLAGGED", visibleToBuyer: false, message: `Risk review required: ${reasons.join("; ")}` });
  await audit(actor, "order.place", "order", order.id, { number, total: totalCents, currency: priced.currency, lines: priced.lines.length, quoteId: a.quoteId ?? null }, tx);
  await queueEmail(actor.email, `Valden — order ${number} received`,
    `Thank you. Order ${number} (${formatMoney(totalCents, priced.currency)}) has been received.\n${pendingReview ? "Our trade desk will confirm availability and freight before requesting payment." : "You can now complete payment."}\n\n${appUrl(`/portal/orders/${order.id}`)}`, tx);
  return order;
}

export async function placeOrderFromCart(actor: Actor, input: CheckoutInput) {
  assertBuyer(actor, "orders.place");
  return db.transaction(async (tx) => {
    const cart = await getOrCreateCart(tx, actor.userId, actor.companyId);
    // lock the cart row so concurrent submissions serialize
    await tx.execute(sql`SELECT id FROM carts WHERE id = ${cart.id} FOR UPDATE`);
    const items = await getCartItems(tx, cart.id);
    if (!items.length) throw new AppError(409, "Your cart is empty — this order may already have been placed.", "CART_EMPTY");
    const priced = await priceLines(tx, actor.companyId, items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), input.currency);
    const order = await insertOrder(tx, { actor, priced, input });
    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return order;
  });
}

/** Used by the quote flow: lines carry negotiated unit prices. */
export async function placeOrderFromLines(tx: Tx, actor: Actor & { companyId: string }, lines: LineInput[], input: CheckoutInput, quoteId: string, shippingBaseCents: bigint | null) {
  const priced = await priceLines(tx, actor.companyId, lines, input.currency, { ignoreOrderable: true });
  // A negotiated quotation replaces the online minimum-order rule.
  if (priced.minimum) priced.minimum.met = true;
  return insertOrder(tx, { actor, priced, input, quoteId, shippingBaseCents, staffConfirmed: true });
}

/* ------------------------------------------------------------------------- */
/* Reads with company isolation                                              */
/* ------------------------------------------------------------------------- */

export async function loadOrderFor(actor: Actor, orderId: string, tx: DbOrTx = db) {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw notFound("Order not found.");
  const o = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!o) throw notFound("Order not found.");
  const staffOk = actor.isStaff && (actor.permissions.has("orders.manage") || actor.permissions.has("payments.view") || actor.permissions.has("shipping.manage"));
  if (!staffOk && o.companyId !== actor.companyId) throw notFound("Order not found."); // 404, not 403: don't leak existence
  return o;
}

export async function orderBundle(actor: Actor, orderId: string) {
  const o = await loadOrderFor(actor, orderId);
  const [items, events, pays, ships] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, o.id)).orderBy(orderItems.id),
    db.select().from(orderEvents).where(eq(orderEvents.orderId, o.id)).orderBy(desc(orderEvents.createdAt)),
    db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)),
    db.select().from(shipments).where(eq(shipments.orderId, o.id)).orderBy(shipments.createdAt),
  ]);
  return { order: o, items, events: actor.isStaff ? events : events.filter((e) => e.visibleToBuyer), payments: pays, shipments: ships };
}

export async function listCompanyOrders(actor: Actor) {
  if (!actor.companyId) throw forbidden();
  return db.select().from(orders).where(eq(orders.companyId, actor.companyId)).orderBy(desc(orders.placedAt)).limit(200);
}

/* ------------------------------------------------------------------------- */
/* Lifecycle                                                                 */
/* ------------------------------------------------------------------------- */

async function event(tx: DbOrTx, orderId: string, type: string, message: string, actorId: string | null, visible = true) {
  await tx.insert(orderEvents).values({ orderId, type, message, actorUserId: actorId, visibleToBuyer: visible });
}

/** Staff confirms availability/freight and clears risk review → awaiting payment. */
export async function confirmOrder(actor: Actor, orderId: string, input: { shippingAmount?: string; shippingNote?: string; estimateNote?: string; note?: string }) {
  assertCan(actor, "orders.manage");
  return db.transaction(async (tx) => {
    const o = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!o) throw notFound();
    if (o.status !== "PENDING_REVIEW") throw conflict(`Order is ${o.status}; only orders pending review can be confirmed.`);
    let shippingCents = o.shippingCents;
    if (input.shippingAmount !== undefined && input.shippingAmount !== "") {
      const { decimalStringToMinor } = await import("@/lib/money");
      shippingCents = decimalStringToMinor(input.shippingAmount);
      if (shippingCents < 0n) throw badRequest("Freight cannot be negative.");
    }
    const taxCents = percentOfBps(toBig(o.subtotalCents) + shippingCents, o.taxRateBps);
    const totalCents = toBig(o.subtotalCents) + shippingCents + taxCents;
    await tx.update(orders).set({
      status: "AWAITING_PAYMENT", riskStatus: o.riskStatus === "PENDING_REVIEW" ? "APPROVED" : o.riskStatus,
      shippingCents, taxCents, totalCents, shippingEstimateNote: input.estimateNote?.trim() || o.shippingEstimateNote, updatedAt: new Date(),
    }).where(eq(orders.id, orderId));
    await event(tx, orderId, "CONFIRMED", `Order confirmed by trade desk. Freight: ${formatMoney(shippingCents, o.currency)}. Total due: ${formatMoney(totalCents, o.currency)}.${input.estimateNote ? ` Delivery estimate (provisional): ${input.estimateNote}` : ""}`, actor.userId);
    if (input.note) await event(tx, orderId, "NOTE", input.note, actor.userId, false);
    await audit(actor, "order.confirm", "order", orderId, { shippingCents, totalCents, riskWas: o.riskStatus }, tx);
    const buyer = await tx.execute(sql`SELECT email FROM users WHERE id = ${o.placedById}`);
    await queueEmail((buyer.rows[0] as { email: string }).email, `Valden — order ${o.number} confirmed`, `Your order ${o.number} has been confirmed. Amount due: ${formatMoney(totalCents, o.currency)}.\n\n${appUrl(`/portal/orders/${orderId}`)}`, tx);
    return { totalCents };
  });
}

export async function rejectOrder(actor: Actor, orderId: string, reason: string) {
  assertCan(actor, "orders.manage");
  if (reason.trim().length < 5) throw badRequest("Please give a reason.");
  return db.transaction(async (tx) => {
    const o = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!o) throw notFound();
    if (!["PENDING_REVIEW", "AWAITING_PAYMENT"].includes(o.status) || !["UNPAID", "FAILED"].includes(o.paymentStatus)) throw conflict("Only unpaid orders awaiting review or payment can be rejected.");
    await tx.update(orders).set({ status: "REJECTED", riskStatus: o.riskStatus === "PENDING_REVIEW" ? "REJECTED" : o.riskStatus, cancelReason: reason, cancelledAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, orderId));
    await tx.update(payments).set({ status: "CANCELLED", updatedAt: new Date() }).where(and(eq(payments.orderId, orderId), inArray(payments.status, ["CREATED", "APPROVED"])));
    await event(tx, orderId, "REJECTED", `Order declined: ${reason}`, actor.userId);
    await audit(actor, "order.reject", "order", orderId, { reason }, tx);
  });
}

export async function cancelOrder(actor: Actor, orderId: string, reason: string) {
  return db.transaction(async (tx) => {
    const o = await loadOrderFor(actor, orderId, tx);
    await tx.execute(sql`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`);
    const isBuyer = !actor.isStaff;
    if (isBuyer && !actor.permissions.has("orders.place")) throw forbidden();
    if (!isBuyer && !actor.permissions.has("orders.manage")) throw forbidden();
    const fresh = (await tx.select().from(orders).where(eq(orders.id, o.id)))[0];
    const openStatuses = ["PENDING_REVIEW", "AWAITING_PAYMENT"];
    if (!openStatuses.includes(fresh.status)) throw conflict("This order can no longer be cancelled online. Contact the trade desk.");
    if (["PENDING", "PAID", "PARTIALLY_REFUNDED", "DISPUTED"].includes(fresh.paymentStatus)) throw conflict("A payment is in progress or completed for this order. Contact the trade desk to cancel with a refund.");
    await tx.update(orders).set({ status: "CANCELLED", cancelReason: reason.slice(0, 500) || "Cancelled", cancelledAt: new Date(), updatedAt: new Date() }).where(eq(orders.id, o.id));
    await tx.update(payments).set({ status: "CANCELLED", updatedAt: new Date() }).where(and(eq(payments.orderId, o.id), inArray(payments.status, ["CREATED", "APPROVED"])));
    await event(tx, o.id, "CANCELLED", `Order cancelled${isBuyer ? " by buyer" : " by trade desk"}${reason ? `: ${reason}` : ""}.`, actor.userId);
    await audit(actor, "order.cancel", "order", o.id, { reason, by: isBuyer ? "buyer" : "staff" }, tx);
  });
}

/** Staff-driven fulfillment states (after payment). Shipped/delivered are derived from shipments. */
export async function setProcessing(actor: Actor, orderId: string) {
  assertCan(actor, "orders.manage");
  return db.transaction(async (tx) => {
    const o = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!o) throw notFound();
    if (o.status !== "PAID" || o.paymentStatus !== "PAID") throw conflict("Only fully paid orders can move to processing.");
    await tx.update(orders).set({ status: "PROCESSING", updatedAt: new Date() }).where(eq(orders.id, orderId));
    await event(tx, orderId, "PROCESSING", "Order is being prepared for dispatch.", actor.userId);
    await audit(actor, "order.processing", "order", orderId, {}, tx);
  });
}

export async function addOrderNote(actor: Actor, orderId: string, message: string, visible: boolean) {
  assertCan(actor, "orders.manage");
  if (!message.trim()) throw badRequest("Note is empty.");
  await event(db, orderId, "NOTE", message.trim().slice(0, 2000), actor.userId, visible);
  await audit(actor, "order.note", "order", orderId, { visible });
}

/* ------------------------------------------------------------------------- */
/* Shipments (manual fulfillment workflow)                                   */
/* ------------------------------------------------------------------------- */

export const ShipmentInput = z.object({
  carrier: z.string().trim().max(80).optional(),
  service: z.string().trim().max(80).optional(),
  trackingNumber: z.string().trim().max(80).optional(),
  packageCount: z.coerce.number().int().min(1).max(10_000).optional(),
  grossWeightKg: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).optional().or(z.literal("")),
  shippingCost: z.string().trim().optional(),
  insuredValue: z.string().trim().optional(),
  insuranceNote: z.string().trim().max(300).optional(),
  specialHandling: z.string().trim().max(300).optional(),
  estimatedDelivery: z.string().trim().max(120).optional(),
  estimateConfirmed: z.coerce.boolean().optional(),
  lines: z.array(z.object({ orderItemId: z.coerce.number().int(), quantity: z.coerce.number().int().min(0) })).min(1),
});

export async function createShipment(actor: Actor, orderId: string, raw: z.infer<typeof ShipmentInput>) {
  assertCan(actor, "shipping.manage");
  const input = ShipmentInput.parse(raw);
  const { decimalStringToMinor } = await import("@/lib/money");
  return db.transaction(async (tx) => {
    const o = (await tx.select().from(orders).where(eq(orders.id, orderId)).for("update"))[0];
    if (!o) throw notFound();
    if (!["PAID", "PROCESSING", "PARTIALLY_SHIPPED"].includes(o.status) || o.paymentStatus !== "PAID") throw conflict("Shipments can only be created for paid orders.");
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    const existing = await tx.select().from(shipments).where(and(eq(shipments.orderId, orderId), ne(shipments.status, "CANCELLED")));
    const shipped = new Map<number, number>();
    for (const s of existing) for (const l of s.lines) shipped.set(l.orderItemId, (shipped.get(l.orderItemId) ?? 0) + l.quantity);
    const lines: ShipmentLine[] = [];
    for (const l of input.lines.filter((x) => x.quantity > 0)) {
      const it = items.find((i) => i.id === l.orderItemId);
      if (!it) throw badRequest("Unknown order line.");
      const remaining = it.quantity - (shipped.get(it.id) ?? 0);
      if (l.quantity > remaining) throw badRequest(`${it.sku}: only ${remaining} units remain to ship.`);
      lines.push({ orderItemId: it.id, quantity: l.quantity });
    }
    if (!lines.length) throw badRequest("Select at least one unit to ship.");
    const reference = `${o.number}-S${existing.length + 1}`;
    const s = (await tx.insert(shipments).values({
      orderId, reference, carrier: input.carrier || null, service: input.service || null, trackingNumber: input.trackingNumber || null,
      packageCount: input.packageCount ?? null, grossWeightKg: input.grossWeightKg || null,
      shippingCostCents: input.shippingCost ? decimalStringToMinor(input.shippingCost) : null,
      insuredValueCents: input.insuredValue ? decimalStringToMinor(input.insuredValue) : null,
      insuranceNote: input.insuranceNote || null, specialHandling: input.specialHandling || null,
      estimatedDelivery: input.estimatedDelivery || null, estimateConfirmed: !!input.estimateConfirmed, lines,
    }).returning())[0];
    await event(tx, orderId, "SHIPMENT_CREATED", `Shipment ${reference} created (${lines.reduce((n, l) => n + l.quantity, 0)} units).`, actor.userId);
    await audit(actor, "shipment.create", "shipment", s.id, { orderId, reference, lines }, tx);
    if (o.status === "PAID") await tx.update(orders).set({ status: "PROCESSING", updatedAt: new Date() }).where(eq(orders.id, orderId));
    return s;
  });
}

const SHIP_FLOW: Record<string, string[]> = {
  PREPARING: ["READY", "IN_TRANSIT", "CANCELLED"], READY: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "EXCEPTION"], EXCEPTION: ["IN_TRANSIT", "DELIVERED", "CANCELLED"], DELIVERED: [], CANCELLED: [],
};

export async function updateShipment(actor: Actor, shipmentId: string, input: { status?: string; trackingNumber?: string; carrier?: string; estimatedDelivery?: string; estimateConfirmed?: boolean }) {
  assertCan(actor, "shipping.manage");
  return db.transaction(async (tx) => {
    const s = (await tx.select().from(shipments).where(eq(shipments.id, shipmentId)).for("update"))[0];
    if (!s) throw notFound();
    const patch: Partial<typeof shipments.$inferInsert> = {};
    if (input.status && input.status !== s.status) {
      if (!SHIP_FLOW[s.status]?.includes(input.status)) throw badRequest(`Cannot move shipment from ${s.status} to ${input.status}.`);
      patch.status = input.status as typeof s.status;
      if (input.status === "IN_TRANSIT" && !s.shippedAt) patch.shippedAt = new Date();
      if (input.status === "DELIVERED") patch.deliveredAt = new Date();
    }
    if (input.trackingNumber !== undefined) patch.trackingNumber = input.trackingNumber.trim() || null;
    if (input.carrier !== undefined) patch.carrier = input.carrier.trim() || null;
    if (input.estimatedDelivery !== undefined) patch.estimatedDelivery = input.estimatedDelivery.trim() || null;
    if (input.estimateConfirmed !== undefined) patch.estimateConfirmed = input.estimateConfirmed;
    await tx.update(shipments).set(patch).where(eq(shipments.id, shipmentId));
    if (patch.status) await event(tx, s.orderId, "SHIPMENT_STATUS", `Shipment ${s.reference}: ${patch.status.replace("_", " ").toLowerCase()}.`, actor.userId);
    await audit(actor, "shipment.update", "shipment", shipmentId, patch as Record<string, unknown>, tx);
    await recomputeFulfillment(tx, s.orderId);
  });
}

/** Derive SHIPPED / PARTIALLY_SHIPPED / DELIVERED from shipments. */
export async function recomputeFulfillment(tx: DbOrTx, orderId: string) {
  const o = (await tx.select().from(orders).where(eq(orders.id, orderId)))[0];
  if (!["PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED", "DELIVERED"].includes(o.status)) return;
  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const ships = (await tx.select().from(shipments).where(eq(shipments.orderId, orderId))).filter((s) => s.status !== "CANCELLED");
  const total = items.reduce((n, i) => n + i.quantity, 0);
  const dispatched = ships.filter((s) => ["IN_TRANSIT", "DELIVERED", "EXCEPTION"].includes(s.status)).flatMap((s) => s.lines).reduce((n, l) => n + l.quantity, 0);
  const delivered = ships.filter((s) => s.status === "DELIVERED").flatMap((s) => s.lines).reduce((n, l) => n + l.quantity, 0);
  let status: typeof o.status = "PROCESSING";
  if (delivered >= total && total > 0) status = "DELIVERED";
  else if (dispatched >= total && total > 0) status = "SHIPPED";
  else if (dispatched > 0) status = "PARTIALLY_SHIPPED";
  if (status !== o.status) {
    await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await event(tx, orderId, "STATUS", `Order status: ${status.replace("_", " ").toLowerCase()}.`, null);
  }
}
