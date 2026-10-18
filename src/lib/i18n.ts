/**
 * Two-language UI (English, Hebrew). Strings are written inline as t("English", "עברית") so each
 * translation sits next to the markup it belongs to. Product data (names, specs, SKUs) stays in
 * English. The admin portal is English-only.
 */
export type Locale = "en" | "he";
export const LOCALES: Locale[] = ["en", "he"];
export const LOCALE_COOKIE = "vld_lang";
export type T = (en: string, he: string) => string;
export const makeT = (l: Locale): T => (en, he) => (l === "he" ? he : en);
export const dirOf = (l: Locale) => (l === "he" ? "rtl" : "ltr");
export const isLocale = (v: unknown): v is Locale => v === "en" || v === "he";
/** BCP-47 tag for Intl formatting. */
export const intlTag = (l: Locale) => (l === "he" ? "he-IL" : "en-GB");
