import { desc } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { getSettings } from "@/lib/settings";
import { ActionForm } from "@/components/ActionForm";
import { Badge, PageHeader, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

function Card({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return <section className="panel panel-pad"><h2 className="font-semibold">{title}</h2>{intro && <p className="mb-4 mt-1 text-sm text-steel-500">{intro}</p>}{children}</section>;
}

export default async function Settings() {
  await requireStaff("settings.manage");
  const s = await getSettings();
  const rates = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.effectiveAt)).limit(20);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" intro="Commercial rules. Changes take effect immediately and are recorded in the audit log." />
      <Card title="Exchange rates" intro="Prices are maintained in USD. Record the rate your finance team will honour, with its source — the platform never fetches or invents rates. Each order stores the rate it was priced at.">
        <ActionForm action="/api/admin/fx" className="grid gap-3 md:grid-cols-[8rem_10rem_1fr_12rem_auto]" resetOnSuccess>
          <select name="quote" className="input" aria-label="Currency"><option value="ILS">USD → ILS</option><option value="EUR">USD → EUR</option></select>
          <input name="rate" placeholder="e.g. 3.6512" required className="input num" aria-label="Rate" />
          <input name="source" placeholder="Source, e.g. Bank of Israel representative rate" required className="input" aria-label="Source" />
          <input name="effectiveAt" type="datetime-local" className="input" aria-label="Effective from" />
          <button className="btn-deep">Record rate</button>
        </ActionForm>
        <div className="mt-4 overflow-x-auto"><table className="tbl min-w-[560px]"><thead><tr><th>Pair</th><th className="text-right">Rate</th><th>Source</th><th>Effective</th><th /></tr></thead>
          <tbody>{rates.map((r) => <tr key={r.id}><td>{r.base}→{r.quote}</td><td className="num text-right">{Number(r.rate)}</td><td className="text-xs">{r.source}</td><td className="text-xs">{fmtDate(r.effectiveAt, true)}</td><td>{r.isSample ? <Badge tone="warn">Sample</Badge> : <Badge tone="ok">Recorded</Badge>}</td></tr>)}</tbody></table></div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Minimum order value" intro="Online orders below this value cannot be checked out. Quotations are exempt.">
          <ActionForm action="/api/admin/settings/minimumOrderValue" className="flex gap-2" submitLabel="Save" submitClass="btn-outline">
            <input name="amount" defaultValue={s.minimumOrderValue.amountMinor / 100} className="input num" aria-label="Amount" />
            <select name="currency" defaultValue={s.minimumOrderValue.currency} className="input w-28" aria-label="Currency"><option>ILS</option><option>USD</option><option>EUR</option></select>
          </ActionForm>
        </Card>
        <Card title="Target programme value" intro="Used for messaging and to suggest quotations for large carts.">
          <ActionForm action="/api/admin/settings/targetOrderValue" className="flex gap-2" submitLabel="Save" submitClass="btn-outline">
            <input name="amount" defaultValue={s.targetOrderValue.amountMinor / 100} className="input num" aria-label="Amount" />
            <select name="currency" defaultValue={s.targetOrderValue.currency} className="input w-28" aria-label="Currency"><option>ILS</option><option>USD</option><option>EUR</option></select>
          </ActionForm>
        </Card>
        <Card title="Currencies offered to buyers">
          <ActionForm action="/api/admin/settings/enabledCurrencies" className="flex flex-wrap gap-4" submitLabel="Save" submitClass="btn-outline">
            {["USD", "EUR", "ILS"].map((c) => <label key={c} className="flex items-center gap-2 text-sm"><input type="checkbox" name="currency+" value={c} defaultChecked={s.enabledCurrencies.includes(c as "USD")} className="accent-deep" /> {c}</label>)}
          </ActionForm>
        </Card>
        <Card title="Taxes" intro={s.taxRules.note}>
          <ActionForm action="/api/admin/settings/taxRules" className="space-y-3" submitLabel="Save" submitClass="btn-outline">
            <div><label className="field-label" htmlFor="byCountry">Rate by delivery country (CC:percent, comma-separated)</label><input id="byCountry" name="byCountry" defaultValue={Object.entries(s.taxRules.byCountry).map(([c, r]) => `${c}:${r / 100}`).join(", ")} className="input num" /></div>
            <div><label className="field-label" htmlFor="defaultRate">Default rate % (all other countries)</label><input id="defaultRate" name="defaultRate" defaultValue={s.taxRules.defaultRateBps / 100} className="input num" /></div>
            <div><label className="field-label" htmlFor="note">Note</label><input id="note" name="note" defaultValue={s.taxRules.note} className="input" /></div>
          </ActionForm>
        </Card>
        <Card title="Order review and risk" intro="Orders matching any rule are held for review before payment is requested.">
          <ActionForm action="/api/admin/settings/orderRules" className="space-y-3" submitLabel="Save" submitClass="btn-outline">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requireOrderConfirmation" defaultChecked={s.orderRules.requireOrderConfirmation} className="accent-deep" /> Review every order (recommended while stock is indicative)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="reviewFirstOrder" defaultChecked={s.orderRules.reviewFirstOrder} className="accent-deep" /> Review each account&apos;s first order</label>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="field-label" htmlFor="riskThreshold">Review orders from (USD)</label><input id="riskThreshold" name="riskThreshold" defaultValue={s.orderRules.riskReviewThresholdBaseMinor / 100} className="input num" /></div>
              <div><label className="field-label" htmlFor="newCompanyReviewDays">New account period (days)</label><input id="newCompanyReviewDays" name="newCompanyReviewDays" type="number" defaultValue={s.orderRules.newCompanyReviewDays} className="input num" /></div>
            </div>
          </ActionForm>
        </Card>
        <Card title="Payments" intro="Set the PayPal maximum to the limit confirmed for your merchant account. Larger orders must use bank transfer.">
          <ActionForm action="/api/admin/settings/payments" className="space-y-3" submitLabel="Save" submitClass="btn-outline">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="paypalEnabled" defaultChecked={s.payments.paypalEnabled} className="accent-deep" /> PayPal enabled</label>
            <div><label className="field-label" htmlFor="paypalMax">PayPal maximum per order (USD equivalent; 0 = no app limit)</label><input id="paypalMax" name="paypalMax" defaultValue={s.payments.paypalMaxOrderBaseMinor / 100} className="input num" /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="manualTransferEnabled" defaultChecked={s.payments.manualTransferEnabled} className="accent-deep" /> Bank transfer enabled</label>
            <div><label className="field-label" htmlFor="manualTransferInstructions">Bank transfer instructions shown to buyers</label><textarea id="manualTransferInstructions" name="manualTransferInstructions" rows={3} defaultValue={s.payments.manualTransferInstructions} className="input" /></div>
          </ActionForm>
        </Card>
        <Card title="Quotations">
          <ActionForm action="/api/admin/settings/quoteDefaults" className="flex items-end gap-2" submitLabel="Save" submitClass="btn-outline">
            <div><label className="field-label" htmlFor="offerValidityDays">Default offer validity (days)</label><input id="offerValidityDays" name="offerValidityDays" type="number" min={1} max={90} defaultValue={s.quoteDefaults.offerValidityDays} className="input num w-32" /></div>
          </ActionForm>
        </Card>
        <Card title="Shipping methods" intro="JSON list of { code, name, description, quotedByStaff }. Methods quoted by staff always route orders through review.">
          <ActionForm action="/api/admin/settings/shippingMethods" submitLabel="Save" submitClass="btn-outline">
            <textarea name="json" rows={8} defaultValue={JSON.stringify(s.shippingMethods, null, 2)} className="input num text-xs" aria-label="Shipping methods JSON" />
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
