import { route, readBody } from "@/server/http";
import { acceptOffer } from "@/server/quotes";
import { withCheckoutAddresses } from "@/server/orders";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const order = await acceptOffer(actor, params.id, await withCheckoutAddresses(actor, await readBody(req)));
  return { ok: true, redirect: `/portal/orders/${order.id}?placed=1` };
});
