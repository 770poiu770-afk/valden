import { z } from "zod";
import { route, readBody } from "@/server/http";
import { clearCart, removeCartLine, upsertCartLines, viewCart } from "@/server/cart";
import { assertActor } from "@/lib/auth";

const Body = z.object({
  mode: z.enum(["add", "set"]).default("add"),
  lines: z.array(z.object({ variantId: z.string().uuid().optional(), sku: z.string().max(60).optional(), quantity: z.coerce.number().int() })).min(1).max(500),
});

export const GET = route(async ({ req, actor }) => {
  assertActor(actor);
  return viewCart(actor, req.nextUrl.searchParams.get("currency") ?? "USD");
});
export const POST = route(async ({ req, actor }) => {
  assertActor(actor);
  const b = Body.parse(await readBody(req));
  const r = await upsertCartLines(actor, b.lines, b.mode);
  return { ok: true, ...r, message: r.unknown.length ? `Updated ${r.updated} line(s). Unknown or inactive SKUs: ${r.unknown.join(", ")}` : `Updated ${r.updated} line(s).` };
});
export const DELETE = route(async ({ req, actor }) => {
  assertActor(actor);
  const v = req.nextUrl.searchParams.get("variantId");
  if (v) await removeCartLine(actor, v); else await clearCart(actor);
  return { ok: true };
});
