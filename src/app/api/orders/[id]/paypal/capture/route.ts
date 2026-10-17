import { z } from "zod";
import { route, readBody } from "@/server/http";
import { capturePayPalPayment } from "@/server/payments";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const { paypalOrderId } = z.object({ paypalOrderId: z.string().regex(/^[A-Z0-9]{8,40}$/) }).parse(await readBody(req));
  return capturePayPalPayment(actor, params.id, paypalOrderId);
});
