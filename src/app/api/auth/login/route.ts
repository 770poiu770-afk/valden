import { NextResponse } from "next/server";
import { z } from "zod";
import { route, readBody, clientIp } from "@/server/http";
import { checkCredentials, createSession, loadActorByUserId, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { AppError } from "@/lib/errors";

const Body = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(200), next: z.string().max(300).optional() });

export const POST = route(async ({ req }) => {
  const b = Body.parse(await readBody(req));
  const ip = await clientIp();
  await enforceRateLimit(`login:ip:${ip}`, 30, 600);
  await enforceRateLimit(`login:email:${b.email.toLowerCase()}`, 10, 600);
  const r = await checkCredentials(b.email, b.password);
  if (!r.ok) {
    await audit(null, "auth.login_failed", "user", null, { email: b.email.toLowerCase(), reason: r.reason }, undefined, ip);
    throw new AppError(401, r.reason === "locked" ? "Too many failed attempts. The account is locked for 15 minutes." : r.reason === "inactive" ? "This account is deactivated. Contact the trade desk." : "Email or password is incorrect.");
  }
  const actor = await loadActorByUserId(r.userId);
  const { token } = await createSession(r.userId, { ip, userAgent: req.headers.get("user-agent") });
  await audit(actor, "auth.login", "user", r.userId, {}, undefined, ip);
  const safeNext = b.next && b.next.startsWith("/") && !b.next.startsWith("//") && !b.next.startsWith("/api") ? b.next : null;
  const res = NextResponse.json({ ok: true, redirect: safeNext ?? (actor?.isStaff ? "/admin" : "/portal") });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return res;
});
