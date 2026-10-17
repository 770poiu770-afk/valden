import { z } from "zod";
import { route, readBody } from "@/server/http";
import { switchPaymentMethod } from "@/server/payments";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const { method } = z.object({ method: z.enum(["PAYPAL", "MANUAL_TRANSFER"]) }).parse(await readBody(req));
  await switchPaymentMethod(actor, params.id, method);
  return { ok: true };
});
