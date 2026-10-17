import { and, eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { cartItems, carts, products, variants } from "@/db/schema";
import { assertBuyer, type Actor } from "@/lib/auth";
import { badRequest, notFound } from "@/lib/errors";
import { priceLines } from "./pricing-engine";

export async function getOrCreateCart(tx: DbOrTx, userId: string, companyId: string) {
  const existing = (await tx.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
  if (existing) return existing;
  return (await tx.insert(carts).values({ userId, companyId }).onConflictDoNothing().returning())[0]
    ?? (await tx.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
}

export async function getCartItems(tx: DbOrTx, cartId: string) {
  return tx.select().from(cartItems).where(eq(cartItems.cartId, cartId)).orderBy(cartItems.addedAt);
}

export async function viewCart(actor: Actor, currency: string) {
  assertBuyer(actor, "orders.place");
  const cart = await getOrCreateCart(db, actor.userId, actor.companyId);
  const items = await getCartItems(db, cart.id);
  return priceLines(db, actor.companyId, items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), currency);
}

export type CartMode = "set" | "add";

/** Add or set quantities. Quantities are validated against MOQ / increments when priced, not here,
 *  so buyers can build up a line; checkout blocks invalid lines. */
export async function upsertCartLines(actor: Actor, lines: { variantId?: string; sku?: string; quantity: number }[], mode: CartMode = "add") {
  assertBuyer(actor, "orders.place");
  if (!lines.length) throw badRequest("No lines supplied.");
  if (lines.length > 500) throw badRequest("Too many lines in one request (max 500).");
  return db.transaction(async (tx) => {
    const cart = await getOrCreateCart(tx, actor.userId, actor.companyId);
    const resolved: { variantId: string; quantity: number; sku: string }[] = [];
    const unknown: string[] = [];
    for (const l of lines) {
      if (!Number.isInteger(l.quantity) || l.quantity < 0 || l.quantity > 100_000) throw badRequest(`Invalid quantity for ${l.sku ?? l.variantId}.`);
      const v = (await tx.select({ id: variants.id, sku: variants.sku, active: variants.isActive, pActive: products.isActive })
        .from(variants).innerJoin(products, eq(products.id, variants.productId))
        .where(l.variantId ? eq(variants.id, l.variantId) : eq(variants.sku, (l.sku ?? "").trim().toUpperCase())).limit(1))[0];
      if (!v || !v.active || !v.pActive) { unknown.push(l.sku ?? l.variantId ?? "?"); continue; }
      resolved.push({ variantId: v.id, quantity: l.quantity, sku: v.sku });
    }
    for (const r of resolved) {
      const cur = (await tx.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, r.variantId))).limit(1))[0];
      const qty = mode === "add" ? (cur?.quantity ?? 0) + r.quantity : r.quantity;
      if (qty <= 0) { if (cur) await tx.delete(cartItems).where(eq(cartItems.id, cur.id)); continue; }
      if (qty > 100_000) throw badRequest(`Quantity for ${r.sku} exceeds 100,000 units.`);
      if (cur) await tx.update(cartItems).set({ quantity: qty }).where(eq(cartItems.id, cur.id));
      else await tx.insert(cartItems).values({ cartId: cart.id, variantId: r.variantId, quantity: qty });
    }
    await tx.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
    return { updated: resolved.length, unknown };
  });
}

export async function removeCartLine(actor: Actor, variantId: string) {
  assertBuyer(actor, "orders.place");
  const cart = await getOrCreateCart(db, actor.userId, actor.companyId);
  const r = await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId))).returning();
  if (!r.length) throw notFound("Line not in cart.");
}

export async function clearCart(actor: Actor) {
  assertBuyer(actor, "orders.place");
  const cart = await getOrCreateCart(db, actor.userId, actor.companyId);
  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
}

export async function cartCount(userId: string) {
  const cart = (await db.select().from(carts).where(eq(carts.userId, userId)).limit(1))[0];
  if (!cart) return 0;
  return (await db.select({ id: cartItems.id }).from(cartItems).where(eq(cartItems.cartId, cart.id))).length;
}
