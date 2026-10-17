"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  variants: { id: string; sku: string; label: string }[];
  tiers: { minQty: number; unitCents: number }[];
  wholesaleCents: number; contractCents: number | null; moq: number; increment: number;
  currency: string; rate: string; orderable: boolean; canOrder: boolean; saved: boolean; slug: string;
};

const SYM: Record<string, string> = { USD: "$", EUR: "€", ILS: "₪" };
function fmt(minor: number, cur: string) {
  return `${SYM[cur] ?? ""}${(minor / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BuyBox(p: Props) {
  const router = useRouter();
  const [variant, setVariant] = useState(p.variants[0]?.id ?? "");
  const [qty, setQty] = useState(p.moq);
  const [state, setState] = useState<{ busy?: boolean; msg?: string; err?: string }>({});
  const [saved, setSaved] = useState(p.saved);
  const rate = Number(p.rate);

  // Display-only preview. The server recalculates every price at cart, checkout and order time.
  const unitBase = useMemo(() => {
    const t = [...p.tiers].filter((x) => x.minQty <= qty).sort((a, b) => b.minQty - a.minQty)[0];
    const tier = t ? t.unitCents : p.wholesaleCents;
    return p.contractCents !== null && p.contractCents <= tier ? p.contractCents : tier;
  }, [qty, p.tiers, p.wholesaleCents, p.contractCents]);
  const unit = Math.round(unitBase * rate);
  const invalid = qty < p.moq ? `Minimum order is ${p.moq} units.` : p.increment > 1 && qty % p.increment ? `Order in multiples of ${p.increment}.` : null;
  const sku = p.variants.find((v) => v.id === variant)?.sku ?? "";

  async function add() {
    setState({ busy: true });
    const res = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lines: [{ variantId: variant, quantity: qty }], mode: "add" }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState({ err: d.error ?? "Could not add to cart." }); return; }
    setState({ msg: `${qty} × ${sku} added to cart.` });
    router.refresh();
  }
  async function toggleSave() {
    const res = await fetch("/api/saved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: p.slug, saved: !saved }) });
    if (res.ok) setSaved(!saved);
  }

  return (
    <div className="space-y-4">
      {p.variants.length > 1 && (
        <div>
          <label htmlFor="variant" className="field-label">Configuration / SKU</label>
          <select id="variant" className="input" value={variant} onChange={(e) => setVariant(e.target.value)}>
            {p.variants.map((v) => <option key={v.id} value={v.id}>{v.label} — {v.sku}</option>)}
          </select>
        </div>
      )}
      {p.variants.length === 1 && <p className="text-sm text-steel-500">SKU <span className="num font-semibold text-steel">{sku}</span></p>}

      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label htmlFor="qty" className="field-label">Quantity (units)</label>
          <input id="qty" type="number" inputMode="numeric" className="input num" min={p.moq} step={p.increment} value={qty}
            onChange={(e) => setQty(Math.max(0, Math.floor(Number(e.target.value) || 0)))} aria-describedby="qty-hint" />
        </div>
        <div className="pb-2 text-right">
          <p className="text-xs text-steel-500">Unit price</p>
          <p className="num text-xl font-bold text-deep-900">{fmt(unit, p.currency)}</p>
        </div>
      </div>
      <p id="qty-hint" className={`text-xs ${invalid ? "text-bad" : "text-steel-500"}`}>
        {invalid ?? <>Line total <span className="num font-semibold text-steel">{fmt(unit * qty, p.currency)}</span> excl. tax and freight.</>}
      </p>

      {p.canOrder ? (
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary flex-1" disabled={!!invalid || state.busy || !p.orderable} onClick={add}>{state.busy ? "Adding…" : "Add to cart"}</button>
          <Link className="btn-outline" href={`/portal/quotes/new?sku=${encodeURIComponent(sku)}&qty=${qty}`}>Request quote</Link>
          <button className="btn-ghost" onClick={toggleSave} aria-pressed={saved}>{saved ? "Saved" : "Save"}</button>
        </div>
      ) : null}
      {!p.orderable && p.canOrder && <p className="text-sm text-warn">This listing is not orderable online right now. Request a quote and our trade desk will price it for you.</p>}
      {state.msg && <p role="status" className="rounded border border-ok/30 bg-ok-soft px-3 py-2 text-sm text-ok">{state.msg} <Link href="/portal/cart" className="link">View cart</Link></p>}
      {state.err && <p role="alert" className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{state.err}</p>}
    </div>
  );
}
