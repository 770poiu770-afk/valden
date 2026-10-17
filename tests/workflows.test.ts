import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { orders, paymentEvents, payments, priceTiers, products, quotes, refunds, users, variants } from "@/db/schema";
import { loadActorByUserId, can, checkCredentials } from "@/lib/auth";
import { convertMinor, decimalStringToMinor, formatMoney, minorToDecimalString } from "@/lib/money";
import { buildTiers, computeWholesale, resolveUnitPrice } from "@/lib/pricing";
import { DEFAULT_SETTINGS, setSetting, getSettings } from "@/lib/settings";
import { changeCompanyStatus, registerBusiness, requestPasswordReset, resetPassword } from "@/server/accounts";
import { getProductDetail, searchCatalog } from "@/server/catalog";
import { upsertCartLines, viewCart } from "@/server/cart";
import { cancelOrder, confirmOrder, createShipment, loadOrderFor, orderBundle, placeOrderFromCart, updateShipment } from "@/server/orders";
import { acceptOffer, issueOffer, quoteBundle, requestQuote } from "@/server/quotes";
import { capturePayPalPayment, handlePayPalWebhook, issueRefund, recordManualPayment, startPayPalPayment, switchPaymentMethod } from "@/server/payments";
import { importPricesCsv, importProducts, parseCatalogCsv, exportPricesCsv } from "@/server/catalog-import";
import { setPayPalGateway } from "@/server/paypal";
import { approvedBuyer, fakeDoc, installFakePayPal, regInput, staff, type FakePayPal } from "./helpers";

