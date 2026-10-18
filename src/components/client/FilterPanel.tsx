"use client";
import { useT } from "./LocaleProvider";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Catalog filters: always open on large screens; collapsed behind a "Filters" toggle on phones so
 * products appear first. Rendered open on the server, so it works without JavaScript.
 */
export function FilterPanel({ activeCount, children }: { activeCount: number; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const t = useT();
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => { if (ref.current) ref.current.open = mq.matches; };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={ref} open className="group self-start lg:sticky lg:top-4">
      <summary className="btn-outline mb-3 w-full cursor-pointer list-none justify-between lg:hidden">
        <span>{t("Filters", "סינון")}{activeCount > 0 ? t(` (${activeCount} active)`, ` (${activeCount} פעילים)`) : ""}</span>
        <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      {children}
    </details>
  );
}
