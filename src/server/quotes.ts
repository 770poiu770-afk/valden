import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "@/db";
import { products, quoteItems, quotes, users, variants } from "@/db/schema";
import { assertBuyer, assertCan, type Actor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { badRequest, conflict, notFound } from "@/lib/errors";
import { decimalStringToMinor, formatMoney } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { priceLines } from "./pricing-engine";
import { CheckoutInput, placeOrderFromLines } from "./orders";
import { appUrl, queueEmail } from "./mail";

export const QuoteRequestInput = z.object({
  currency: z.enum(["USD", "EUR", "ILS"]).default("USD"),
  buyerNotes: z.string().trim().max(3000).optional(),
  lines: z.array(z.object({
    variantId: z.string().uuid().optional(),
    sku: z.string().trim().max(60).optional(),
    quantity: z.coerce.number().int().min(1).max(1_000_000),
    targetUnitPrice: z.string().trim().max(20).optional(),
  })).min(1).max(300),
});

async function nextQuoteNumber(tx: DbOrTx) {
  const r = await tx.execute(sql`SELECT nextval('quote_number_seq') AS n`);
  return `VQ-${new Date().getFullYear()}-${String((r.rows[0] as { n: string }).n).padStart(5, "0")}`;
}

export async function requestQuote(actor: Actor, raw: unknown) {
  assertBuyer(actor, "quotes.request");
  const input = QuoteRequestInput.parse(raw);
  return db.transaction(async (tx) => {
    const resolved: { variantId: string; quantity: number; targetUnitCents: number | null }[] = [];
    for (const l of input.lines) {
      const v = (await tx.select({ id: variants.id }).from(variants).innerJoin(products, eq(products.id, variants.productId))
        .where(and(l.variantId ? eq(variants.id, l.variantId) : eq(variants.sku, (l.sku ?? "").toUpperCase()), eq(variants.isActive, true), eq(products.isActive, true))).limit(1))[0];
      if (!v) throw badRequest(`Unknown or inactive SKU: ${l.sku ?? l.variantId}`);
      let target: number | null = null;
      if (l.targetUnitPrice) { try { target = Number(decimalStringToMinor(l.targetUnitPrice)); } catch { throw badRequest(`Invalid target price for ${l.sku ?? "line"}.`); } }
      const dup = resolved.find((r) => r.variantId === v.id);
      if (dup) dup.quantity += l.quantity; else resolved.push({ variantId: v.id, quantity: l.quantity, targetUnitCents: target });
    }
    const priced = await priceLines(tx, actor.companyId, resolved.map((r) => ({ variantId: r.variantId, quantity: r.quantity })), input.currency, { ignoreOrderable: true });
    const number = await nextQuoteNumber(tx);
    const q = (await tx.insert(quotes).values({
      number, companyId: actor.companyId, requestedById: actor.userId, currency: priced.currency, buyerNotes: input.buyerNotes || null,
      listTotalBaseCents: priced.subtotalBaseCents,
    }).returning())[0];
    await tx.insert(quoteItems).values(priced.lines.map((l) => ({
      quoteId: q.id, productId: l.productId, variantId: l.variantId, quantity: l.quantity, listUnitCents: l.unitBaseCents,
      targetUnitCents: resolved.find((r) => r.variantId === l.variantId)?.targetUnitCents ?? null,
    })));
    await audit(actor, "quote.request", "quote", q.id, { number, lines: priced.lines.length, listTotalBase: priced.subtotalBaseCents }, tx);
    await queueEmail(actor.email, `Valden — quotation request ${number} received`, `We have received quotation request ${number}. Our trade desk will respond with a formal offer.\n\n${appUrl(`/portal/quotes/${q.id}`)}`, tx);
    return q;
  });
}

export async function expireQuotes(tx: DbOrTx = db) {
  await tx.update(quotes).set({ status: "EXPIRED", updatedAt: new Date() })
    .where(and(eq(quotes.status, "OFFERED"), sql`${quotes.offerExpiresAt} < now()`));
}

export async function loadQuoteFor(actor: Actor, id: string, tx: DbOrTx = db) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound("Quote not found.");
  await expireQuotes(tx);
  const q = (await tx.select().from(quotes).where(eq(quotes.id, id)).limit(1))[0];
  if (!q) throw notFound("Quote not found.");
  if (!(actor.isStaff && actor.permissions.has("quotes.manage")) && q.companyId !== actor.companyId) throw notFound("Quote not found.");
  return q;
}