const WH = { authAlgo: "SHA256withRSA", certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1", transmissionId: "t1", transmissionSig: "sig", transmissionTime: new Date().toISOString() };

async function variantOf(slug: string, i = 0) {
  const p = (await db.select().from(products).where(eq(products.slug, slug)))[0];
  if (!p) throw new Error(`missing ${slug}`);
  const v = (await db.select().from(variants).where(eq(variants.productId, p.id)).orderBy(variants.sku))[i];
  return { p, v };
}
const checkout = (b: { shippingAddressId: string; billingAddressId: string }, over: Record<string, unknown> = {}) => ({
  currency: "ILS" as const, shippingAddressId: b.shippingAddressId, billingAddressId: b.billingAddressId,
  shippingMethod: "VALDEN_FREIGHT", paymentMethod: "PAYPAL" as const, poNumber: "PO-7781", ...over,
});
/** Place an order and confirm it (freight) so it is awaiting payment. */
async function paidReadyOrder(b: Awaited<ReturnType<typeof approvedBuyer>>, slug = "apple-iphone-17-pro-256gb", qty = 20, over: Record<string, unknown> = {}) {
  const { v } = await variantOf(slug);
  await upsertCartLines(b.actor, [{ variantId: v.id, quantity: qty }], "set");
  const o = await placeOrderFromCart(b.actor, checkout(b, over) as never);
  await confirmOrder(await staff(), o.id, { shippingAmount: "1000.00", estimateNote: "Provisional" });
  return (await db.select().from(orders).where(eq(orders.id, o.id)))[0];
}

let pp: FakePayPal;
beforeAll(() => { pp = installFakePayPal(); });
afterAll(async () => { await pool.end(); });

/* ---------------------------------------------------------------- */
describe("money and pricing rules", () => {
  it("does exact integer currency conversion and formatting", () => {
    expect(convertMinor(194900n, "3.6")).toBe(701640n);
    expect(convertMinor(1n, "0.5")).toBe(1n); // round half up
    expect(decimalStringToMinor("300,000.00")).toBe(30000000n);
    expect(minorToDecimalString(31573800n)).toBe("315738.00");
    expect(formatMoney(30000000n, "ILS")).toBe("₪300,000.00");
  });
  it("applies the flat premium only where plausible and flags the rest", () => {
    const pol = DEFAULT_SETTINGS.pricingPolicy;
    expect(computeWholesale({ referencePriceCents: 159900, overrideCents: null, markupBps: null }, pol)).toMatchObject({ wholesaleCents: 194900, flag: "NONE" });
    const cheap = computeWholesale({ referencePriceCents: 19900, overrideCents: null, markupBps: null }, pol);
    expect(cheap.flag).toBe("FALLBACK_POLICY");
    expect(cheap.wholesaleCents).toBe(21492);
    expect(computeWholesale({ referencePriceCents: 19900, overrideCents: null, markupBps: null }, { ...pol, fallbackMode: "FLAG" }).flag).toBe("NEEDS_REVIEW");
    expect(computeWholesale({ referencePriceCents: 19900, overrideCents: 25000, markupBps: null }, pol)).toMatchObject({ wholesaleCents: 25000, flag: "OVERRIDE" });
  });
  it("builds tiers and resolves the best of contract and tier price", () => {
    const tiers = buildTiers(100000, 20, DEFAULT_SETTINGS.pricingPolicy.tierSchedule);
    expect(tiers.map((t) => t.minQty)).toEqual([20, 100, 200, 500, 1000]);
    expect(resolveUnitPrice(150, 100000, tiers, null)).toEqual({ unitCents: 98500, source: "TIER" });
    expect(resolveUnitPrice(150, 100000, tiers, 95000)).toEqual({ unitCents: 95000, source: "CONTRACT" });
    expect(resolveUnitPrice(1000, 100000, tiers, 95000)).toEqual({ unitCents: 94000, source: "TIER" });
  });
});

/* ---------------------------------------------------------------- */
describe("1–3. registration, approval and restricted pricing", () => {
  it("registers a business as pending with no wholesale access", async () => {
    const r = await registerBusiness(regInput(), [fakeDoc()]);
    const a = (await loadActorByUserId(r.userId))!;
    expect(a.companyStatus).toBe("PENDING_REVIEW");
    expect(can(a, "catalog.view_prices")).toBe(false);
    expect(can(a, "company.manage")).toBe(true);
    await expect(upsertCartLines(a, [{ sku: "X", quantity: 1 }])).rejects.toThrow(/permission|approved/i);
    const res = await searchCatalog({ q: "iphone" }, a);
    expect(res.items.every((i) => i.wholesaleCents === null)).toBe(true);
  });
  it("requires a document, strong password and unique email", async () => {
    await expect(registerBusiness(regInput(), [])).rejects.toThrow(/document/);
    await expect(registerBusiness(regInput({ password: "short" }), [fakeDoc()])).rejects.toThrow(/12 characters/);
    const i = regInput();
    await registerBusiness(i, [fakeDoc()]);
    await expect(registerBusiness({ ...i, legalName: "Other" }, [fakeDoc()])).rejects.toThrow(/already exists/);
  });
  it("approves, rejects and suspends with history and permission effects", async () => {
    const admin = await staff();
    const r1 = await registerBusiness(regInput(), [fakeDoc()]);
    await changeCompanyStatus(admin, r1.companyId, "APPROVED", "");
    const a1 = (await loadActorByUserId(r1.userId))!;
    expect(can(a1, "catalog.view_prices")).toBe(true);
    expect(can(a1, "orders.place")).toBe(true);
    await changeCompanyStatus(admin, r1.companyId, "SUSPENDED", "Overdue compliance review");
    expect(can((await loadActorByUserId(r1.userId))!, "orders.place")).toBe(false);
    const r2 = await registerBusiness(regInput(), [fakeDoc()]);
    await changeCompanyStatus(admin, r2.companyId, "REJECTED", "Could not verify registration");
    expect((await loadActorByUserId(r2.userId))!.companyStatus).toBe("REJECTED");
    await expect(changeCompanyStatus(admin, r2.companyId, "SUSPENDED", "invalid transition")).rejects.toThrow(/Cannot change/);
  });
  it("hides prices and staff fields from guests; shows them to approved buyers", async () => {
    const guest = await getProductDetail("apple-iphone-17-pro-max-1tb", null);
    expect(guest!.product.wholesaleCents).toBeNull();
    expect(guest!.tiers).toHaveLength(0);
    expect(guest!.product.supplierSku).toBeNull();
    expect(guest!.product.referencePriceCents).toBeNull();
    const b = await approvedBuyer();
    const d = await getProductDetail("apple-iphone-17-pro-max-1tb", b.actor);
    expect(d!.product.wholesaleCents).toBe(194900);
    expect(d!.tiers.length).toBeGreaterThan(1);
    expect(d!.product.referencePriceCents).toBeNull(); // reference price stays staff-only
  });
  it("ignores price filters for users without price access (no price probing)", async () => {
    const all = await searchCatalog({ category: "iphone" }, null);
    const filtered = await searchCatalog({ category: "iphone", maxPrice: "1", currency: "USD" }, null);
    expect(filtered.total).toBe(all.total);
  });
  it("locks login after repeated failures and supports one-time password reset", async () => {
    const i = regInput();
    const r = await registerBusiness(i, [fakeDoc()]);
    expect((await checkCredentials(i.email, "wrong-password-1")).ok).toBe(false);
    expect((await checkCredentials(i.email, i.password)).ok).toBe(true);
    const token = await requestPasswordReset(i.email);
    await resetPassword(token!, "BrandNewPassword99");
    await expect(resetPassword(token!, "AnotherPassword99")).rejects.toThrow(/invalid or has expired/);
    expect((await checkCredentials(i.email, "BrandNewPassword99")).ok).toBe(true);
    expect(r.userId).toBeTruthy();
  });
});

/* ---------------------------------------------------------------- */
describe("4. search and filtering", () => {
  it("searches by text, manufacturer, storage and sorts by price", async () => {
    const b = await approvedBuyer();
    const r = await searchCatalog({ q: "iphone 17 pro max" }, b.actor);
    expect(r.total).toBe(4);
    expect(r.items.every((i) => i.name.includes("iPhone 17 Pro Max"))).toBe(true);
    const asus = await searchCatalog({ category: "graphics-cards", manufacturer: ["ASUS"] }, b.actor);
    expect(asus.total).toBeGreaterThan(3);
    expect(asus.items.every((i) => i.manufacturer === "ASUS")).toBe(true);
    const tb = await searchCatalog({ category: "iphone", storage: "1024" }, b.actor);
    expect(tb.items.every((i) => i.attributes.storageGb === 1024)).toBe(true);
    const sorted = await searchCatalog({ category: "monitors", sort: "price_asc" }, b.actor);
    const prices = sorted.items.map((i) => i.wholesaleCents!);
    expect([...prices].sort((x, y) => x - y)).toEqual(prices);
    const priced = await searchCatalog({ category: "graphics-cards", minPrice: "5000", currency: "ILS" }, b.actor);
    expect(priced.items.every((i) => convertMinor(BigInt(i.wholesaleCents!), "3.6") >= 500000n)).toBe(true);
    const gpu = await searchCatalog({ category: "gaming-desktops", gpu: "5090" }, b.actor);
    expect(gpu.items.every((i) => String(i.attributes.gpu).includes("5090"))).toBe(true);
  });
});

/* ---------------------------------------------------------------- */
describe("5–8. quantities, tiers, cart persistence and a ₪300,000 order", () => {
  it("validates MOQ and case-pack increments", async () => {
    const b = await approvedBuyer();
    const { v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 7 }], "set");
    let cart = await viewCart(b.actor, "USD");
    expect(cart.lines[0].issues.join()).toMatch(/minimum order quantity is 20/);
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 22 }], "set");
    cart = await viewCart(b.actor, "USD");
    expect(cart.lines[0].issues.join()).toMatch(/multiples of 5/);
    await expect(placeOrderFromCart(b.actor, checkout(b) as never)).rejects.toThrow(/cannot be placed/);
  });
  it("applies quantity tiers server-side", async () => {
    const b = await approvedBuyer();
    const { p, v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 100 }], "set");
    const cart = await viewCart(b.actor, "USD");
    const tier = (await db.select().from(priceTiers).where(and(eq(priceTiers.productId, p.id), eq(priceTiers.minQty, 100))))[0];
    expect(cart.lines[0].unitBaseCents).toBe(tier.unitCents);
    expect(tier.unitCents).toBe(Math.round(p.wholesaleCents * 0.985));
    expect(cart.lines[0].source).toBe("TIER");
  });
  it("persists the cart across sessions", async () => {
    const b = await approvedBuyer();
    const { v } = await variantOf("samsung-galaxy-s26-ultra-512gb-12gb");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 20 }]);
    await upsertCartLines(b.actor, [{ sku: v.sku, quantity: 5 }]); // add by SKU
    const fresh = (await loadActorByUserId(b.userId))!;
    const cart = await viewCart(fresh, "EUR");
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(25);
    expect(cart.currency).toBe("EUR");
  });
  it("enforces the minimum order value (₪50,000)", async () => {
    const b = await approvedBuyer();
    const { v } = await variantOf("samsung-990-pro-2tb-m-2-2280");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 20 }], "set");
    const cart = await viewCart(b.actor, "ILS");
    expect(cart.minimum!.met).toBe(false);
    await expect(placeOrderFromCart(b.actor, checkout(b) as never)).rejects.toThrow(/cannot be placed/);
  });
  it("calculates an order above ₪300,000 exactly, with VAT and freight", async () => {
    const b = await approvedBuyer();
    const a = await variantOf("apple-iphone-17-pro-max-1tb");
    const g = await variantOf("asus-rog-astral-geforce-rtx-5090-oc-32gb-gddr7");
    await upsertCartLines(b.actor, [{ variantId: a.v.id, quantity: 45 }, { variantId: g.v.id, quantity: 10 }], "set");
    const cart = await viewCart(b.actor, "ILS");
    expect(cart.lines.every((l) => l.issues.length === 0)).toBe(true);
    expect(cart.target.reached).toBe(true);
    const order = await placeOrderFromCart(b.actor, checkout(b, { paymentMethod: "MANUAL_TRANSFER" }) as never);
    const items = (await orderBundle(b.actor, order.id)).items;
    const iphoneLine = items.find((i) => i.sku === a.v.sku)!;
    expect(iphoneLine.unitCents).toBe(701640n); // ₪7,016.40
    expect(iphoneLine.lineCents).toBe(31573800n);
    const sum = items.reduce((s, i) => s + i.lineCents, 0n);
    expect(order.subtotalCents).toBe(sum);
    expect(order.subtotalCents).toBeGreaterThanOrEqual(30000000n);
    expect(order.taxRateBps).toBe(1800);
    expect(order.taxCents).toBe((sum * 1800n + 5000n) / 10000n);
    expect(order.status).toBe("PENDING_REVIEW");
    expect(order.riskReasons.length).toBeGreaterThan(0);
    expect((await viewCart(b.actor, "ILS")).lines).toHaveLength(0); // cart cleared
    const conf = await confirmOrder(await staff(), order.id, { shippingAmount: "4500.00", estimateNote: "Indicative 5–7 business days after dispatch" });
    const o2 = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o2.status).toBe("AWAITING_PAYMENT");
    expect(o2.riskStatus).toBe("APPROVED");
    expect(o2.totalCents).toBe(o2.subtotalCents + 450000n + ((o2.subtotalCents + 450000n) * 1800n + 5000n) / 10000n);
    expect(conf.totalCents).toBe(o2.totalCents);
    expect(Number(o2.totalCents) / 100).toBeGreaterThan(300000);
  });
  it("rejects PayPal for orders above the configured PayPal cap", async () => {
    const b = await approvedBuyer();
    const a = await variantOf("apple-iphone-17-pro-max-1tb");
    await upsertCartLines(b.actor, [{ variantId: a.v.id, quantity: 60 }], "set");
    await expect(placeOrderFromCart(b.actor, checkout(b) as never)).rejects.toThrow(/PayPal limit/);
  });
});

