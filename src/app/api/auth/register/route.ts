import { NextResponse } from "next/server";
import { route, clientIp, readBody } from "@/server/http";
import { registerCustomer } from "@/server/accounts";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

/** Self-service sign-up: email + password (+ optional name, country and business details). */
export const POST = route(async ({ req }) => {
  const ip = await clientIp();
  await enforceRateLimit(`register:${ip}`, 10, 3600);
  const b = await readBody(req);
  const bool = (v: unknown) => v === true || v === "on" || v === "true";
  const next = typeof b.next === "string" && b.next.startsWith("/") && !b.next.startsWith("//") && !b.next.startsWith("/api") ? b.next : null;
  const r = await registerCustomer({
    email: String(b.email ?? ""), password: String(b.password ?? ""), fullName: b.fullName as string | undefined,
    countryCode: b.countryCode as string | undefined, phone: b.phone as string | undefined,
    isBusiness: bool(b.isBusiness), companyName: b.companyName as string | undefined, taxId: b.taxId as string | undefined,
    acceptTerms: bool(b.acceptTerms) as true,
  }, ip);
  const { token } = await createSession(r.userId, { ip, userAgent: req.headers.get("user-agent") });
  const res = NextResponse.json({ ok: true, redirect: next ?? "/portal?welcome=1" });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return res;
});
