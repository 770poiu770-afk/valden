import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { viewCart } from "@/server/cart";
import { blockingIssues } from "@/server/pricing-engine";
import { paypalCapExceeded, taxRateFor } from "@/server/orders";
import { paypal } from "@/server/paypal";
import { ActionForm } from "@/components/ActionForm";
import { CheckoutFields } from "@/components/CheckoutFields";
import { Money, Notice, PageHeader } from "@/components/ui";
import { percentOfBps, formatMoney } from "@/lib/money";
import { getT } from "@/server/locale";
import { trMessage } from "@/lib/messages-he";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Checkout", "תשלום") }; }

export default async function Checkout({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { l, t } = await getT();
  const cart = await viewCart(actor, (await searchParams).currency ?? "USD");
  if (!cart.lines.length) redirect("/portal/cart");
  const issues = blockingIssues(cart);
  const addrs = await db.select().from(addresses).where(eq(addresses.companyId, actor.companyId));
  const s = cart.settings;
  const defShip = addrs.find((a) => a.kind === "SHIPPING" && a.isDefault) ?? addrs.find((a) => a.kind === "SHIPPING");
  const taxBps = defShip ? taxRateFor(defShip.countryCode, s) : 0;
  const tax = cart.subtotalCents !== null ? percentOfBps(cart.subtotalCents, taxBps) : null;
  const estTotal = cart.subtotalCents !== null && tax !== null ? cart.subtotalCents + tax : null;
  const overCap = estTotal !== null && cart.rate ? paypalCapExceeded(estTotal, cart.rate.rate, s) : false;
  const notConfigured = !paypal().isConfigured();
  const paypalBlocked = overCap || notConfigured;
  const capText = formatMoney(BigInt(s.payments.paypalMaxOrderBaseMinor), "USD");
  const reason = overCap ? t(`Not available: this order exceeds the store's PayPal limit of ${capText}.`, `לא זמין: ההזמנה חורגת מתקרת ה-PayPal של האתר (${capText}).`) : notConfigured ? t("PayPal is not yet configured in this environment.", "PayPal עדיין לא הוגדר בסביבה זו.") : undefined;

  return (
    <div>
      <PageHeader title={t("Checkout", "תשלום")} back={{ href: `/portal/cart?currency=${cart.currency}`, label: t("Back to cart", "חזרה לסל") }}
        intro={t("Submitting places your order for review. We confirm availability, freight and payment terms before any payment is taken.", "השליחה מעבירה את ההזמנה לבדיקה. אנחנו מאשרים זמינות, משלוח ותנאי תשלום לפני שנגבה תשלום כלשהו.")} />
      {issues.length > 0 && <div className="mb-6"><Notice tone="bad" title={t("This order cannot be placed yet", "עדיין לא ניתן לבצע את ההזמנה")}><ul className="list-disc ps-5">{issues.map((i) => <li key={i}>{trMessage(i, l)}</li>)}</ul><Link className="link" href="/portal/cart">{t("Return to cart", "חזרה לסל")}</Link></Notice></div>}
      <ActionForm action="/api/orders" className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" submitLabel={undefined}>
        <CheckoutFields l={l} addrs={addrs} settings={s} currency={cart.currency} paypalBlocked={paypalBlocked} paypalReason={reason} />
        <aside className="space-y-4 self-start xl:sticky xl:top-6">
          <div className="panel panel-pad space-y-2 text-sm">
            <h2 className="mb-2 font-semibold">{t("Order summary", "סיכום ההזמנה")}</h2>
            <ul className="mb-3 space-y-1 text-xs text-steel-500">{cart.lines.map((l) => <li key={l.variantId} className="flex justify-between gap-2"><span className="truncate" dir="auto">{l.quantity} × {l.name}</span><Money cents={l.lineCents} currency={cart.currency} /></li>)}</ul>
            <div className="flex justify-between"><span className="text-steel-500">{t("Subtotal", "סכום ביניים")}</span><Money cents={cart.subtotalCents} currency={cart.currency} /></div>
            <div className="flex justify-between"><span className="text-steel-500">{t("Tax", "מע״מ")} ({(taxBps / 100).toFixed(taxBps % 100 ? 2 : 0)}%{t(", est.", ", משוער")})</span><Money cents={tax} currency={cart.currency} /></div>
            <div className="flex justify-between"><span className="text-steel-500">{t("Freight", "משלוח")}</span><span>{t("Quoted after review", "יתומחר לאחר הבדיקה")}</span></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-deep-900"><span>{t("Estimated total", "סה״כ משוער")}</span><Money cents={estTotal} currency={cart.currency} /></div>
            <p className="text-xs text-steel-500">{t("Tax is based on the delivery country. Final totals are shown on your order confirmation.", "המע״מ נקבע לפי ארץ המשלוח. הסכומים הסופיים מופיעים באישור ההזמנה.")}</p>
            <button type="submit" disabled={issues.length > 0} className="btn-primary mt-3 w-full">{t("Place order for review", "שליחת ההזמנה לבדיקה")}</button>
          </div>
        </aside>
      </ActionForm>
    </div>
  );
}
