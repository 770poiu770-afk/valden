import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { getSettings } from "@/lib/settings";
import { ActionButton, ActionForm } from "@/components/ActionForm";
import { Money, PageHeader, StatusPill } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Pricing" };
export default async function Pricing() {
  await requireStaff("pricing.manage");
  const s = await getSettings();
  const pp = s.pricingPolicy;
  const [counts, flagged] = await Promise.all([
    db.execute(sql`SELECT pricing_flag AS f, count(*)::int n FROM products GROUP BY 1`),
    db.select().from(products).where(sql`${products.pricingFlag} IN ('NEEDS_REVIEW','FALLBACK_POLICY')`).orderBy(desc(products.referencePriceCents)).limit(40),
  ]);
  const c = Object.fromEntries((counts.rows as { f: string; n: number }[]).map((r) => [r.f, r.n]));
  return (
    <div className="space-y-6">
      <PageHeader title="Pricing" intro="Wholesale list prices are derived from a reference market price using the policy below. Reference prices, supplier quotes and your list prices are recorded separately." />
      <div className="grid gap-4 sm:grid-cols-4">
        {[["NONE", "Standard premium"], ["FALLBACK_POLICY", "Fallback policy"], ["NEEDS_REVIEW", "Needs review"], ["OVERRIDE", "Admin override"]].map(([k, l]) => <Link key={k} href={`/admin/products?flag=${k}`} className="panel px-4 py-3"><p className="text-xs text-steel-500">{l}</p><p className="num text-2xl font-bold text-deep-900">{c[k] ?? 0}</p></Link>)}
      </div>
      <section className="panel panel-pad">
        <h2 className="mb-1 font-semibold">Premium policy</h2>
        <p className="mb-4 text-sm text-steel-500">The target premium is applied over the reference price only when it stays within the maximum share of the reference. Otherwise the fallback applies: a configured percentage markup (flagged for review), or no premium with the product held for manual pricing.</p>
        <ActionForm action="/api/admin/pricing/policy" className="grid gap-4 md:grid-cols-3" submitLabel="Save policy">
          <div><label className="field-label" htmlFor="targetPremium">Target premium (USD)</label><input id="targetPremium" name="targetPremium" defaultValue={pp.targetPremiumMinor / 100} className="input" /></div>
          <div><label className="field-label" htmlFor="minPremium">Allowed band — min (USD)</label><input id="minPremium" name="minPremium" defaultValue={pp.minPremiumMinor / 100} className="input" /></div>
          <div><label className="field-label" htmlFor="maxPremium">Allowed band — max (USD)</label><input id="maxPremium" name="maxPremium" defaultValue={pp.maxPremiumMinor / 100} className="input" /></div>
          <div><label className="field-label" htmlFor="maxPremiumPercent">Max premium as % of reference</label><input id="maxPremiumPercent" name="maxPremiumPercent" defaultValue={pp.maxPremiumPercentBps / 100} className="input" /></div>
          <div><label className="field-label" htmlFor="fallbackMode">When the premium is implausible</label><select id="fallbackMode" name="fallbackMode" defaultValue={pp.fallbackMode} className="input"><option value="PERCENT">Apply fallback % and flag</option><option value="FLAG">Hold for manual pricing</option></select></div>
          <div><label className="field-label" htmlFor="fallbackMarkupPercent">Fallback markup %</label><input id="fallbackMarkupPercent" name="fallbackMarkupPercent" defaultValue={pp.fallbackMarkupBps / 100} className="input" /></div>
          <div className="md:col-span-2"><label className="field-label" htmlFor="tierSchedule">Quantity-break schedule (MOQ multiple : discount %)</label><input id="tierSchedule" name="tierSchedule" defaultValue={pp.tierSchedule.map((t) => `${t.moqMultiple}:${t.discountBps / 100}`).join(", ")} className="input num" /></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="recompute" className="accent-deep" /> Recalculate all prices after saving</label>
        </ActionForm>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel panel-pad space-y-3">
          <h2 className="font-semibold">Export / import prices (CSV)</h2>
          <p className="text-sm text-steel-500">Export, edit reference prices, sources, verification dates, markups, overrides, MOQ and availability, then import. Columns you omit are left unchanged; every change is audited.</p>
          <a className="btn-outline" href="/api/admin/pricing/export">Download price file</a>
          <ActionForm action="/api/admin/pricing/import" encoding="multipart" submitLabel="Import price file">
            <input type="file" name="file" accept=".csv,text/csv" required aria-label="Price CSV" className="input" />
          </ActionForm>
        </div>
        <div className="panel panel-pad space-y-3">
          <h2 className="font-semibold">Recalculate</h2>
          <p className="text-sm text-steel-500">Re-applies the current policy to every product and regenerates quantity tiers. Overrides and product markups are respected. Manually edited tiers are replaced.</p>
          <ActionButton action="/api/admin/pricing/recompute" label="Recalculate all prices" className="btn-deep" confirm="Recalculate every product price from the current policy?" />
        </div>
      </section>
      <section>
        <h2 className="wide mb-3 text-lg">Products needing a pricing decision</h2>
        <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl min-w-[720px]"><thead><tr><th>Product</th><th className="text-right">Reference</th><th className="text-right">Wholesale</th><th>State</th><th>Note</th></tr></thead>
          <tbody>{flagged.map((p) => <tr key={p.id}><td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link></td><td className="text-right"><Money cents={p.referencePriceCents} currency="USD" /></td><td className="text-right"><Money cents={p.wholesaleCents} currency="USD" /></td><td><StatusPill status={p.pricingFlag} /></td><td className="text-xs text-steel-500">{p.pricingNote}</td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}
