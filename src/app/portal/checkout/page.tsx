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

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function Checkout({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const actor = await requireApprovedBuyer();
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
  const reason = overCap ? `Not available: this order exceeds the store's PayPal limit of ${formatMoney(BigInt(s.payments.paypalMaxOrderBaseMinor), "USD")}.` : notConfigured ? "PayPal is not yet configured in this environment." : undefined;

  return (
    <div>
      <PageHeader title="Checkout" back={{ href: `/portal/cart?currency=${cart.currency}`, label: "Back to cart" }}
        intro="Submitting places your order for review. We confirm availability, freight and payment terms before any payment is taken." />
      {issues.length > 0 && <div className="mb-6"><Notice tone="bad" title="This order cannot be placed yet"><ul className="list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul><Link className="link" href="/portal/cart">Return to cart</Link></Notice></div>}
      <ActionForm action="/api/orders" className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]" submitLabel={undefined}>
        <CheckoutFields addrs={addrs} settings={s} currency={cart.currency} paypalBlocked={paypalBlocked} paypalReason={reason} />
        <aside className="space-y-4 self-start xl:sticky xl:top-6">
          <div className="panel panel-pad space-y-2 text-sm">
            <h2 className="mb-2 font-semibold">Order summary</h2>
            <ul className="mb-3 space-y-1 text-xs text-steel-500">{cart.lines.map((l) => <li key={l.variantId} className="flex justify-between gap-2"><span className="truncate">{l.quantity} × {l.name}</span><Money cents={l.lineCents} currency={cart.currency} /></li>)}</ul>
            <div className="flex justify-between"><span className="text-steel-500">Subtotal</span><Money cents={cart.subtotalCents} currency={cart.currency} /></div>
            <div className="flex justify-between"><span className="text-steel-500">Tax ({(taxBps / 100).toFixed(taxBps % 100 ? 2 : 0)}%, est.)</span><Money cents={tax} currency={cart.currency} /></div>
            <div className="flex justify-between"><span className="text-steel-500">Freight</span><span>Quoted after review</span></div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-deep-900"><span>Estimated total</span><Money cents={estTotal} currency={cart.currency} /></div>
            <p className="text-xs text-steel-500">Tax is based on the delivery country. Final totals are shown on your order confirmation.</p>
            <button type="submit" disabled={issues.length > 0} className="btn-primary mt-3 w-full">Place order for review</button>
          </div>
        </aside>
      </ActionForm>
    </div>
  );
}
