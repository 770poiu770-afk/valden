import { NextResponse } from "next/server";
import { route, clientIp } from "@/server/http";
import { RegistrationInput, registerBusiness } from "@/server/accounts";
import { storeUpload } from "@/server/uploads";
import { createSession, SESSION_COOKIE, SESSION_TTL_MS } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { badRequest } from "@/lib/errors";

function nest(fd: FormData) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    const [a, b] = k.split(".");
    if (b) { out[a] = { ...(out[a] as object), [b]: v }; continue; }
    if (k === "docTypes") { out.docTypes = [...((out.docTypes as string[]) ?? []), v]; continue; }
    out[k] = v;
  }
  out.acceptTerms = out.acceptTerms === "on" || out.acceptTerms === "true";
  out.declareAuthorized = out.declareAuthorized === "on" || out.declareAuthorized === "true";
  if (out.sameAsBilling === "on") out.shipping = { ...(out.billing as object) };
  return out;
}

export const POST = route(async ({ req }) => {
  const ip = await clientIp();
  await enforceRateLimit(`register:${ip}`, 5, 3600);
  const fd = await req.formData();
  const input = RegistrationInput.parse(nest(fd));
  const files = fd.getAll("documents").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > 6) throw badRequest("Upload at most 6 documents.");
  const stored = [];
  for (const f of files) stored.push(await storeUpload(f));
  const r = await registerBusiness(input, stored, ip);
  const { token } = await createSession(r.userId, { ip, userAgent: req.headers.get("user-agent") });
  const res = NextResponse.json({ ok: true, redirect: "/portal?registered=1" });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_TTL_MS / 1000 });
  return res;
});
