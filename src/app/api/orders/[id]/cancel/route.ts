import { z } from "zod";
import { route, readBody } from "@/server/http";
import { cancelOrder } from "@/server/orders";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const { reason } = z.object({ reason: z.string().trim().max(500).default("") }).parse(await readBody(req));
  await cancelOrder(actor, params.id, reason);
  return { ok: true, message: "Order cancelled." };
});
