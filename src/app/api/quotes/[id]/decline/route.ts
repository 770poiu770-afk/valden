import { z } from "zod";
import { route, readBody } from "@/server/http";
import { declineOffer } from "@/server/quotes";
import { assertActor } from "@/lib/auth";

export const POST = route<{ id: string }>(async ({ req, params, actor }) => {
  assertActor(actor);
  const { reason } = z.object({ reason: z.string().trim().max(500).default("") }).parse(await readBody(req));
  await declineOffer(actor, params.id, reason);
  return { ok: true, message: "Recorded." };
});
