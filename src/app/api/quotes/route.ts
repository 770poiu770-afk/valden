import { route, readBody } from "@/server/http";
import { requestQuote } from "@/server/quotes";
import { assertActor } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route(async ({ req, actor }) => {
  assertActor(actor);
  await enforceRateLimit(`quote:${actor.userId}`, 20, 3600);
  const q = await requestQuote(actor, await readBody(req));
  return { ok: true, redirect: `/portal/quotes/${q.id}?submitted=1` };
});
