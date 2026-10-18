"use client";
import { usePathname } from "next/navigation";
import { useLocale } from "./LocaleProvider";

/** Links to the other language. A plain link, so it also works before JavaScript loads. */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const l = useLocale();
  const path = usePathname() || "/";
  const to = l === "he" ? "en" : "he";
  const href = `/api/lang?l=${to}&next=${encodeURIComponent(path)}`;
  return (
    <a
      href={href}
      lang={to}
      hrefLang={to}
      className={className}
      onClick={(e) => { e.currentTarget.href = `/api/lang?l=${to}&next=${encodeURIComponent(path + window.location.search)}`; }}
    >
      {to === "he" ? "עברית" : "English"}
    </a>
  );
}