/* ---------------------------------------------------------------- */
describe("9–10. quotations", () => {
  it("submits a quote, receives an offer, accepts and converts to an order", async () => {
    const b = await approvedBuyer();
    const admin = await staff("SALES");
    const { v } = await variantOf("apple-iphone-17-pro-max-256gb");
    const q = await requestQuote(b.actor, { currency: "USD", buyerNotes: "Monthly allocation", lines: [{ sku: v.sku, quantity: 500, targetUnitPrice: "1400" }] });
    expect(q.status).toBe("SUBMITTED");
    const bundle = await quoteBundle(admin, q.id);
    expect(bundle.items[0].targetUnitCents).toBe(140000);
    await issueOffer(admin, q.id, { lines: [{ id: bundle.items[0].id, offeredUnitPrice: "1450.00" }], shippingAmount: "2500", validityDays: 5, offerNotes: "Price held for 5 days" });
    const offered = (await db.select().from(quotes).where(eq(quotes.id, q.id)))[0];
    expect(offered.status).toBe("OFFERED");
    expect(offered.offerTotalBaseCents).toBe(145000n * 500n);
    const order = await acceptOffer(b.actor, q.id, checkout(b, { currency: "USD", paymentMethod: "MANUAL_TRANSFER" }));
    expect(order.status).toBe("PENDING_REVIEW"); // price agreed, but risk rules (new account, first order, value) still apply
    expect(order.riskReasons.join()).toMatch(/First paid order/);
    const items = (await orderBundle(b.actor, order.id)).items;
    expect(items[0].unitBaseCents).toBe(145000);
    expect(items[0].priceSource).toBe("QUOTE");
    expect(order.shippingCents).toBe(250000n);
    const after = (await db.select().from(quotes).where(eq(quotes.id, q.id)))[0];
    expect(after.status).toBe("CONVERTED");
    expect(after.orderId).toBe(order.id);
    await expect(acceptOffer(b.actor, q.id, checkout(b, { currency: "USD" }))).rejects.toThrow(/CONVERTED/);
  });
  it("refuses expired offers", async () => {
    const b = await approvedBuyer();
    const admin = await staff();
    const { v } = await variantOf("apple-ipad-pro-13-m5-256gb-wi-fi");
    const q = await requestQuote(b.actor, { lines: [{ variantId: v.id, quantity: 50 }] });
    const bundle = await quoteBundle(admin, q.id);
    await issueOffer(admin, q.id, { lines: [{ id: bundle.items[0].id, offeredUnitPrice: "1500" }] });
    await db.update(quotes).set({ offerExpiresAt: new Date(Date.now() - 1000) }).where(eq(quotes.id, q.id));
    await expect(acceptOffer(b.actor, q.id, checkout(b, { currency: "USD" }))).rejects.toThrow(/expired/i);
  });
});

