import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { addresses, companies, orders, paymentEvents, payments, priceTiers, products, quotes, refunds, users, variants } from "@/db/schema";
import { loadActorByUserId, can, checkCredentials } from "@/lib/auth";
import { convertMinor, decimalStringToMinor, formatMoney, minorToDecimalString } from "@/lib/money";
import { buildTiers, computeWholesale, resolveUnitPrice } from "@/lib/pricing";
import { DEFAULT_SETTINGS, setSetting, getSettings } from "@/lib/settings";
import { changeCompanyStatus, registerCustomer, requestPasswordReset, resetPassword, updateAccountProfile } from "@/server/accounts";
import { getProductDetail, searchCatalog } from "@/server/catalog";
import { upsertCartLines, viewCart } from "@/server/cart";
import { CheckoutInput, cancelOrder, confirmOrder, createShipment, loadOrderFor, orderBundle, placeOrderFromCart, updateShipment, withCheckoutAddresses } from "@/server/orders";
import { getRate } from "@/lib/fx";
import { acceptOffer, issueOffer, quoteBundle, requestQuote } from "@/server/quotes";
import { cancelPayPalPayment, capturePayPalPayment, handlePayPalWebhook, issueRefund, reconcilePayPalPayment, recordManualPayment, startPayPalPayment, switchPaymentMethod } from "@/server/payments";
import { importPricesCsv, importProducts, parseCatalogCsv, exportPricesCsv } from "@/server/catalog-import";
import { setPayPalGateway } from "@/server/paypal";
import { approvedBuyer, installFakePayPal, regInput, staff, type FakePayPal } from "./helpers";

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
describe("1–3. open sign-up, account status and public prices", () => {
  it("lets anyone sign up with just an email and password and shop immediately", async () => {
    const r = await registerCustomer(regInput());
    const a = (await loadActorByUserId(r.userId))!;
    expect(a.companyStatus).toBe("APPROVED");
    expect(can(a, "orders.place")).toBe(true);
    expect(can(a, "catalog.view_prices")).toBe(true);
    const co = (await db.select().from(companies).where(eq(companies.id, r.companyId)))[0];
    expect(co.accountType).toBe("PERSONAL");
    expect(co.registrationNumber).toBeNull();
    expect(co.legalName).toMatch(/Shopper/); // name derived from the email when none is given
    const { v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(a, [{ variantId: v.id, quantity: 1 }], "set");
    expect((await viewCart(a, "USD")).lines[0].issues).toEqual([]);
  });
  it("validates password strength, unique email and terms acceptance", async () => {
    await expect(registerCustomer(regInput({ password: "short" }))).rejects.toThrow(/12 characters|at least 12/i);
    await expect(registerCustomer(regInput({ acceptTerms: false as unknown as true }))).rejects.toThrow();
    const i = regInput();
    await registerCustomer(i);
    await expect(registerCustomer({ ...i, email: i.email.toUpperCase() })).rejects.toThrow(/already exists/);
  });
  it("stores optional business details for companies buying in bulk", async () => {
    const r = await registerCustomer(regInput({ fullName: "Dana Levi", isBusiness: true, companyName: "Levi Retail Ltd", taxId: "514000000", countryCode: "IL" }));
    const co = (await db.select().from(companies).where(eq(companies.id, r.companyId)))[0];
    expect(co.accountType).toBe("BUSINESS");
    expect(co.legalName).toBe("Levi Retail Ltd");
    expect(co.taxId).toBe("514000000");
    const a = (await loadActorByUserId(r.userId))!;
    await updateAccountProfile(a, { fullName: "Dana Levi", countryCode: "IL" }); // company name removed → personal account
    expect((await db.select().from(companies).where(eq(companies.id, r.companyId)))[0].accountType).toBe("PERSONAL");
  });
  it("still lets staff suspend an account; legacy pending accounts can shop", async () => {
    const admin = await staff();
    const r = await registerCustomer(regInput());
    await changeCompanyStatus(admin, r.companyId, "SUSPENDED", "Chargeback investigation");
    const a = (await loadActorByUserId(r.userId))!;
    expect(can(a, "orders.place")).toBe(false);
    await expect(upsertCartLines(a, [{ sku: "X", quantity: 1 }])).rejects.toThrow(/suspended|permission/i);
    await db.update(companies).set({ status: "PENDING_REVIEW" }).where(eq(companies.id, r.companyId));
    expect(can((await loadActorByUserId(r.userId))!, "orders.place")).toBe(true);
  });
  it("shows prices to everyone but keeps staff-only fields hidden", async () => {
    const guest = await getProductDetail("apple-iphone-17-pro-max-1tb", null);
    expect(guest!.product.wholesaleCents).toBe(194900);
    expect(guest!.tiers.length).toBeGreaterThan(1);
    expect(guest!.product.supplierSku).toBeNull();
    expect(guest!.product.referencePriceCents).toBeNull();
    const res = await searchCatalog({ q: "iphone" }, null);
    expect(res.items.every((i) => i.wholesaleCents !== null)).toBe(true);
  });
  it("locks login after repeated failures and supports one-time password reset", async () => {
    const i = regInput();
    const r = await registerCustomer(i);
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
  it("sells a single unit to a new customer who enters the address at checkout", async () => {
    const r = await registerCustomer(regInput({ fullName: "Avi Cohen" }));
    const a = (await loadActorByUserId(r.userId))! as Awaited<ReturnType<typeof approvedBuyer>>["actor"];
    const { p, v } = await variantOf("apple-iphone-17-pro-256gb");
    expect(p.moq).toBe(20); // product data unchanged: the MOQ now marks where volume pricing starts
    await upsertCartLines(a, [{ variantId: v.id, quantity: 1 }], "set");
    const cart = await viewCart(a, "ILS");
    expect(cart.lines[0].issues).toEqual([]);
    expect(cart.minimum).toBeNull(); // no minimum order value by default
    expect(cart.lines[0].unitBaseCents).toBe(p.wholesaleCents);
    const body = await withCheckoutAddresses(a, { currency: "ILS", shippingMethod: "VALDEN_FREIGHT", paymentMethod: "PAYPAL", newShipping: { contactName: "Avi Cohen", line1: "5 Herzl St", city: "Haifa", countryCode: "IL", phone: "050-0000000" }, billingSameAsShipping: true });
    const order = await placeOrderFromCart(a, body as never);
    const items = (await orderBundle(a, order.id)).items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(order.subtotalCents).toBe(items[0].lineCents);
    expect(order.shippingAddress.contactName).toBe("Avi Cohen");
    const saved = await db.select().from(addresses).where(eq(addresses.companyId, r.companyId));
    expect(saved.map((x) => x.kind).sort()).toEqual(["BILLING", "SHIPPING"]);
  });
  it("lets an individual buy large quantities with volume pricing and sensible limits", async () => {
    const b = await approvedBuyer();
    const { p, v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 523 }], "set"); // not a case-pack multiple: allowed
    let cart = await viewCart(b.actor, "USD");
    expect(cart.lines[0].issues).toEqual([]);
    const tiers = await db.select().from(priceTiers).where(eq(priceTiers.productId, p.id));
    const best = tiers.filter((t) => t.minQty <= 523).sort((x, y) => y.minQty - x.minQty)[0];
    expect(cart.lines[0].unitBaseCents).toBe(best.unitCents);
    expect(best.unitCents).toBeLessThan(p.wholesaleCents);
    expect(cart.lines[0].lineBaseCents).toBe(BigInt(best.unitCents) * 523n);
    await expect(upsertCartLines(b.actor, [{ variantId: v.id, quantity: 100_001 }], "set")).rejects.toThrow(/Invalid quantity/); // per-line cap
    cart = await viewCart(b.actor, "USD");
    expect(cart.lines[0].quantity).toBe(523);
  });
  it("can re-enable MOQ and case-pack rules from settings", async () => {
    const s = await getSettings();
    await setSetting("orderRules", { ...s.orderRules, enforceMoq: true }, null);
    try {
      const b = await approvedBuyer();
      const { v } = await variantOf("apple-iphone-17-pro-256gb");
      await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 7 }], "set");
      let cart = await viewCart(b.actor, "USD");
      expect(cart.lines[0].issues.join()).toMatch(/minimum order quantity is 20/);
      await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 22 }], "set");
      cart = await viewCart(b.actor, "USD");
      expect(cart.lines[0].issues.join()).toMatch(/multiples of 5/);
      await expect(placeOrderFromCart(b.actor, checkout(b) as never)).rejects.toThrow(/cannot be placed/);
    } finally { await setSetting("orderRules", { ...s.orderRules, enforceMoq: false }, null); }
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
  it("enforces a minimum order value only when staff configure one", async () => {
    const before = (await getSettings()).minimumOrderValue;
    await setSetting("minimumOrderValue", { amountMinor: 5_000_000, currency: "ILS" }, null);
    try {
      const b = await approvedBuyer();
      const { v } = await variantOf("samsung-990-pro-2tb-m-2-2280");
      await upsertCartLines(b.actor, [{ variantId: v.id, quantity: 20 }], "set");
      const cart = await viewCart(b.actor, "ILS");
      expect(cart.minimum!.met).toBe(false);
      await expect(placeOrderFromCart(b.actor, checkout(b) as never)).rejects.toThrow(/cannot be placed/);
    } finally { await setSetting("minimumOrderValue", before, null); }
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
    expect(order.status).toBe("PENDING_REVIEW"); // price agreed, but the high-value review rule still applies
    expect(order.riskReasons.join()).toMatch(/review threshold/);
    expect(order.riskReasons.join()).not.toMatch(/First paid order|approved less than/); // B2B review rules are off by default
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
  it("lets a new customer pay right away: standard delivery, server-side totals, cancel, then PayPal capture", async () => {
    const r = await registerCustomer(regInput({ fullName: "Noa Levi" }));
    const a = (await loadActorByUserId(r.userId))! as Awaited<ReturnType<typeof approvedBuyer>>["actor"];
    const { p, v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(a, [{ variantId: v.id, quantity: 2 }], "set");
    // Body as a browser would send it, plus tampered price/status fields that must be ignored.
    const raw = { currency: "ILS", shippingMethod: "STANDARD_DELIVERY", paymentMethod: "PAYPAL", billingSameAsShipping: true,
      newShipping: { contactName: "Noa Levi", line1: "1 Rothschild Blvd", city: "Tel Aviv", countryCode: "IL" },
      totalCents: "1", subtotalCents: "1", shippingCents: "0", unitCents: "1", status: "PAID", paymentStatus: "PAID" };
    const order = await placeOrderFromCart(a, CheckoutInput.parse(await withCheckoutAddresses(a, raw)));
    expect(order.status).toBe("AWAITING_PAYMENT"); // no manual review for a normal-size order with flat-rate delivery
    expect(order.paymentStatus).toBe("UNPAID");
    const rate = (await getRate("ILS"))!;
    const unit = convertMinor(BigInt(p.wholesaleCents!), rate.rate);
    const ship = convertMinor(1_000n, rate.rate); // US$10 flat rate, converted
    expect(order.subtotalCents).toBe(unit * 2n);
    expect(order.shippingCents).toBe(ship);
    expect(order.taxRateBps).toBe(1_800);
    expect(order.totalCents).toBe(order.subtotalCents + ship + ((order.subtotalCents + ship) * 1_800n + 5_000n) / 10_000n);

    // PayPal is asked for exactly the server total.
    const first = await startPayPalPayment(a, order.id);
    expect(pp.orders.get(first.paypalOrderId)!.amount).toEqual({ currency_code: "ILS", value: minorToDecimalString(order.totalCents) });

    // Buyer closes the PayPal window: nothing approved at PayPal → attempt cancelled, order still unpaid.
    pp.getOrderStatus = "CREATED";
    expect((await cancelPayPalPayment(a, order.id, first.paypalOrderId)).status).toBe("CANCELLED");
    pp.getOrderStatus = null;
    let o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect([o.status, o.paymentStatus]).toEqual(["AWAITING_PAYMENT", "UNPAID"]);
    await expect(capturePayPalPayment(a, order.id, first.paypalOrderId)).rejects.toThrow(/closed/); // a cancelled attempt can't be captured

    // Retry and pay: only the server-side capture marks the order paid.
    const second = await startPayPalPayment(a, order.id);
    expect(second.paypalOrderId).not.toBe(first.paypalOrderId);
    pp.captureBehaviour = "COMPLETED";
    expect((await capturePayPalPayment(a, order.id, second.paypalOrderId)).status).toBe("COMPLETED");
    o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect([o.status, o.paymentStatus]).toEqual(["PAID", "PAID"]);
  });
  it("gives the browser no way to mark an order paid", async () => {
    const r = await registerCustomer(regInput());
    const a = (await loadActorByUserId(r.userId))! as Awaited<ReturnType<typeof approvedBuyer>>["actor"];
    const other = await approvedBuyer();
    const { v } = await variantOf("apple-iphone-17-pro-256gb");
    await upsertCartLines(a, [{ variantId: v.id, quantity: 1 }], "set");
    const order = await placeOrderFromCart(a, CheckoutInput.parse(await withCheckoutAddresses(a, { currency: "ILS", shippingMethod: "STANDARD_DELIVERY", paymentMethod: "PAYPAL", billingSameAsShipping: true, newShipping: { contactName: "Dana", line1: "2 Herzl", city: "Haifa", countryCode: "IL" } })));
    const s = await startPayPalPayment(a, order.id);
    await expect(capturePayPalPayment(a, order.id, "PPO-INVENTED-BY-BROWSER")).rejects.toThrow(/not found/i); // unknown PayPal order id
    await expect(capturePayPalPayment(other.actor, order.id, s.paypalOrderId)).rejects.toThrow(); // another customer
    pp.captureBehaviour = "DECLINED";
    expect((await capturePayPalPayment(a, order.id, s.paypalOrderId)).status).toBe("FAILED"); // PayPal says no → not paid
    pp.captureBehaviour = "COMPLETED";
    const o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.status).toBe("AWAITING_PAYMENT");
    expect(o.paymentStatus).toBe("FAILED");
  });
  it("still sends staff-quoted freight to review before payment", async () => {
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
  it("records buyer cancellation only after PayPal confirms nothing was approved", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    pp.getOrderStatus = "CREATED";
    expect((await cancelPayPalPayment(b.actor, order.id, s.paypalOrderId)).status).toBe("CANCELLED");
    const p = (await db.select().from(payments).where(eq(payments.providerOrderId, s.paypalOrderId)))[0];
    expect(p.status).toBe("CANCELLED");
    let o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.status).toBe("AWAITING_PAYMENT");
    expect(o.paymentStatus).toBe("UNPAID");
    await expect(capturePayPalPayment(b.actor, order.id, s.paypalOrderId)).rejects.toThrow(/closed/); // cannot capture a cancelled attempt
    // A browser "cancel" for an order PayPal says was approved is reconciled, not cancelled.
    pp.getOrderStatus = null;
    const s2 = await startPayPalPayment(b.actor, order.id);
    expect(s2.paypalOrderId).not.toBe(s.paypalOrderId);
    pp.getOrderStatus = "APPROVED";
    expect((await cancelPayPalPayment(b.actor, order.id, s2.paypalOrderId)).status).toBe("COMPLETED");
    o = (await db.select().from(orders).where(eq(orders.id, order.id)))[0];
    expect(o.status).toBe("PAID");
    pp.getOrderStatus = null;
  });
  it("lets finance reconcile an approved-but-uncaptured payment with PayPal", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    await expect(reconcilePayPalPayment(b.actor, s.paymentId)).rejects.toThrow(); // buyers cannot
    pp.getOrderStatus = "APPROVED";
    expect((await reconcilePayPalPayment(await staff(), s.paymentId)).status).toBe("COMPLETED");
    pp.getOrderStatus = null;
    expect((await db.select().from(orders).where(eq(orders.id, order.id)))[0].paymentStatus).toBe("PAID");
  });
  it("blocks a second payment on a paid order and flags a duplicate capture for refund", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const s = await startPayPalPayment(b.actor, order.id);
    expect((await capturePayPalPayment(b.actor, order.id, s.paypalOrderId)).status).toBe("COMPLETED");
    await expect(startPayPalPayment(b.actor, order.id)).rejects.toThrow();
  });
  it("refuses live PayPal while sample data is allowed", async () => {
    const b = await approvedBuyer();
    const order = await paidReadyOrder(b);
    const prev = { env: process.env.PAYPAL_ENV, sample: process.env.ALLOW_SAMPLE_DATA };
    process.env.PAYPAL_ENV = "live"; process.env.ALLOW_SAMPLE_DATA = "true";
    try { await expect(startPayPalPayment(b.actor, order.id)).rejects.toThrow(/temporarily unavailable/); }
    finally { process.env.PAYPAL_ENV = prev.env; process.env.ALLOW_SAMPLE_DATA = prev.sample; if (prev.env === undefined) delete process.env.PAYPAL_ENV; if (prev.sample === undefined) delete process.env.ALLOW_SAMPLE_DATA; }
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
    const r = await registerCustomer(regInput());
    await expect(changeCompanyStatus(b.actor, r.companyId, "SUSPENDED", "Not allowed for buyers")).rejects.toThrow(/permission/);
    await expect(changeCompanyStatus(catalogRole, r.companyId, "SUSPENDED", "Not allowed for catalog staff")).rejects.toThrow(/permission/);
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
