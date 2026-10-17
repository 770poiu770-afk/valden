import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { route } from "@/server/http";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export const POST = route(async () => {
  const c = await cookies();
  const t = c.get(SESSION_COOKIE)?.value;
  if (t) await destroySession(t);
  const res = NextResponse.json({ ok: true, redirect: "/" });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
});
