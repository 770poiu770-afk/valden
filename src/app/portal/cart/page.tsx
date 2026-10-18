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
import { getT } from "@/server/locale";
import { trMessage } from "@/lib/messages-he";

export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Cart", "סל") }; }

export default async function CartPage({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const actor = await requireApprovedBuyer();
  const { l: lang, t } = await getT();
  const tm = (m: string) => trMessage(m, lang) ?? m;
  const { currency } = await displayCurrency(actor, (await searchParams).currency);
  const cart = await viewCart(actor, currency);
  const issues = blockingIssues(cart);
  const cur = cart.currency;
  if (!cart.lines.length) return (<><PageHeader title={t("Cart", "סל")} /><Empty title={t("Your cart is empty", "הסל ריק")} action={<div className="flex gap-2"><Link href="/catalog" className="btn-deep">{t("Browse catalog", "לקטלוג")}</Link><Link href="/portal/bulk" className="btn-outline">{t("Paste a SKU list", "הדבקת רשימת מק״טים")}</Link></div>}>{t("Your cart is saved to your account, so you can build an order across several sessions.", "הסל נשמר בחשבון, כך שאפשר לבנות הזמנה לאורך כמה כניסות.")}</Empty></>);
  const pct = cart.minimum ? Math.min(100, Number(((cart.minimum.amountMinor - cart.minimum.shortfallMinor) * 100n) / (cart.minimum.amountMinor || 1n))) : 100;

  return (
    <div>
      <PageHeader title={t("Cart", "סל")} intro={t("Saved to your account. Prices are recalculated on every change and again at checkout.", "נשמר בחשבון. המחירים מחושבים מחדש בכל שינוי ושוב בתשלום.")} actions={<CurrencySwitch value={cur} />} />
      <div className="grid gap-6 2xl:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
        <ul className="space-y-3 md:hidden">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="panel p-4">
              <Link href={`/products/${l.productSlug}`} className="font-medium text-deep-900 hover:underline" dir="auto">{l.name}</Link>
              <p className="text-xs text-steel-500"><span dir="auto">{l.variantLabel}</span> · <span className="num whitespace-nowrap">{l.sku}</span></p>
              {l.issues.map((i) => <p key={i} className="mt-1 text-xs font-medium text-bad">{tm(i)}</p>)}
              <div className="mt-3 flex items-end justify-between gap-3">
                <div className="text-sm"><p className="text-xs text-steel-500">{t("Unit", "ליחידה")} <Money cents={l.unitCents} currency={cur} /></p><p className="font-semibold text-deep-900"><Money cents={l.lineCents} currency={cur} /></p></div>
                <QtyEditor variantId={l.variantId} quantity={l.quantity} moq={l.moq} increment={l.orderIncrement} />
              </div>
            </li>
          ))}
        </ul>
        <div className="panel hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
          <table className="tbl min-w-[640px]">
            <thead><tr><th scope="col">{t("Product", "מוצר")}</th><th scope="col" className="text-end">{t("Unit", "ליחידה")}</th><th scope="col" className="text-end">{t("Quantity", "כמות")}</th><th scope="col" className="text-end">{t("Line total", "סה״כ שורה")}</th></tr></thead>
            <tbody>
              {cart.lines.map((l) => (
                <tr key={l.variantId}>
                  <td>
                    <div className="flex gap-3">
                      <ProductArt kind={l.imageKey} className="h-12 w-16 shrink-0 rounded-sm" decorative />
                      <div>
                        <Link href={`/products/${l.productSlug}`} className="font-medium text-deep-900 hover:underline" dir="auto">{l.name}</Link>
                        <p className="text-xs text-steel-500"><span dir="auto">{l.variantLabel}</span> · <span className="num whitespace-nowrap">{l.sku}</span></p>
                        {l.source === "CONTRACT" && <p className="text-xs font-medium text-ok">{t("Contract price applied", "הוחל מחיר חוזה")}</p>}
                        {l.nextTier && cart.rate && <p className="text-xs text-steel-500">{t(`Order ${l.nextTier.minQty}+ for ${formatMoney(convertMinor(BigInt(l.nextTier.unitBaseCents), cart.rate.rate), cur)} per unit`, `בהזמנה של ${l.nextTier.minQty}+ יח׳: ${formatMoney(convertMinor(BigInt(l.nextTier.unitBaseCents), cart.rate.rate), cur)} ליחידה`)}</p>}
                        {l.issues.map((i) => <p key={i} className="text-xs font-medium text-bad">{tm(i)}</p>)}
                      </div>
                    </div>
                  </td>
                  <td className="text-end"><Money cents={l.unitCents} currency={cur} /></td>
                  <td className="text-end"><QtyEditor variantId={l.variantId} quantity={l.quantity} moq={l.moq} increment={l.orderIncrement} /></td>
                  <td className="text-end font-semibold text-deep-900"><Money cents={l.lineCents} currency={cur} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
        <aside className="grid items-start gap-4 md:grid-cols-2 2xl:block 2xl:space-y-4">
          <div className="panel panel-pad space-y-3">
            <div className="flex justify-between text-sm"><span className="text-steel-500">{t(`Subtotal (${cart.lines.length} lines)`, `סכום ביניים (${cart.lines.length} שורות)`)}</span><Money cents={cart.subtotalCents} currency={cur} className="font-semibold" /></div>
            <p className="text-xs text-steel-500">{t("Tax and freight are calculated at checkout and confirmed by our trade desk.", "מע״מ ומשלוח מחושבים בתשלום ומאושרים על ידי צוות המכירות.")}</p>
            {cart.minimum && (
              <div>
                <div className="flex justify-between text-xs"><span>{t("Minimum order value", "סכום הזמנה מינימלי")}</span><Money cents={cart.minimum.amountMinor} currency={cart.minimum.currency} /></div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={t("Progress to minimum order value", "התקדמות לסכום ההזמנה המינימלי")}><div className={`h-full ${cart.minimum.met ? "bg-ok" : "bg-tag"}`} style={{ width: `${pct}%` }} /></div>
                {!cart.minimum.met && <p className="mt-1 text-xs text-warn">{t("Add", "הוסיפו עוד")} <Money cents={cart.minimum.shortfallMinor} currency={cart.minimum.currency} /> {t("more to check out.", "כדי לעבור לתשלום.")}</p>}
              </div>
            )}
            {cart.target.reached && <p className="text-xs font-medium text-ok">{t("This order is in our programme range — consider requesting a quote for negotiated pricing.", "ההזמנה בהיקף של פרויקט — כדאי לבקש הצעת מחיר למחיר מותאם.")}</p>}
            {issues.length ? <Notice tone="warn">{t("Resolve the highlighted lines to continue.", "תקנו את השורות המסומנות כדי להמשיך.")}</Notice> : null}
            <Link href={`/portal/checkout?currency=${cur}`} aria-disabled={issues.length > 0} className={`btn-primary w-full ${issues.length ? "pointer-events-none opacity-50" : ""}`}>{t("Continue to checkout", "המשך לתשלום")}</Link>
            <Link href={`/portal/quotes/new?fromCart=1&currency=${cur}`} className="btn-outline w-full">{t("Request a quote for this cart", "בקשת הצעת מחיר לסל")}</Link>
            <ActionButton action="/api/cart" method="DELETE" label={t("Empty cart", "ריקון הסל")} className="btn-ghost btn-sm w-full" confirm={t("Remove all lines from your cart?", "להסיר את כל השורות מהסל?")} />
          </div>
          {cart.rate?.isSample && cur !== "USD" && <Notice tone="warn">{t("Converted with a sample exchange rate (development data).", "הומר לפי שער חליפין לדוגמה (נתוני פיתוח).")}</Notice>}
        </aside>
      </div>
    </div>
  );
}
