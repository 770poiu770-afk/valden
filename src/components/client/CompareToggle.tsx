"use client";
import { useT } from "./LocaleProvider";
import { useEffect, useState } from "react";
import Link from "next/link";

const KEY = "vld_compare";
export function readCompare(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]").filter((x: unknown) => typeof x === "string").slice(0, 4); } catch { return []; }
}
function write(v: string[]) { try { localStorage.setItem(KEY, JSON.stringify(v)); window.dispatchEvent(new Event("vld-compare")); } catch { /* storage unavailable */ } }

export function CompareToggle({ slug }: { slug: string }) {
  const t = useT();
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { const s = () => setList(readCompare()); s(); window.addEventListener("vld-compare", s); return () => window.removeEventListener("vld-compare", s); }, []);
  const on = list.includes(slug);
  return (
    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-steel-500">
      <input type="checkbox" className="accent-deep" checked={on} onChange={() => {
        const cur = readCompare();
        if (on) write(cur.filter((s) => s !== slug));
        else if (cur.length >= 4) alert(t("You can compare up to 4 products at a time.", "אפשר להשוות עד 4 מוצרים בכל פעם."));
        else write([...cur, slug]);
      }} />
      {t("Compare", "השוואה")}
    </label>
  );
}

export function CompareBar() {
  const t = useT();
  const [list, setList] = useState<string[]>([]);
  useEffect(() => { const s = () => setList(readCompare()); s(); window.addEventListener("vld-compare", s); return () => window.removeEventListener("vld-compare", s); }, []);
  if (list.length === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur">
      <div className="container-page flex items-center justify-between gap-3 py-3 text-sm">
        <span>{t("Selected for comparison:", "נבחרו להשוואה:")} <strong className="num">{list.length}</strong> / 4</span>
        <span className="flex gap-2">
          <button className="btn-ghost btn-sm" onClick={() => write([])}>{t("Clear", "ניקוי")}</button>
          <Link className="btn-deep btn-sm" href={`/portal/compare?slugs=${encodeURIComponent(list.join(","))}`}>{t("Compare products", "השוואת מוצרים")}</Link>
        </span>
      </div>
    </div>
  );
}
