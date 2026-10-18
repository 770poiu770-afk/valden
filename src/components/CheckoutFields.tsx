import Link from "next/link";
import type { addresses } from "@/db/schema";
import type { AppSettings } from "@/lib/settings";
import { makeT, type Locale } from "@/lib/i18n";
import { shippingText, transferText } from "@/lib/labels";

type Addr = typeof addresses.$inferSelect;
const fmtAddr = (a: Addr) => [a.line1, a.line2, a.city, a.region, a.postalCode, a.countryCode].filter(Boolean).join(", ");

/** Shared address / logistics / payment fields for cart checkout and quote acceptance. */
export function CheckoutFields({ addrs, settings, currency, paypalBlocked, paypalReason, l = "en" }: { addrs: Addr[]; settings: AppSettings; currency: string; paypalBlocked: boolean; paypalReason?: string; l?: Locale }) {
  const t = makeT(l);
  const ship = addrs.filter((a) => a.kind === "SHIPPING");
  const bill = addrs.filter((a) => a.kind === "BILLING");
  return (
    <div className="min-w-0 space-y-6">
      <input type="hidden" name="currency" value={currency} />
      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">{t("Delivery and billing", "משלוח וחיוב")}</h2>
        {(!ship.length || !bill.length) && <p className="mb-3 text-sm text-bad">{!ship.length ? t("Add a delivery address in", "הוסיפו קודם כתובת למשלוח בעמוד") : t("Add a billing address in", "הוסיפו קודם כתובת לחיוב בעמוד")} <Link className="link" href="/portal/company">{t("Company & addresses", "חברה וכתובות")}</Link>{t(" first.", ".")}</p>}
        <div className="grid gap-6 md:grid-cols-2">
          <fieldset><legend className="field-label">{t("Deliver to", "משלוח אל")}</legend>
            <div className="space-y-2">{ship.map((a, i) => (
              <label key={a.id} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
                <input type="radio" name="shippingAddressId" value={a.id} defaultChecked={a.isDefault || i === 0} className="mt-1 accent-deep" required />
                <span className="min-w-0 break-words" dir="auto"><span className="font-medium text-deep-900">{a.label}</span> — {a.contactName}<br /><span className="text-steel-500">{fmtAddr(a)}</span></span>
              </label>))}</div>
          </fieldset>
          <fieldset><legend className="field-label">{t("Invoice to", "חשבונית אל")}</legend>
            <div className="space-y-2">{bill.map((a, i) => (
              <label key={a.id} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
                <input type="radio" name="billingAddressId" value={a.id} defaultChecked={a.isDefault || i === 0} className="mt-1 accent-deep" required />
                <span className="min-w-0 break-words"><span className="font-medium text-deep-900">{a.label}</span> — {a.contactName}<br /><span className="text-steel-500">{fmtAddr(a)}</span></span>
              </label>))}</div>
          </fieldset>
        </div>
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">{t("Shipping method", "שיטת משלוח")}</h2>
        <div className="space-y-2">{settings.shippingMethods.map((m, i) => (
          <label key={m.code} className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
            <input type="radio" name="shippingMethod" value={m.code} defaultChecked={i === 0} className="mt-1 accent-deep" />
            <span><span className="font-medium text-deep-900">{shippingText(m, l).name}</span><br /><span className="text-steel-500">{shippingText(m, l).description}</span></span>
          </label>))}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><label className="field-label" htmlFor="poNumber">{t("Purchase order number", "מספר הזמנת רכש")}</label><input id="poNumber" name="poNumber" maxLength={60} className="input" /></div>
          <div><label className="field-label" htmlFor="incoterm">{t("Incoterm (optional)", "Incoterm (רשות)")}</label>
            <select id="incoterm" name="incoterm" className="input"><option value="">{t("Not specified", "לא צוין")}</option>{["EXW", "FCA", "CPT", "CIP", "DAP", "DPU", "DDP", "FOB", "CIF"].map((x) => <option key={x}>{x}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="deliveryInstructions">{t("Delivery instructions", "הוראות משלוח")}</label><textarea id="deliveryInstructions" name="deliveryInstructions" rows={3} maxLength={1000} className="input" dir="auto" placeholder={t("Dock hours, booking references, security requirements", "שעות פריקה, מספרי הזמנת תור, דרישות אבטחה")} /></div>
        </div>
        <details className="mt-4 rounded border border-line p-3 text-sm">
          <summary className="cursor-pointer font-medium text-deep-900">{t("Export documentation details", "פרטים למסמכי יצוא")}</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="exporterOfRecord">{t("Exporter of record", "היצואן הרשום")}</label><input id="exporterOfRecord" name="exporterOfRecord" className="input" /></div>
            <div><label className="field-label" htmlFor="importerOfRecord">{t("Importer of record", "היבואן הרשום")}</label><input id="importerOfRecord" name="importerOfRecord" className="input" /></div>
            <div><label className="field-label" htmlFor="consigneeTaxId">{t("Consignee tax / EORI number", "מספר מס / EORI של הנמען")}</label><input id="consigneeTaxId" name="consigneeTaxId" className="input" /></div>
            <div className="sm:col-span-2"><label className="field-label" htmlFor="exportNotes">{t("Notes for commercial invoice", "הערות לחשבונית המסחרית")}</label><textarea id="exportNotes" name="exportNotes" rows={2} className="input" dir="auto" /></div>
          </div>
        </details>
      </section>

      <section className="panel panel-pad">
        <h2 className="mb-4 font-semibold">{t("Payment method", "אמצעי תשלום")}</h2>
        <div className="space-y-2">
          {settings.payments.paypalEnabled && (
            <label className={`flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50 ${paypalBlocked ? "opacity-60" : ""}`}>
              <input type="radio" name="paymentMethod" value="PAYPAL" defaultChecked={!paypalBlocked} disabled={paypalBlocked} className="mt-1 accent-deep" />
              <span><span className="font-medium text-deep-900">PayPal</span><br /><span className="text-steel-500">{paypalBlocked ? paypalReason : t("Pay securely with PayPal after the order is confirmed. PayPal limits and eligibility apply.", "תשלום מאובטח ב-PayPal לאחר אישור ההזמנה. בכפוף למגבלות ולזכאות של PayPal.")}</span></span>
            </label>
          )}
          {settings.payments.manualTransferEnabled && (
            <label className="flex gap-2 rounded border border-line p-3 text-sm has-[:checked]:border-deep has-[:checked]:bg-deep-50">
              <input type="radio" name="paymentMethod" value="MANUAL_TRANSFER" defaultChecked={paypalBlocked || !settings.payments.paypalEnabled} className="mt-1 accent-deep" />
              <span><span className="font-medium text-deep-900">{t("Bank transfer", "העברה בנקאית")}</span><br /><span className="text-steel-500">{transferText(settings.payments.manualTransferInstructions, l)}</span></span>
            </label>
          )}
        </div>
      </section>
    </div>
  );
}
