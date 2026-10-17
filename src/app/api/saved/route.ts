import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { route, readBody } from "@/server/http";
import { db } from "@/db";
import { products, savedProducts } from "@/db/schema";
import { assertActor } from "@/lib/auth";
import { notFound } from "@/lib/errors";

export const POST = route(async ({ req, actor }) => {
  assertActor(actor);
  const b = z.object({ slug: z.string().max(120), saved: z.boolean() }).parse(await readBody(req));
  const p = (await db.select({ id: products.id }).from(products).where(eq(products.slug, b.slug)))[0];
  if (!p) throw notFound();
  if (b.saved) await db.insert(savedProducts).values({ userId: actor.userId, productId: p.id }).onConflictDoNothing();
  else await db.delete(savedProducts).where(and(eq(savedProducts.userId, actor.userId), eq(savedProducts.productId, p.id)));
  return { ok: true };
});
