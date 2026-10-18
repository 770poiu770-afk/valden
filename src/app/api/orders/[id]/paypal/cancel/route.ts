import { z } from "zod";
import { route, readBody } from "@/server/http";
import { cancelPayPalPayment } from "@/server/payments";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const { paypalOrderId } = z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{8,40}$/) }).parse(await readBody(req));
  return cancelPayPalPayment(actor, params.id, paypalOrderId);
});
