import { z } from "zod";
import { route, readBody, clientIp } from "@/server/http";
import { resetPassword } from "@/server/accounts";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route(async ({ req }) => {
  const b = z.object({ token: z.string().min(20).max(200), password: z.string().min(1).max(200), confirm: z.string() }).parse(await readBody(req));
  if (b.password !== b.confirm) return Response.json({ error: "Passwords do not match." }, { status: 400 });
  await enforceRateLimit(`reset:${await clientIp()}`, 10, 900);
  await resetPassword(b.token, b.password);
  return { ok: true, message: "Password updated. You can now sign in.", redirect: "/login?reset=1" };
});
