import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { displayCurrency } from "@/lib/buyer-currency";
import { Empty, Money, PageHeader } from "@/components/ui";
import { ProductArt } from "@/components/ProductArt";
import { AVAILABILITY_LABEL, CONDITION_LABEL } from "@/lib/catalog-meta";
import { convertMinor } from "@/lib/money";
export const dynamic = "force-dynamic";
export const metadata = { title: "Compare products" };

export default async function Compare({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const actor = await requireApprovedBuyer();
  const slugs = ((await searchParams).slugs ?? "").split(",").filter(Boolean).slice(0, 4);
  const { currency, rate } = await displayCurrency(actor, null);
  const rows = slugs.length ? await db.select().from(products).where(inArray(products.slug, slugs)) : [];
  if (!rows.length) return (<><PageHeader title="Compare products" /><Empty title="Select products to compare" action={<Link className="btn-deep" href="/catalog">Browse catalog</Link>}>Tick “Compare” on up to four products in the catalog, then open the comparison from the bar at the bottom of the page.</Empty></>);
  const ordered = slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as typeof rows;
  const specKeys: string[] = [];
  for (const p of ordered) for (const s of p.specs) { const k = `${s.group} — ${s.label}`; if (!specKeys.includes(k)) specKeys.push(k); }
  const val = (p: (typeof rows)[number], k: string) => p.specs.find((s) => `${s.group} — ${s.label}` === k)?.value ?? "—";
  return (
    <div>
      <PageHeader title="Compare products" />
      <div className="panel overflow-x-auto">
        <table className="tbl min-w-[720px]">
          <thead><tr><th className="w-48" />{ordered.map((p) => <th key={p.id} className="align-top"><ProductArt kind={p.imageKey} className="mb-2 aspect-[4/3] w-full max-w-[180px] rounded-sm" /><Link className="text-sm font-semibold text-deep-900 hover:underline" href={`/products/${p.slug}`}>{p.name}</Link></th>)}</tr></thead>
          <tbody>
            <tr><td className="text-steel-500">Wholesale from</td>{ordered.map((p) => <td key={p.id} className="font-semibold text-deep-900"><Money cents={rate ? convertMinor(BigInt(p.wholesaleCents), rate.rate) : null} currency={currency} /></td>)}</tr>
            <tr><td className="text-steel-500">MOQ</td>{ordered.map((p) => <td key={p.id} className="num">{p.moq}</td>)}</tr>
            <tr><td className="text-steel-500">Condition</td>{ordered.map((p) => <td key={p.id}>{CONDITION_LABEL[p.condition]}</td>)}</tr>
            <tr><td className="text-steel-500">Availability</td>{ordered.map((p) => <td key={p.id}>{AVAILABILITY_LABEL[p.availability].label}</td>)}</tr>
            {specKeys.map((k) => <tr key={k}><td className="text-steel-500">{k}</td>{ordered.map((p) => <td key={p.id}>{val(p, k)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
