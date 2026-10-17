"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Hit = { variantId: string; sku: string; label: string; name: string; moq: number; increment: number; wholesaleCents: number };
type Row = { sku: string; name: string; quantity: number; targetUnitPrice: string; moq: number };

function SkuSearch({ onPick }: { onPick: (h: Hit) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/skus?q=${encodeURIComponent(q)}`);
      if (r.ok) setHits((await r.json()).results);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  return (
    <div className="relative">
      <label className="field-label" htmlFor="skusearch">Add a product</label>
      <input id="skusearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by model, manufacturer or SKU" className="input" autoComplete="off" role="combobox" aria-expanded={hits.length > 0} aria-controls="skuhits" />
      {hits.length > 0 && (
        <ul id="skuhits" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-white shadow-lg">
          {hits.map((h) => (
            <li key={h.variantId} role="option" aria-selected={false}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-paper" onClick={() => { onPick(h); setQ(""); setHits([]); }}>
                <span className="font-medium text-deep-900">{h.name}</span><br /><span className="text-xs text-steel-500">{h.label} · <span className="num">{h.sku}</span> · MOQ {h.moq}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function QuoteBuilder({ initial, currency }: { initial: Row[]; currency: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial);
  const [notes, setNotes] = useState("");
  const [cur, setCur] = useState(currency);
  const [state, setState] = useState<{ busy?: boolean; err?: string }>({});
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit() {
    setState({ busy: true });
    const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: cur, buyerNotes: notes, lines: rows.map((r) => ({ sku: r.sku, quantity: r.quantity, targetUnitPrice: r.targetUnitPrice || undefined })) }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState({ err: d.error ?? "Could not submit." }); return; }
    router.push(d.redirect);
  }

  return (
    <div className="space-y-5">
      <div className="panel panel-pad"><SkuSearch onPick={(h) => setRows((r) => r.some((x) => x.sku === h.sku) ? r : [...r, { sku: h.sku, name: `${h.name} — ${h.label}`, quantity: h.moq, targetUnitPrice: "", moq: h.moq }])} /></div>
      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[640px]">
          <thead><tr><th>Product</th><th className="w-32 text-right">Quantity</th><th className="w-40 text-right">Target unit price (USD)</th><th className="w-16" /></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-steel-500">Search above to add products to your request.</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.sku}>
                <td><p className="font-medium text-deep-900">{r.name}</p><p className="num text-xs text-steel-500">{r.sku} · catalog MOQ {r.moq}</p></td>
                <td className="text-right"><input aria-label={`Quantity for ${r.sku}`} type="number" min={1} value={r.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="input num w-28 text-right" /></td>
                <td className="text-right"><input aria-label={`Target price for ${r.sku}`} inputMode="decimal" value={r.targetUnitPrice} onChange={(e) => update(i, { targetUnitPrice: e.target.value })} placeholder="Optional" className="input num w-36 text-right" /></td>
                <td className="text-right"><button type="button" className="text-sm text-bad hover:underline" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel panel-pad grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div><label className="field-label" htmlFor="notes">Notes for the trade desk</label><textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="Delivery schedule, destination, packaging or warranty requirements" /></div>
        <div><label className="field-label" htmlFor="qcur">Quote currency</label><select id="qcur" className="input" value={cur} onChange={(e) => setCur(e.target.value)}><option>USD</option><option>EUR</option><option>ILS</option></select></div>
      </div>
      {state.err && <p role="alert" className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{state.err}</p>}
      <button type="button" className="btn-primary" disabled={!rows.length || state.busy} onClick={submit}>{state.busy ? "Submitting…" : `Submit quote request (${rows.length} line${rows.length === 1 ? "" : "s"})`}</button>
    </div>
  );
}

type Preview = { lines: { sku: string; name: string; variantLabel: string; quantity: number; unitCents: string; lineCents: string; issues: string[] }[]; subtotalCents: string | null; currency: string; unknown: string[]; blocking: string[] };
const SYM: Record<string, string> = { USD: "$", EUR: "€", ILS: "₪" };
const fmt = (c: string | null, cur: string) => (c === null ? "—" : `${SYM[cur]}${(Number(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

export function BulkBuilder({ currency }: { currency: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [state, setState] = useState<{ busy?: boolean; err?: string; ok?: string }>({});

  function parse() {
    const lines: { sku: string; quantity: number }[] = [];
    const bad: string[] = [];
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || /^sku\b/i.test(line)) continue;
      const m = line.match(/^([A-Za-z0-9-]+)[\s,;\t]+(\d+)\s*$/);
      if (m) lines.push({ sku: m[1].toUpperCase(), quantity: Number(m[2]) }); else bad.push(line);
    }
    return { lines, bad };
  }
  async function doPreview() {
    const { lines, bad } = parse();
    if (!lines.length) { setState({ err: "Paste at least one line in the form SKU, quantity." }); return; }
    setState({ busy: true });
    const r = await fetch("/api/bulk/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, lines }) });
    const d = await r.json();
    if (!r.ok) { setState({ err: d.error }); return; }
    setPreview(d);
    setState({ err: bad.length ? `Ignored ${bad.length} line(s) that were not in SKU, quantity format: ${bad.slice(0, 3).join(" | ")}` : undefined });
  }
  async function addAll() {
    const { lines } = parse();
    setState({ busy: true });
    const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "add", lines }) });
    const d = await r.json();
    if (!r.ok) { setState({ err: d.error }); return; }
    setState({ ok: d.message });
    router.push("/portal/cart");
  }

  return (
    <div className="space-y-5">
      <div className="panel panel-pad">
        <label className="field-label" htmlFor="bulk">Paste SKUs and quantities</label>
        <textarea id="bulk" rows={10} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} className="input num" placeholder={"VLD-IPH-D9E5D2-01, 100\nVLD-GPU-XXXXXX-01 25\n(one line per SKU; comma, tab, semicolon or space between SKU and quantity)"} />
        <p className="field-hint">Copy two columns straight from a spreadsheet. Repeated SKUs are combined.</p>
        <div className="mt-3 flex gap-2"><button type="button" className="btn-deep" onClick={doPreview} disabled={state.busy}>Check prices and quantities</button></div>
      </div>
      {state.err && <p role="alert" className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">{state.err}</p>}
      {preview && (
        <div className="space-y-3">
          {preview.unknown.length > 0 && <p className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">Unknown SKUs: {preview.unknown.join(", ")}</p>}
          <div className="panel overflow-x-auto">
            <table className="tbl min-w-[640px]">
              <thead><tr><th>SKU</th><th>Product</th><th className="text-right">Qty</th><th className="text-right">Unit</th><th className="text-right">Line</th></tr></thead>
              <tbody>{preview.lines.map((l) => (
                <tr key={l.sku}><td className="num">{l.sku}</td><td>{l.name}<span className="block text-xs text-steel-500">{l.variantLabel}</span>{l.issues.map((x) => <span key={x} className="block text-xs font-medium text-bad">{x}</span>)}</td>
                  <td className="num text-right">{l.quantity}</td><td className="num text-right">{fmt(l.unitCents, preview.currency)}</td><td className="num text-right font-medium">{fmt(l.lineCents, preview.currency)}</td></tr>
              ))}</tbody>
              <tfoot><tr><td colSpan={4} className="px-3 py-2 text-right font-semibold">Subtotal</td><td className="num px-3 py-2 text-right font-bold">{fmt(preview.subtotalCents, preview.currency)}</td></tr></tfoot>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={addAll} disabled={state.busy}>Add {preview.lines.length} lines to cart</button>
            <a className="btn-outline" href={`/portal/quotes/new?bulk=${encodeURIComponent(parse().lines.map((l) => `${l.sku}:${l.quantity}`).join(","))}`}>Request a quote instead</a>
          </div>
          <p className="text-xs text-steel-500">Lines with issues can still be added to the cart, but checkout is blocked until they are fixed.</p>
        </div>
      )}
      {state.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
    </div>
  );
}