/* ---------------------------------------------------------------- */
describe("11–15. PayPal sandbox flow, webhooks, failures and refunds", () => {
  it("creates a PayPal order server-side, reuses it, and captures with verification", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const first = await startPayPalPayment(b.actor, order.id);
    const again = await startPayPalPayment(b.actor, order.id);
    expect(again.paypalOrderId).toBe(first.paypalOrderId); // idempotent re-use
    const created = pp.orders.get(first.paypalOrderId)!;
    expect(created.amount).toEqual({ currency_code: "ILS", value: minorToDecimalString(order.totalCents) });
    expect(created.customId).toBe(order.id);
    pp.captureBehaviour = "COMPLETED";
    const res = await capturePayPalPayment(b.actor, order.id, first.paypalOrderId);
    expect(res.status).toBe("COMPLETED");
    const o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.status).toBe("PAID");
    expect(o.paymentStatus).toBe("PAID");
    const p = (await db.select().from(payments).where(eq(payments.orderId, order.id)))[0];
    expect(p.providerCaptureId).toBe(`CAP-${first.paypalOrderId}`);
    expect(await capturePayPalPayment(b.actor, order.id, first.paypalOrderId)).toEqual({ status: "COMPLETED" }); // idempotent
  });
  it("refuses payment before trade-desk confirmation", async () => {
    const b = await approvedBuyer();
    const { v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 20 }], "set");
    const o = await placeOrderFromCart(b.actor, checkout(b) as never);
    await expect(startPayPalPayment(b.actor, o.id)).rejects.toThrow(/being reviewed/);
  });
  it("never marks paid on amount mismatch", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    pp.captureBehaviour = "WRONG_AMOUNT";
    expect((await capturePayPalPayment(b.actor, order.id, s.paypalOrderId)).status).toBe("MISMATCH");
    const o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.paymentStatus).toBe("PENDING");
    expect(o.status).toBe("AWAITING_PAYMENT");
    pp.captureBehaviour = "COMPLETED";
  });
  it("handles declined and instrument-declined captures", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    pp.captureBehaviour = "INSTRUMENT_DECLINED";
    expect((await capturePayPalPayment(b.actor, order.id, s.paypalOrderId)).status).toBe("INSTRUMENT_DECLINED");
    pp.captureBehaviour = "DECLINED";
    expect((await capturePayPalPayment(b.actor, order.id, s.paypalOrderId)).status).toBe("FAILED");
    const o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.paymentStatus).toBe("FAILED");
    expect(o.status).toBe("AWAITING_PAYMENT"); // buyer can retry
    pp.captureBehaviour = "COMPLETED";
    const retry = await startPayPalPayment(b.actor, order.id);
    expect(retry.paypalOrderId).not.toBe(s.paypalOrderId);
    expect((await capturePayPalPayment(b.actor, order.id, retry.paypalOrderId)).status).toBe("COMPLETED");
  });
  it("processes verified webhooks once and rejects unverified ones", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    const amount = { currency_code: "ILS", value: minorToDecimalString(order.totalCents) };
    const evt = { id: `WH-${s.paypalOrderId}`, event_type: "PAYMENT.CAPTURE.COMPLETED", resource_type: "capture", resource: { id: `CAP-${s.paypalOrderId}`, status: "COMPLETED", amount, custom_id: order.id, supplementary_data: { related_ids: { order_id: s.paypalOrderId } } } };
    pp.verify = false;
    expect(await handlePayPalWebhook(WH, JSON.stringify(evt))).toEqual({ status: 400, result: "signature_verification_failed" });
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].paymentStatus).toBe("UNPAID");
    pp.verify = true;
    expect(await handlePayPalWebhook(WH, JSON.stringify(evt))).toEqual({ status: 200, result: "capture_completed" });
    expect(await handlePayPalWebhook(WH, JSON.stringify(evt))).toEqual({ status: 200, result: "duplicate_ignored" });
    const evRows = await db.select().from(paymentEvents).where(eq(paymentEvents.providerEventId, evt.id));
    expect(evRows).toHaveLength(1);
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("PAID");
    expect(await handlePayPalWebhook(WH, "{not json")).toMatchObject({ status: 400 });
  });
  it("issues partial and full refunds, blocks over-refunds, records dashboard refunds", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    await capturePayPalPayment(b.actor, order.id, s.paypalOrderId);
    const fin = await staff("FINANCE");
    const sales = await staff("SALES");
    await expect(issueRefund(sales, order.id, { amount: "10.00", reason: "Not allowed" })).rejects.toThrow(/permission/);
    const total = order.totalCents;
    await issueRefund(fin, order.id, { amount: "1000.00", reason: "Freight adjustment" });
    let o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.paymentStatus).toBe("PARTIALLY_REFUNDED");
    expect(o.refundedCents).toBe(100000n);
    await expect(issueRefund(fin, order.id, { amount: minorToDecimalString(total), reason: "Too much" })).rejects.toThrow(/Maximum refundable/);
    // remaining refunded "in PayPal dashboard" → arrives by webhook
    const p = (await db.select().from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, "PARTIALLY_REFUNDED"))))[0];
    const rest = { currency_code: "ILS", value: minorToDecimalString(total - 100000n) };
    const evt = { id: `WH-RF-${p.id}`, event_type: "PAYMENT.CAPTURE.REFUNDED", resource: { id: `DASH-${p.id.slice(0, 8)}`, status: "COMPLETED", amount: rest, links: [{ rel: "up", href: `https://api.sandbox.paypal.com/v2/payments/captures/${p.providerCaptureId}` }] } };
    expect((await handlePayPalWebhook(WH, JSON.stringify(evt))).result).toBe("refund_recorded");
    o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.paymentStatus).toBe("REFUNDED");
    expect(o.refundedCents).toBe(total);
    expect(o.status).toBe("CANCELLED");
    expect((await db.select().from(refunds).where(eq(refunds.orderId, order.id)))).toHaveLength(2);
  });
  it("records disputes from webhooks", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    await capturePayPalPayment(b.actor, order.id, s.paypalOrderId);
    const evt = { id: `WH-DSP-${s.paypalOrderId}`, event_type: "CUSTOMER.DISPUTE.CREATED", resource: { id: "PP-D-1", disputed_transactions: [{ seller_transaction_id: `CAP-${s.paypalOrderId}` }] } };
    expect((await handlePayPalWebhook(WH, JSON.stringify(evt))).result).toBe("disputed");
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].paymentStatus).toBe("DISPUTED");
  });
  it("records verified bank transfers and blocks duplicates", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b, "apple-iphone-17-pro-256gb", 20, { paymentMethod: "MANUAL_TRANSFER" });
    const fin = await staff("FINANCE");
    await expect(recordManualPayment(fin, order.id, { amount: "1.00", reference: "TRX-1" })).rejects.toThrow(/must equal/);
    await recordManualPayment(fin, order.id, { amount: minorToDecimalString(order.totalCents), reference: "TRX-0001" });
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("PAID");
    await expect(recordManualPayment(fin, order.id, { amount: minorToDecimalString(order.totalCents), reference: "TRX-0001" })).rejects.toThrow();
  });
  it("lets buyers cancel unpaid orders and switch payment method", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    await switchPaymentMethod(b.actor, order.id, "MANUAL_TRANSFER");
    await cancelOrder(b.actor, order.id, "Budget moved");
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("CANCELLED");
  });
  it("supports multi-shipment manual fulfillment", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b, "apple-iphone-17-pro-256gb", 40, { paymentMethod: "MANUAL_TRANSFER" });
    await recordManualPayment(await staff("FINANCE"), order.id, { amount: minorToDecimalString(order.totalCents), reference: "TRX-SHIP" });
    const ful = await staff("FULFILLMENT");
    const item = (await orderBundle(ful, order.id)).items[0];
    const s1 = await createShipment(ful, order.id, { lines: [{ orderItemId: item.id, quantity: 25 }], carrier: "Manual freight", packageCount: 2 });
    await expect(createShipment(ful, order.id, { lines: [{ orderItemId: item.id, quantity: 16 }] })).rejects.toThrow(/only 15/);
    await updateShipment(ful, s1.id, { status: "IN_TRANSIT", trackingNumber: "ENTERED-BY-STAFF-1" });
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("PARTIALLY_SHIPPED");
    const s2 = await createShipment(ful, order.id, { lines: [{ orderItemId: item.id, quantity: 15 }] });
    await updateShipment(ful, s2.id, { status: "IN_TRANSIT" });
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("SHIPPED");
    await updateShipment(ful, s1.id, { status: "DELIVERED" });
    await updateShipment(ful, s2.id, { status: "DELIVERED" });
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].status).toBe("DELIVERED");
  });
});

