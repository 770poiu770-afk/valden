import { route } from "@/server/http";
import { startPayPalPayment } from "@/server/payments";
import { assertActor } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route<{ id: string }>(async ({ params, actor }) => {
  assertActor(actor);
  await enforceRateLimit(`ppcreate:${actor.userId}`, 30, 600);
  return startPayPalPayment(actor, params.id);
});
