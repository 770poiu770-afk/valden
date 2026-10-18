import Link from "next/link";
import { requireApprovedBuyer } from "@/server/guards";
import { viewCart } from "@/server/cart";
import { blockingIssues } from "@/server/pricing-engine";
import { displayCurrency } from "@/lib/buyer-currency";
import { Empty, Money, Notice, PageHeader } from "@/components/ui";
import { ProductArt } from "@/components/ProductArt";
import { CurrencySwitch, QtyEditor } from "@/components/client/CartEditor";
import { ActionButton } from "@/components/ActionForm";
import { convertMinor, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cart" };

export default async function CartPage({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { currency } = await displayCurrency(actor, (await searchParams).currency);
  const cart = await viewCart(actor, currency);
  const issues = blockingIssues(cart);
  const cur = cart.currency;
  if (!cart.lines.length) return (<><PageHeader title="Cart" /><Empty title="Your cart is empty" action={<div className="flex gap-2"><Link href="/catalog" className="btn-deep">Browse catalog</Link><Link href="/portal/bulk" className="btn-outline">Paste a SKU list</Link></div>}>Your cart is saved to your account, so you can build an order across several sessions.</Empty></>);
  const pct = cart.minimum ? Math.min(100, Number(((cart.minimum.amountMinor - cart.minimum.shortfallMinor) * 100n) / (cart.minimum.amountMinor || 1n))) : 100;

  return (
    <div>
      <PageHeader title="Cart" intro="Saved to your account. Prices are recalculated on every change and again at checkout." actions={<CurrencySwitch value={cur} />} />
      <div className="grid gap-6 2xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
        <ul className="space-y-3 md:hidden">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="panel p-4">
              <Link href={`/products/${l.productSlug}`} className="font-medium text-deep-900 hover:underline">{l.name}</Link>
              <p className="text-xs text-steel-500">{l.variantLabel} · <span className="num">{l.sku}</span></p>
              {l.issues.map((i) => <p key={i} className="mt-1 text-xs font-medium text-bad">{i}</p>)}
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-sm"><p className="text-xs text-steel-500">Unit <Money cents={l.unitCents} currency={cur} /></p><p className="font-semibold text-deep-900"><Money cents={l.lineCents} currency={cur} /></p></div>
                <QtyEditor variantId={l.variantId} quantity={l.quantity} moq={l.moq} increment={l.orderIncrement} />
              </div>
            </li>
          ))}
        </ul>
        <div className="panel hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="tbl min-w-[640px]">
            <thead><tr><th>Product</th><th className="text-right">Unit</th><th className="text-right">Quantity</th><th className="text-right">Line total</th></tr></thead>
            <tbody>
              {cart.lines.map((l) => (
                <tr key={l.variantId}>
                  <td>
                    <div className="flex gap-3">
                      <ProductArt kind={l.imageKey} className="h-12 w-16 shrink-0 rounded-sm" />
                      <div>
                        <Link href={`/products/${l.productSlug}`} className="font-medium text-deep-900 hover:underline">{l.name}</Link>
                        <p className="text-xs text-steel-500">{l.variantLabel} · <span className="num">{l.sku}</span></p>
                        {l.source === "CONTRACT" && <p className="text-xs font-medium text-ok">Contract price applied</p>}
                        {l.nextTier && cart.rate && <p className="text-xs text-steel-500">Order {l.nextTier.minQty}+ for {formatMoney(convertMinor(BigInt(l.nextTier.unitBaseCents), cart.rate.rate), cur)} per unit</p>}
                        {l.issues.map((i) => <p key={i} className="text-xs font-medium text-bad">{i}</p>)}
                      </div>
                    </div>
                  </td>
                  <td className="text-right"><Money cents={l.unitCents} currency={cur} /></td>
                  <td className="text-right"><QtyEditor variantId={l.variantId} quantity={l.quantity} moq={l.moq} increment={l.orderIncrement} /></td>
                  <td className="text-right font-semibold text-deep-900"><Money cents={l.lineCents} currency={cur} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
        <aside className="grid items-start gap-4 md:grid-cols-2 2xl:block 2xl:space-y-4">
          <div className="panel panel-pad space-y-3">
            <div className="flex justify-between text-sm"><span className="text-steel-500">Subtotal ({cart.lines.length} lines)</span><Money cents={cart.subtotalCents} currency={cur} className="font-semibold" /></div>
            <p className="text-xs text-steel-500">Tax and freight are calculated at checkout and confirmed by our trade desk.</p>
            {cart.minimum && (
              <div>
                <div className="flex justify-between text-xs"><span>Minimum order value</span><Money cents={cart.minimum.amountMinor} currency={cart.minimum.currency} /></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to minimum order value"><div className={`h-full ${cart.minimum.met ? "bg-ok" : "bg-tag"}`} style={{ width: `${pct}%` }} /></div>
                {!cart.minimum.met && <p className="mt-1 text-xs text-warn">Add <Money cents={cart.minimum.shortfallMinor} currency={cart.minimum.currency} /> more to check out.</p>}
              </div>
            )}
            {cart.target.reached && <p className="text-xs font-medium text-ok">This order is in our programme range — consider requesting a quote for negotiated pricing.</p>}
            {issues.length ? <Notice tone="warn">Resolve the highlighted lines to continue.</Notice> : null}
            <Link href={`/portal/checkout?currency=${cur}`} aria-disabled={issues.length > 0} className={`btn-primary w-full ${issues.length ? "pointer-events-none opacity-50" : ""}`}>Continue to checkout</Link>
            <Link href={`/portal/quotes/new?fromCart=1&currency=${cur}`} className="btn-outline w-full">Request a quote for this cart</Link>
            <ActionButton action="/api/cart" method="DELETE" label="Empty cart" className="btn-ghost btn-sm w-full" confirm="Remove all lines from your cart?" />
          </div>
          {cart.rate?.isSample && cur !== "USD" && <Notice tone="warn">Converted with a sample exchange rate (development data).</Notice>}
        </aside>
      </div>
    </div>
  );
}