export async function quoteBundle(actor: Actor, id: string) {
  const q = await loadQuoteFor(actor, id);
  const items = await db.select({ i: quoteItems, sku: variants.sku, label: variants.label, name: products.name, slug: products.slug, moq: products.moq, wholesale: products.wholesaleCents, refCents: products.referencePriceCents })
    .from(quoteItems).innerJoin(variants, eq(variants.id, quoteItems.variantId)).innerJoin(products, eq(products.id, quoteItems.productId))
    .where(eq(quoteItems.quoteId, q.id)).orderBy(quoteItems.id);
  const requester = (await db.select({ email: users.email, fullName: users.fullName }).from(users).where(eq(users.id, q.requestedById)))[0];
  return {
    quote: actor.isStaff ? q : { ...q, internalNotes: null },
    items: items.map((x) => ({ ...x.i, sku: x.sku, label: x.label, name: x.name, slug: x.slug, moq: x.moq, currentWholesale: x.wholesale, referenceCents: actor.isStaff ? x.refCents : null })),
    requester,
  };
}

export async function listQuotes(actor: Actor) {
  await expireQuotes();
  if (actor.isStaff && actor.permissions.has("quotes.manage")) return db.select().from(quotes).orderBy(desc(quotes.createdAt)).limit(300);
  if (!actor.companyId) return [];
  return db.select().from(quotes).where(eq(quotes.companyId, actor.companyId)).orderBy(desc(quotes.createdAt)).limit(200);
}

export async function startReview(actor: Actor, id: string) {
  assertCan(actor, "quotes.manage");
  const r = await db.update(quotes).set({ status: "UNDER_REVIEW", updatedAt: new Date() }).where(and(eq(quotes.id, id), eq(quotes.status, "SUBMITTED"))).returning();
  if (r.length) await audit(actor, "quote.review", "quote", id, {});
}

export const OfferInput = z.object({
  lines: z.array(z.object({ id: z.coerce.number().int(), offeredUnitPrice: z.string().trim().min(1), lineNote: z.string().trim().max(300).optional() })).min(1),
  shippingAmount: z.string().trim().optional(),
  shippingMethod: z.string().trim().max(120).optional(),
  validityDays: z.coerce.number().int().min(1).max(90).optional(),
  offerNotes: z.string().trim().max(3000).optional(),
  internalNotes: z.string().trim().max(3000).optional(),
});