/* ---------------------------------------------------------------- */
describe("16–17. access restrictions and company isolation", () => {
  it("restricts admin actions by role", async () => {
    const b = await approvedBuyer();
    const catalogRole = await staff("CATALOG");
    const r = await registerBusiness(regInput(), [fakeDoc()]);
    await expect(changeCompanyStatus(b.actor, r.companyId, "APPROVED", "")).rejects.toThrow(/permission/);
    await expect(changeCompanyStatus(catalogRole, r.companyId, "APPROVED", "")).rejects.toThrow(/permission/);
    const order = await paidReadyOrder(b);
    await expect(confirmOrder(b.actor, order.id, {})).rejects.toThrow(/permission/);
    await expect(recordManualPayment(b.actor, order.id, { amount: "1", reference: "XXXX" })).rejects.toThrow(/permission/);
    expect(can(catalogRole, "admin.access")).toBe(true);
    expect(can(b.actor, "admin.access")).toBe(false);
  });
  it("isolates orders and quotes between companies", async () => {
    const a = await approvedBuyer();
    const other = await approvedBuyer();
    const order = await paidReadyOrder(a);
    await expect(loadOrderFor(other.actor, order.id)).rejects.toThrow(/not found/i);
    await expect(startPayPalPayment(other.actor, order.id)).rejects.toThrow(/not found/i);
    await expect(cancelOrder(other.actor, order.id, "x")).rejects.toThrow(/not found/i);
    const { v } = await variantOf("apple-iphone-17-pro-256gb");
    const q = await requestQuote(a.actor, { lines: [{ variantId: v.id, quantity: 100 }] });
    await expect(quoteBundle(other.actor, q.id)).rejects.toThrow(/not found/i);
    await expect(acceptOffer(other.actor, q.id, checkout(other))).rejects.toThrow(/not found/i);
    // addresses of another company cannot be used
    await upsertCartLines(other.actor, [{ variantId: v.id, quantity: 20 }], "set");
    await expect(placeOrderFromCart(other.actor, checkout({ shippingAddressId: a.shippingAddressId, billingAddressId: a.billingAddressId }) as never)).rejects.toThrow(/valid delivery/);
  });
});

