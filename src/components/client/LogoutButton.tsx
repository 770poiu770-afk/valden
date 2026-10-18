"use client";
import { useT } from "./LocaleProvider";
export function LogoutButton({ className = "whitespace-nowrap rounded px-3 py-2 text-start text-sm text-steel-600 hover:bg-white hover:text-deep" }: { className?: string }) {
  const t = useT();
  return (
    <button type="button" className={className} onClick={async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    }}>{t("Sign out", "יציאה")}</button>
  );
}
