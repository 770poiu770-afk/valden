import { NextResponse, type NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

/** GET /api/lang?l=he&next=/catalog — remember the language choice and return to the page. Works without JavaScript. */
export function GET(req: NextRequest) {
  const l = req.nextUrl.searchParams.get("l");
  const next = req.nextUrl.searchParams.get("next") ?? "/";
  const safe = next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/api") ? next : "/";
  const res = NextResponse.redirect(new URL(safe, process.env.APP_URL || req.url), 303);
  if (isLocale(l)) res.cookies.set(LOCALE_COOKIE, l, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  return res;
}
