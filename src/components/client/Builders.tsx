"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "./LocaleProvider";
import { trMessage } from "@/lib/messages-he";

type Hit = { variantId: string; sku: string; label: string; name: string; moq: number; increment: number; wholesaleCents: number };
type Row = { sku: string; name: string; quantity: number; targetUnitPrice: string; moq: number };

function SkuSearch({ onPick }: { onPick: (h: Hit) => void }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/skus?q=${encodeURIComponent(q)}`);
      if (r.ok) setHits((await r.json()).results);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  return (
    <div className="relative">
      <label className="field-label" htmlFor="skusearch">{t("Add a product", "הוספת מוצר")}</label>
      <input id="skusearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by model, manufacturer or SKU", "חיפוש לפי דגם, יצרן או מק״ט")} className="input" autoComplete="off" role="combobox" aria-expanded={hits.length > 0} aria-controls="skuhits" />
      {hits.length > 0 && (
        <ul id="skuhits" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-line bg-white shadow-lg">
          {hits.map((h) => (
            <li key={h.variantId} role="option" aria-selected={false}>
              <button type="button" className="block w-full px-3 py-2 text-start text-sm hover:bg-paper" onClick={() => { onPick(h); setQ(""); setHits([]); }}>
                <span className="font-medium text-deep-900" dir="auto">{h.name}</span><br /><span className="text-xs text-steel-500"><span dir="auto">{h.label}</span> · <span className="num">{h.sku}</span> · {t("MOQ", "מינימום")} {h.moq}</span>
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
  const t = useT();
  const [rows, setRows] = useState<Row[]>(initial);
  const [notes, setNotes] = useState("");
  const [cur, setCur] = useState(currency);
  const [state, setState] = useState<{ busy?: boolean; err?: string }>({});
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  async function submit() {
    setState({ busy: true });
    const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency: cur, buyerNotes: notes, lines: rows.map((r) => ({ sku: r.sku, quantity: r.quantity, targetUnitPrice: r.targetUnitPrice || undefined })) }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setState({ err: d.error ?? t("Could not submit.", "לא ניתן היה לשלוח.") }); return; }
    router.push(d.redirect);
  }

  return (
    <div className="space-y-5">
      <div className="panel panel-pad"><SkuSearch onPick={(h) => setRows((r) => r.some((x) => x.sku === h.sku) ? r : [...r, { sku: h.sku, name: `${h.name} — ${h.label}`, quantity: h.moq, targetUnitPrice: "", moq: h.moq }])} /></div>
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
        <table className="tbl min-w-[640px]">
          <thead><tr><th scope="col">{t("Product", "מוצר")}</th><th scope="col" className="w-32 text-end">{t("Quantity", "כמות")}</th><th scope="col" className="w-40 text-end">{t("Target unit price (USD)", "מחיר יעד ליחידה (דולר)")}</th><th className="w-16"><span className="sr-only">{t("Actions", "פעולות")}</span></th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-steel-500">{t("Search above to add products to your request.", "חפשו למעלה כדי להוסיף מוצרים לבקשה.")}</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.sku}>
                <td><p className="font-medium text-deep-900" dir="auto">{r.name}</p><p className="num text-xs text-steel-500">{r.sku} · {t("catalog MOQ", "מינימום בקטלוג")} {r.moq}</p></td>
                <td className="text-end"><input aria-label={t(`Quantity for ${r.sku}`, `כמות עבור ${r.sku}`)} type="number" min={1} value={r.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="input num w-28 text-end" /></td>
                <td className="text-end"><input aria-label={t(`Target price for ${r.sku}`, `מחיר יעד עבור ${r.sku}`)} inputMode="decimal" value={r.targetUnitPrice} onChange={(e) => update(i, { targetUnitPrice: e.target.value })} placeholder={t("Optional", "רשות")} className="input num w-36 text-end" /></td>
                <td className="text-end"><button type="button" className="text-sm text-bad hover:underline" onClick={() => setRows(rows.filter((_, j) => j !== i))}>{t("Remove", "הסרה")}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel panel-pad grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div><label className="field-label" htmlFor="notes">{t("Notes for the trade desk", "הערות לצוות המכירות")}</label><textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" dir="auto" placeholder={t("Delivery schedule, destination, packaging or warranty requirements", "לוח זמנים לאספקה, יעד, דרישות אריזה או אחריות")} /></div>
        <div><label className="field-label" htmlFor="qcur">{t("Quote currency", "מטבע ההצעה")}</label><select id="qcur" className="input" value={cur} onChange={(e) => setCur(e.target.value)}><option>USD</option><option>EUR</option><option>ILS</option></select></div>
      </div>
      {state.err && <p role="alert" className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{state.err}</p>}
      <button type="button" className="btn-primary" disabled={!rows.length || state.busy} onClick={submit}>{state.busy ? t("Submitting…", "שולח…") : t(`Submit quote request (${rows.length} line${rows.length === 1 ? "" : "s"})`, `שליחת בקשה להצעת מחיר (${rows.length} שורות)`)}</button>
    </div>
  );
}

type Preview = { lines: { sku: string; name: string; variantLabel: string; quantity: number; unitCents: string; lineCents: string; issues: string[] }[]; subtotalCents: string | null; currency: string; unknown: string[]; blocking: string[] };
const SYM: Record<string, string> = { USD: "$", EUR: "€", ILS: "₪" };
const fmt = (c: string | null, cur: string) => (c === null ? "—" : `${SYM[cur]}${(Number(c) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`);

export function BulkBuilder({ currency }: { currency: string }) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
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
    if (!lines.length) { setState({ err: t("Paste at least one line in the form SKU, quantity.", "הדביקו לפחות שורה אחת במבנה: מק״ט, כמות.") }); return; }
    setState({ busy: true });
    const r = await fetch("/api/bulk/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, lines }) });
    const d = await r.json();
    if (!r.ok) { setState({ err: d.error }); return; }
    setPreview(d);
    setState({ err: bad.length ? t(`Ignored ${bad.length} line(s) that were not in SKU, quantity format: ${bad.slice(0, 3).join(" | ")}`, `${bad.length} שורות לא במבנה מק״ט, כמות ולכן לא נכללו: ${bad.slice(0, 3).join(" | ")}`) : undefined });
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
        <label className="field-label" htmlFor="bulk">{t("Paste SKUs and quantities", "הדביקו מק״טים וכמויות")}</label>
        <textarea id="bulk" rows={10} value={text} onChange={(e) => { setText(e.target.value); setPreview(null); }} className="input num" dir="ltr" placeholder={t("VLD-IPH-D9E5D2-01, 100\nVLD-GPU-XXXXXX-01 25\n(one line per SKU; comma, tab, semicolon or space between SKU and quantity)", "VLD-IPH-D9E5D2-01, 100\nVLD-GPU-XXXXXX-01 25\n(שורה לכל מק״ט; פסיק, טאב, נקודה-פסיק או רווח בין המק״ט לכמות)")} />
        <p className="field-hint">{t("Copy two columns straight from a spreadsheet. Repeated SKUs are combined.", "אפשר להעתיק שתי עמודות ישירות מגיליון אלקטרוני. מק״טים שחוזרים מאוחדים.")}</p>
        <div className="mt-3 flex gap-2"><button type="button" className="btn-deep" onClick={doPreview} disabled={state.busy}>{t("Check prices and quantities", "בדיקת מחירים וכמויות")}</button></div>
      </div>
      {state.err && <p role="alert" className="rounded border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn">{state.err}</p>}
      {preview && (
        <div className="space-y-3">
          {preview.unknown.length > 0 && <p className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">{t("Unknown SKUs:", "מק״טים לא מוכרים:")} <span dir="ltr">{preview.unknown.join(", ")}</span></p>}
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
            <table className="tbl min-w-[640px]">
              <thead><tr><th scope="col">{t("SKU", "מק״ט")}</th><th scope="col">{t("Product", "מוצר")}</th><th scope="col" className="text-end">{t("Qty", "כמות")}</th><th scope="col" className="text-end">{t("Unit", "ליחידה")}</th><th scope="col" className="text-end">{t("Line", "שורה")}</th></tr></thead>
              <tbody>{preview.lines.map((l) => (
                <tr key={l.sku}><td className="num">{l.sku}</td><td><span dir="auto">{l.name}</span><span className="block text-xs text-steel-500" dir="auto">{l.variantLabel}</span>{l.issues.map((x) => <span key={x} className="block text-xs font-medium text-bad">{trMessage(x, locale)}</span>)}</td>
                  <td className="num text-end">{l.quantity}</td><td className="num text-end">{fmt(l.unitCents, preview.currency)}</td><td className="num text-end font-medium">{fmt(l.lineCents, preview.currency)}</td></tr>
              ))}</tbody>
              <tfoot><tr><td colSpan={4} className="px-3 py-2 text-end font-semibold">{t("Subtotal", "סכום ביניים")}</td><td className="num px-3 py-2 text-end font-bold">{fmt(preview.subtotalCents, preview.currency)}</td></tr></tfoot>
            </table>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={addAll} disabled={state.busy}>{t(`Add ${preview.lines.length} lines to cart`, `הוספת ${preview.lines.length} שורות לסל`)}</button>
            <a className="btn-outline" href={`/portal/quotes/new?bulk=${encodeURIComponent(parse().lines.map((l) => `${l.sku}:${l.quantity}`).join(","))}`}>{t("Request a quote instead", "בקשת הצעת מחיר במקום")}</a>
          </div>
          <p className="text-xs text-steel-500">{t("Lines with issues can still be added to the cart, but checkout is blocked until they are fixed.", "אפשר להוסיף לסל גם שורות עם בעיות, אבל לא ניתן לעבור לתשלום עד שהן יתוקנו.")}</p>
        </div>
      )}
      {state.ok && <p role="status" className="text-sm text-ok">{state.ok}</p>}
    </div>
  );
}
