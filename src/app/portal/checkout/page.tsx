import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { addresses, companies } from "@/db/schema";
import { requireApprovedBuyer } from "@/server/guards";
import { viewCart } from "@/server/cart";
import { blockingIssues } from "@/server/pricing-engine";
import { flatRateBase, paypalCapExceeded, taxRateFor } from "@/server/orders";
import { paypal } from "@/server/paypal";
import { ActionForm } from "@/components/ActionForm";
import { CheckoutFields } from "@/components/CheckoutFields";
import { Money, Notice, PageHeader } from "@/components/ui";
import { convertMinor, percentOfBps, formatMoney } from "@/lib/money";
import { CheckoutTotals } from "@/components/client/CheckoutTotals";
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
  // No saved address yet (new customer): estimate VAT from the account country, which is the inline address default.
  const accountCountry = (await db.select({ cc: companies.countryCode }).from(companies).where(eq(companies.id, actor.companyId)))[0]?.cc ?? "IL";
  const taxBps = taxRateFor(defShip?.countryCode ?? accountCountry, s);
  // Per-method delivery charge in the order currency (null = quoted by staff after review). Display only; the server recomputes on order.
  const methods = s.shippingMethods.map((m) => { const base = flatRateBase(m); return { code: m.code, shippingCents: m.quotedByStaff ? null : base && cart.rate ? convertMinor(base, cart.rate.rate).toString() : "0" }; });
  const maxShip = methods.reduce((mx, m) => (m.shippingCents && BigInt(m.shippingCents) > mx ? BigInt(m.shippingCents) : mx), 0n);
  const tax = cart.subtotalCents !== null ? percentOfBps(cart.subtotalCents + maxShip, taxBps) : null;
  const estTotal = cart.subtotalCents !== null && tax !== null ? cart.subtotalCents + maxShip + tax : null;
  const overCap = estTotal !== null && cart.rate ? paypalCapExceeded(estTotal, cart.rate.rate, s) : false;
  const notConfigured = !paypal().isConfigured();
  const paypalBlocked = overCap || notConfigured;
  const capText = formatMoney(BigInt(s.payments.paypalMaxOrderBaseMinor), "USD");
  const reason = overCap ? t(`Not available: this order exceeds the store's PayPal limit of ${capText}.`, `לא זמין: ההזמנה חורגת מתקרת ה-PayPal של האתר (${capText}).`) : notConfigured ? t("PayPal is not yet configured in this environment.", "PayPal עדיין לא הוגדר בסביבה זו.") : undefined;

  return (
    <div>
      <PageHeader title={t("Checkout", "תשלום")} back={{ href: `/portal/cart?currency=${cart.currency}`, label: t("Back to cart", "חזרה לסל") }}
        intro={t("Choose delivery and payment. With standard delivery you pay right after placing the order; freight arranged by us is confirmed first.", "בחרו משלוח ואמצעי תשלום. במשלוח רגיל משלמים מיד אחרי ביצוע ההזמנה; הובלה שאנחנו מארגנים מאושרת קודם.")} />
      {issues.length > 0 && <div className="mb-6"><Notice tone="bad" title={t("This order cannot be placed yet", "עדיין לא ניתן לבצע את ההזמנה")}><ul className="list-disc ps-5">{issues.map((i) => <li key={i}>{trMessage(i, l)}</li>)}</ul><Link className="link" href="/portal/cart">{t("Return to cart", "חזרה לסל")}</Link></Notice></div>}
      <ActionForm action="/api/orders" className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" submitLabel={undefined}>
        <CheckoutFields l={l} addrs={addrs} settings={s} currency={cart.currency} paypalBlocked={paypalBlocked} paypalReason={reason}
          shippingPrices={Object.fromEntries(methods.map((m) => [m.code, m.shippingCents === null ? null : m.shippingCents === "0" ? t("Free", "חינם") : formatMoney(BigInt(m.shippingCents), cart.currency)]))} />
        <aside className="space-y-4 self-start xl:sticky xl:top-6">
          <div className="panel panel-pad space-y-2 text-sm">
            <h2 className="mb-2 font-semibold">{t("Order summary", "סיכום ההזמנה")}</h2>
            <ul className="mb-3 space-y-1 text-xs text-steel-500">{cart.lines.map((l) => <li key={l.variantId} className="flex justify-between gap-2"><span className="truncate" dir="auto">{l.quantity} × {l.name}</span><Money cents={l.lineCents} currency={cart.currency} /></li>)}</ul>
            <div className="flex justify-between"><span className="text-steel-500">{t("Subtotal", "סכום ביניים")}</span><Money cents={cart.subtotalCents} currency={cart.currency} /></div>
            <CheckoutTotals subtotalCents={cart.subtotalCents === null ? null : cart.subtotalCents.toString()} taxBps={taxBps} currency={cart.currency} methods={methods} reviewAlways={s.orderRules.requireOrderConfirmation} disabled={issues.length > 0} />
          </div>
        </aside>
      </ActionForm>
    </div>
  );
}