/** Staff issues a formal offer. Offered prices are entered in the base currency (USD). */
export async function issueOffer(actor: Actor, id: string, raw: unknown) {
  assertCan(actor, "quotes.manage");
  const input = OfferInput.parse(raw);
  const s = await getSettings();
  return db.transaction(async (tx) => {
    const q = (await tx.select().from(quotes).where(eq(quotes.id, id)).for("update"))[0];
    if (!q) throw notFound();
    if (!["SUBMITTED", "UNDER_REVIEW", "OFFERED", "EXPIRED"].includes(q.status)) throw conflict(`Quote is ${q.status}; an offer cannot be issued.`);
    const items = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
    let total = 0n;
    for (const it of items) {
      const l = input.lines.find((x) => x.id === it.id);
      if (!l) throw badRequest("Every line needs an offered unit price.");
      let cents: bigint;
      try { cents = decimalStringToMinor(l.offeredUnitPrice); } catch { throw badRequest(`Invalid price on line ${it.id}.`); }
      if (cents <= 0n) throw badRequest("Offered prices must be positive.");
      await tx.update(quoteItems).set({ offeredUnitCents: Number(cents), lineNote: l.lineNote || null }).where(eq(quoteItems.id, it.id));
      total += cents * BigInt(it.quantity);
    }
    const ship = input.shippingAmount ? decimalStringToMinor(input.shippingAmount) : null;
    const days = input.validityDays ?? s.quoteDefaults.offerValidityDays;
    const expires = new Date(Date.now() + days * 86400_000);
    await tx.update(quotes).set({
      status: "OFFERED", offeredAt: new Date(), offeredById: actor.userId, offerExpiresAt: expires, offerTotalBaseCents: total,
      offerShippingBaseCents: ship, offerShippingMethod: input.shippingMethod || null, offerNotes: input.offerNotes || null,
      internalNotes: input.internalNotes ?? q.internalNotes, updatedAt: new Date(),
    }).where(eq(quotes.id, id));
    await audit(actor, "quote.offer", "quote", id, { total, ship, expires }, tx);
    const buyer = (await tx.select().from(users).where(eq(users.id, q.requestedById)))[0];
    await queueEmail(buyer.email, `Valden — offer for ${q.number}`, `A formal offer for quotation ${q.number} is ready: ${formatMoney(total, "USD")} (excl. tax${ship ? ", plus freight" : ""}). It is valid until ${expires.toUTCString()}.\n\n${appUrl(`/portal/quotes/${id}`)}`, tx);
    return { total, expires };
  });
}

export async function declineOffer(actor: Actor, id: string, reason: string) {
  assertBuyer(actor, "quotes.request");
  return db.transaction(async (tx) => {
    const q = await loadQuoteFor(actor, id, tx);
    if (!["OFFERED", "SUBMITTED", "UNDER_REVIEW"].includes(q.status)) throw conflict(`Quote is ${q.status}.`);
    const to = q.status === "OFFERED" ? "DECLINED" : "CANCELLED";
    await tx.update(quotes).set({ status: to, respondedAt: new Date(), internalNotes: sql`coalesce(${quotes.internalNotes}, '') || ${`\nBuyer ${to.toLowerCase()}: ${reason}`}`, updatedAt: new Date() }).where(eq(quotes.id, id));
    await audit(actor, `quote.${to.toLowerCase()}`, "quote", id, { reason }, tx);
  });
}

/** Buyer accepts the offer → converted into an order at the negotiated prices, atomically. */
export async function acceptOffer(actor: Actor, id: string, rawCheckout: unknown) {
  assertBuyer(actor, "quotes.request");
  const checkout = CheckoutInput.parse(rawCheckout);
  return db.transaction(async (tx) => {
    await expireQuotes(tx);
    const q = await loadQuoteFor(actor, id, tx);
    await tx.execute(sql`SELECT id FROM quotes WHERE id = ${id} FOR UPDATE`);
    const fresh = (await tx.select().from(quotes).where(eq(quotes.id, id)))[0];
    if (fresh.status === "EXPIRED" || (fresh.offerExpiresAt && fresh.offerExpiresAt < new Date())) throw conflict("This offer has expired. Ask the trade desk to re-issue it.");
    if (fresh.status !== "OFFERED") throw conflict(`Quote is ${fresh.status}; it cannot be accepted.`);
    const items = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
    if (items.some((i) => i.offeredUnitCents === null)) throw conflict("Offer is incomplete.");
    const order = await placeOrderFromLines(tx, actor, items.map((i) => ({ variantId: i.variantId, quantity: i.quantity, overrideUnitBaseCents: i.offeredUnitCents })), checkout, id, fresh.offerShippingBaseCents);
    await tx.update(quotes).set({ status: "CONVERTED", respondedAt: new Date(), orderId: order.id, updatedAt: new Date() }).where(eq(quotes.id, q.id));
    await audit(actor, "quote.accept", "quote", id, { orderId: order.id, orderNumber: order.number }, tx);
    return order;
  });
}

export async function quoteCountsByStatus() {
  const r = await db.select({ status: quotes.status, n: sql<number>`count(*)::int` }).from(quotes).groupBy(quotes.status);
  return Object.fromEntries(r.map((x) => [x.status, x.n]));
}
