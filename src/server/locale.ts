import { cache } from "react";
import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, makeT, type Locale } from "@/lib/i18n";

/** The visitor's language: explicit choice (cookie) first, then the browser's Accept-Language. */
export const getLocale = cache(async (): Promise<Locale> => {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const al = ((await headers()).get("accept-language") ?? "").toLowerCase();
  const first = al.split(",")[0]?.trim() ?? "";
  return first.startsWith("he") || first.startsWith("iw") ? "he" : "en";
});

export async function getT() {
  const l = await getLocale();
  return { l, t: makeT(l) };
}
