import { z } from "zod";
import { route, readBody, clientIp } from "@/server/http";
import { requestPasswordReset } from "@/server/accounts";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route(async ({ req }) => {
  const { email } = z.object({ email: z.string().trim().email().max(200) }).parse(await readBody(req));
  await enforceRateLimit(`forgot:${await clientIp()}`, 5, 900);
  await enforceRateLimit(`forgot:${email.toLowerCase()}`, 3, 900);
  await requestPasswordReset(email);
  return { ok: true, message: "If an account exists for that email, a reset link has been sent. It expires in 60 minutes." };
});
