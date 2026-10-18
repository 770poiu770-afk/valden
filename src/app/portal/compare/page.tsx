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
import { getT } from "@/server/locale";
import { AVAILABILITY_HE, CONDITION_HE } from "@/lib/labels";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Compare products", "השוואת מוצרים") }; }

export default async function Compare({ searchParams }: { searchParams: Promise<{ slugs?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { l, t } = await getT();
  const slugs = ((await searchParams).slugs ?? "").split(",").filter(Boolean).slice(0, 4);
  const { currency, rate } = await displayCurrency(actor, null);
  const rows = slugs.length ? await db.select().from(products).where(inArray(products.slug, slugs)) : [];
  if (!rows.length) return (<><PageHeader title={t("Compare products", "השוואת מוצרים")} /><Empty title={t("Select products to compare", "בחרו מוצרים להשוואה")} action={<Link className="btn-deep" href="/catalog">{t("Browse catalog", "לקטלוג")}</Link>}>{t("Tick “Compare” on up to four products in the catalog, then open the comparison from the bar at the bottom of the page.", "סמנו „השוואה” בעד ארבעה מוצרים בקטלוג, ואז פתחו את ההשוואה מהפס שבתחתית הדף.")}</Empty></>);
  const ordered = slugs.map((s) => rows.find((r) => r.slug === s)).filter(Boolean) as typeof rows;
  const specKeys: string[] = [];
  for (const p of ordered) for (const s of p.specs) { const k = `${s.group} — ${s.label}`; if (!specKeys.includes(k)) specKeys.push(k); }
  const val = (p: (typeof rows)[number], k: string) => p.specs.find((s) => `${s.group} — ${s.label}` === k)?.value ?? "—";
  return (
    <div>
      <PageHeader title={t("Compare products", "השוואת מוצרים")} />
      <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
        <table className="tbl min-w-[720px]">
          <thead><tr><th className="w-48"><span className="sr-only">{t("Attribute", "מאפיין")}</span></th>{ordered.map((p) => <th key={p.id} scope="col" className="align-top"><ProductArt kind={p.imageKey} className="mb-2 aspect-[4/3] w-full max-w-[180px] rounded-sm" decorative /><Link className="text-sm font-semibold text-deep-900 hover:underline" href={`/products/${p.slug}`} dir="auto">{p.name}</Link></th>)}</tr></thead>
          <tbody>
            <tr><th scope="row" className="text-start font-normal text-steel-500">{t("Price from", "מחיר החל מ")}</th>{ordered.map((p) => <td key={p.id} className="font-semibold text-deep-900"><Money cents={rate ? convertMinor(BigInt(p.wholesaleCents), rate.rate) : null} currency={currency} /></td>)}</tr>
            <tr><th scope="row" className="text-start font-normal text-steel-500">{t("MOQ", "מינימום")}</th>{ordered.map((p) => <td key={p.id} className="num">{p.moq}</td>)}</tr>
            <tr><th scope="row" className="text-start font-normal text-steel-500">{t("Condition", "מצב")}</th>{ordered.map((p) => <td key={p.id}>{l === "he" ? CONDITION_HE[p.condition] : CONDITION_LABEL[p.condition]}</td>)}</tr>
            <tr><th scope="row" className="text-start font-normal text-steel-500">{t("Availability", "זמינות")}</th>{ordered.map((p) => <td key={p.id}>{l === "he" ? AVAILABILITY_HE[p.availability] : AVAILABILITY_LABEL[p.availability].label}</td>)}</tr>
            {specKeys.map((k) => <tr key={k}><th scope="row" className="text-start font-normal text-steel-500" dir="auto">{k}</th>{ordered.map((p) => <td key={p.id} dir="auto">{val(p, k)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
