"use client";
import { useT } from "./LocaleProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function QtyEditor({ variantId, quantity, moq, increment }: { variantId: string; quantity: number; moq: number; increment: number }) {
  const router = useRouter();
  const t = useT();
  const [q, setQ] = useState(quantity);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save(next: number) {
    setBusy(true); setErr(null);
    const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "set", lines: [{ variantId, quantity: next }] }) });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? t("Update failed", "העדכון נכשל")); return; }
    router.refresh();
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input aria-label={t("Quantity", "כמות")} type="number" min={0} step={increment} value={q} onChange={(e) => setQ(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          onKeyDown={(e) => { if (e.key === "Enter") save(q); }} className="input num w-24 py-1.5 text-end" />
        <button type="button" disabled={busy || q === quantity} onClick={() => save(q)} className="btn-outline btn-sm">{busy ? "…" : t("Update", "עדכון")}</button>
      </div>
      <div className="flex gap-3 text-xs">
        <span className="text-steel-500">{t("MOQ", "מינימום")} {moq}{increment > 1 ? t(`, steps of ${increment}`, `, בכפולות של ${increment}`) : ""}</span>
        <button type="button" className="text-bad hover:underline" onClick={() => save(0)}>{t("Remove", "הסרה")}</button>
      </div>
      {err && <span role="alert" className="text-xs text-bad">{err}</span>}
    </div>
  );
}

export function CurrencySwitch({ value, base = "/portal/cart" }: { value: string; base?: string }) {
  const router = useRouter();
  const t = useT();
  return (
    <label className="flex items-center gap-2 text-sm">{t("Currency", "מטבע")}
      <select className="input w-auto py-1.5" value={value} onChange={(e) => router.push(`${base}?currency=${e.target.value}`)}>
        <option>USD</option><option>EUR</option><option>ILS</option>
      </select>
    </label>
  );
}
