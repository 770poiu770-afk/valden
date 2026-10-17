import Link from "next/link";
import type { addresses } from "@/db/schema";
import type { AppSettings } from "@/lib/settings";

type Addr = typeof addresses.$inferSelect;
const fmtAddr = (a: Addr) => [a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode].filter(Boolean).join(", ");

/** Shared address / logistics / payment fields for cart checkout and quote acceptance. */
export function CheckoutFields({ addrs, settings, currency, paypalBlocked, paypalReason }: { addrs: Addr[]; settings: AppSettings; currency: string; paypalBlocked: boolean; paypalReason?: string }) {
  const ship = addrs.filter((a) => a.kind === "SHIPPING");
  const bill = addrs.filter((a) => a.kind === "BILLING");
  return (
    <div className="min-w-0 space-y-6">
      <input type="hidden" name="currency" value={currency} />
      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">Delivery and billing</h2>
        {(!ship.length || !bill.length) && <p className="mb-3 text-sm text-bad">Add a {!ship.length ? "delivery" : "billing"} address in <Link className="link" href="/portal/company">Company & addresses</Link> first.</p>}
        <div className="grid gap-6 md:grid-cols-2">
          <fieldset><legend className="field-label">Deliver to</legend>
            <div className="space-y-2">{ship.map((a, i) => (
              <label key={a.id} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
                <input type="radio" name="shippingAddressId" value={a.id} defaultChecked={a.isDefault || i === 0} className="mt-1 accent-deep" required />
                <span className="min-w-0 break-words"><span className="font-medium text-deep-900">{a.label}</span> — {a.contactName}<br /><span className="text-steel-500">{fmtAddr(a)}</span></span>
              </label>))}</div>
          </fieldset>
          <fieldset><legend className="field-label">Invoice to</legend>
            <div className="space-y-2">{bill.map((a, i) => (
              <label key={a.id} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
                <input type="radio" name="billingAddressId" value={a.id} defaultChecked={a.isDefault || i === 0} className="mt-1 accent-deep" required />
                <span className="min-w-0 break-words"><span className="font-medium text-deep-900">{a.label}</span> — {a.contactName}<br /><span className="text-steel-500">{fmtAddr(a)}</span></span>
              </label>))}</div>
          </fieldset>
        </div>
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">Shipping method</h2>
        <div className="space-y-2">{settings.shippingMethods.map((m, i) => (
          <label key={m.code} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
            <input type="radio" name="shippingMethod" value={m.code} defaultChecked={i === 0} className="mt-1 accent-deep" />
            <span><span className="font-medium text-deep-900">{m.name}</span><br /><span className="text-steel-500">{m.description}</span></span>
          </label>))}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="poNumber">Purchase order number</label><input id="poNumber" name="poNumber" maxLength={60} className="input" /></div>
          <div><label className="field-label" htmlFor="incoterm">Incoterm (optional)</label>
            <select id="incoterm" name="incoterm" className="input"><option value="">Not specified</option>{["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CIF"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="deliveryInstructions">Delivery instructions</label><textarea id="deliveryInstructions" name="deliveryInstructions" rows={3} maxLength={1000} className="input" placeholder="Dock hours, booking references, security requirements" /></div>
        </div>
        <details className="mt-4 rounded border border-line p-3 text-sm">
          <summary className="cursor-pointer font-medium text-deep-900">Export documentation details</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="exporterOfRecord">Exporter of record</label><input id="exporterOfRecord" name="exporterOfRecord" className="input" /></div>
            <div><label className="field-label" htmlFor="importerOfRecord">Importer of record</label><input id="importerOfRecord" name="importerOfRecord" className="input" /></div>
            <div><label className="field-label" htmlFor="consigneeTaxId">Consignee tax / EORI number</label><input id="consigneeTaxId" name="consigneeTaxId" className="input" /></div>
            <div className="sm:col-span-2"><label className="field-label" htmlFor="exportNotes">Notes for commercial invoice</label><textarea id="exportNotes" name="exportNotes" rows={2} className="input" /></div>
          </div>
        </details>
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">Payment method</h2>
        <div className="space-y-2">
          {settings.payments.paypalEnabled && (
            <label className={`flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50 ${paypalBlocked ? "opacity-60" : ""}`}>
              <input type="radio" name="paymentMethod" value="PAYPAL" defaultChecked={!paypalBlocked} disabled={paypalBlocked} className="mt-1 accent-deep" />
              <span><span className="font-medium text-deep-900">PayPal</span><br /><span className="text-steel-500">{paypalBlocked ? paypalReason : "Pay securely with PayPal after the order is confirmed. PayPal limits and eligibility apply."}</span></span>
            </label>
          )}
          {settings.payments.manualTransferEnabled && (
            <label className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
              <input type="radio" name="paymentMethod" value="MANUAL_TRANSFER" defaultChecked={paypalBlocked || !settings.payments.paypalEnabled} className="mt-1 accent-deep" />
              <span><span className="font-medium text-deep-900">Bank transfer</span><br /><span className="text-steel-500">{settings.payments.manualTransferInstructions}</span></span>
            </label>
          )}
        </div>
      </section>
    </div>
  );
}