/* ---------------------------------------------------------------- */
describe("18. product import and price updates", () => {
  it("imports prices from CSV, recomputes wholesale and tiers, and exports", async () => {
    const before = (await db.select().from(products).where(eq(products.slug, "apple-iphone-17-pro-256gb")))[0];
    const csv = `slug,reference_price_usd,reference_source,reference_verified_at,reference_is_sample\napple-iphone-17-pro-256gb,1600.00,Distributor price list Oct 2026,2026-10-15,false\nunknown-slug,10,,,\n`;
    const r = await importPricesCsv(csv, null);
    expect(r.updated).toBe(1);
    expect(r.errors).toHaveLength(1);
    const after = (await db.select().from(products).where(eq(products.slug, "apple-iphone-17-pro-256gb")))[0];
    expect(after.referencePriceCents).toBe(160000);
    expect(after.wholesaleCents).toBe(195000);
    expect(after.pricingFlag).toBe("NONE");
    expect(after.referenceIsSample).toBe(false);
    expect(after.wholesaleCents).not.toBe(before.wholesaleCents);
    const t = await db.select().from(priceTiers).where(eq(priceTiers.productId, after.id));
    expect(t.find((x) => x.minQty === after.moq)!.unitCents).toBe(195000);
    expect(await exportPricesCsv()).toContain("apple-iphone-17-pro-256gb,Apple iPhone 17 Pro 256GB,1600.00");
    // restore the sample reference so later tests keep their expectations
    await importPricesCsv("slug,reference_price_usd,reference_is_sample\napple-iphone-17-pro-256gb,1099.00,true\n", null);
  });
  it("imports a new product from catalog CSV and rejects invalid rows", async () => {
    const csv = [
      "slug,name,manufacturer,model,category,subcategory,condition,summary,specs,attributes_json,reference_price_usd,moq,availability,image_key,variant_sku,variant_label",
      `test-docking-station-x,Test Dock X,TestCo,Dock X,components,Docks & connectivity,NEW,A test dock,Overview|Ports|12,"{""formFactor"":""Dock""}",2500.00,5,ON_REQUEST,dock,VLD-ACC-TEST01-01,Standard`,
      `bad-row,,TestCo,Y,nope,Sub,NEW,,,,10,1,ON_REQUEST,dock,VLD-ACC-TEST02-01,Standard`,
    ].join("\n");
    const parsed = parseCatalogCsv(csv);
    const r = await importProducts(parsed.products);
    expect(r.created).toBe(1);
    expect(r.errors.length).toBe(1);
    const p = (await db.select().from(products).where(eq(products.slug, "test-docking-station-x")))[0];
    expect(p.wholesaleCents).toBe(285000);
    expect(p.isSample).toBe(true);
    expect(p.purchasable).toBe(false);
  });
  it("re-prices all products when the pricing policy changes", async () => {
    const s = await getSettings();
    await setSetting("pricingPolicy", { ...s.pricingPolicy, targetPremiumMinor: 30000 }, null);
    const { recomputeAllPrices } = await import("@/server/catalog-import");
    await recomputeAllPrices(null);
    const p = (await db.select().from(products).where(eq(products.slug, "apple-iphone-17-pro-max-1tb")))[0];
    expect(p.wholesaleCents).toBe(189900);
    await setSetting("pricingPolicy", s.pricingPolicy, null);
    await recomputeAllPrices(null);
  });
});

describe("misc", () => {
  it("never leaks password hashes through actors", async () => {
    const b = await approvedBuyer();
    expect(JSON.stringify(b.actor)).not.toMatch(/\$2[aby]\$/);
    const u = (await db.select().from(users).where(eq(users.id, b.userId)))[0];
    expect(u.passwordHash.startsWith("$2")).toBe(true);
  });
  it("real gateway rejects webhooks without a webhook ID or with a non-PayPal cert URL", async () => {
    const { HttpPayPalGateway } = await import("@/server/paypal");
    const g = new HttpPayPalGateway();
    const prev = process.env.PAYPAL_WEBHOOK_ID;
    delete process.env.PAYPAL_WEBHOOK_ID;
    expect(await g.verifyWebhook(WH, {})).toBe(false);
    process.env.PAYPAL_WEBHOOK_ID = "WH-TEST";
    expect(await g.verifyWebhook({ ...WH, certUrl: "https://evil.example.com/cert.pem" }, {})).toBe(false);
    if (prev === undefined) delete process.env.PAYPAL_WEBHOOK_ID; else process.env.PAYPAL_WEBHOOK_ID = prev;
    expect(g.isConfigured()).toBe(!!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET));
  });
});
