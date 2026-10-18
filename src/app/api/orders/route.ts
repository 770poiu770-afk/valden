import { route, readBody } from "@/server/http";
import { CheckoutInput, placeOrderFromCart, withCheckoutAddresses } from "@/server/orders";
import { assertActor } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route(async ({ req, actor }) => {
  assertActor(actor);
  await enforceRateLimit(`order:${actor.userId}`, 20, 3600);
  const input = CheckoutInput.parse(await withCheckoutAddresses(actor, await readBody(req)));
  const order = await placeOrderFromCart(actor, input);
  return { ok: true, orderId: order.id, redirect: `/portal/orders/${order.id}?placed=1` };
});
