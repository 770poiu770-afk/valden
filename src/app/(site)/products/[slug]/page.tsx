import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedProducts } from "@/db/schema";
import { ProductArt } from "@/components/ProductArt";
import { BuyBox } from "@/components/client/BuyBox";
import { Badge, DL, Money, Notice } from "@/components/ui";
import { getProductDetail } from "@/server/catalog";
import { currentActor } from "@/server/http";
import { displayCurrency } from "@/lib/buyer-currency";
import { AVAILABILITY_LABEL, CONDITION_LABEL } from "@/lib/catalog-meta";
import { convertMinor } from "@/lib/money";
import { can } from "@/lib/auth";
import { getT } from "@/server/locale";
import { AVAILABILITY_HE, CONDITION_HE, categoryText } from "@/lib/labels";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const d = await getProductDetail((await params).slug, null);
  const { t } = await getT();
  return { title: d ? d.product.name : t("Product not found", "המוצר לא נמצא") };
}

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ currency?: string }> }) {
  const { slug } = await params;
  const { l, t } = await getT();
  const actor = await currentActor();
  const d = await getProductDetail(slug, actor);
  if (!d) notFound();
  const { product: p, category, variants, tiers } = d;
  const { currency, rate } = await displayCurrency(actor, (await searchParams).currency);
  const av = AVAILABILITY_LABEL[p.availability];
  const avLabel = l === "he" ? AVAILABILITY_HE[p.availability] : av.label;
  const cat = categoryText(category, l);
  const units = (n: number | string) => t(`${n} units`, `${n} יח׳`);
  const canOrder = can(actor, "orders.place") && actor?.companyStatus === "APPROVED";
  const saved = actor ? (await db.select().from(savedProducts).where(and(eq(savedProducts.userId, actor.userId), eq(savedProducts.productId, p.id))).limit(1)).length > 0 : false;
  const groups = [...new Set(p.specs.map((s) => s.group))];
  const conv = (c: number) => (rate ? convertMinor(BigInt(c), rate.rate) : null);

  return (
    <div className="container-page py-8">
      <nav aria-label={t("Breadcrumb", "נתיב ניווט")} className="mb-4 text-sm text-steel-500">
        <Link href="/catalog" className="hover:text-deep">{t("Catalog", "קטלוג")}</Link> / <Link href={`/catalog?category=${category.slug}`} className="hover:text-deep">{cat.name}</Link>
      </nav>
      {actor?.isStaff && <div className="mb-4"><Notice tone="info">{t("Staff view.", "תצוגת צוות.")} <Link className="link" href={`/admin/products/${p.id}`}>{t("Edit this product", "עריכת המוצר")}</Link>{!p.isActive && t(" — this listing is inactive and hidden from buyers.", " — המוצר אינו פעיל ומוסתר מהקונים.")}</Notice></div>}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <div className="overflow-hidden rounded-md border border-line bg-white">
            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="aspect-[4/3] w-full object-contain" /> : <ProductArt kind={p.imageKey} className="aspect-[4/3] w-full" label={t(`${p.name} illustration`, `איור של ${p.name}`)} />}
          </div>
          {!p.imageUrl && <p className="mt-2 text-xs text-steel-500">{t("Illustration only. Product photography is supplied with the commercial offer.", "איור להמחשה בלבד. תמונות מוצר יסופקו עם ההצעה המסחרית.")}</p>}
        </div>

        <div>
          <p className="flex gap-3 text-sm text-steel-500"><span className="font-semibold text-steel" dir="auto">{p.manufacturer}</span><span dir="auto">{p.subcategory}</span></p>
          <h1 className="wide mt-1 text-2xl leading-tight sm:text-[30px]" dir="auto">{p.name}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge tone={p.condition === "NEW" ? "ok" : p.condition === "REFURBISHED" ? "info" : "warn"}>{l === "he" ? CONDITION_HE[p.condition] : CONDITION_LABEL[p.condition]}</Badge>
            <Badge tone={av.tone === "ok" ? "ok" : av.tone === "warn" ? "warn" : av.tone === "info" ? "info" : "muted"}>{avLabel}</Badge>
            {p.isSample && <Badge tone="muted">{t("Sample listing data", "נתוני דוגמה")}</Badge>}
          </div>
          <p className="mt-4 max-w-[62ch] text-steel" dir="auto" lang="en">{p.summary}</p>

          <div className="mt-6 rounded-md border border-line bg-white p-5">
            {d.showPrices && rate ? (
              <>
                <BuyBox variants={variants.map((v) => ({ id: v.id, sku: v.sku, label: v.label }))} tiers={tiers} wholesaleCents={p.wholesaleCents!} contractCents={d.contractCents}
                  moq={p.moq} increment={p.orderIncrement} currency={currency} rate={rate.rate} orderable={d.orderable} canOrder={canOrder} saved={saved} slug={p.slug} />
                <table className="tbl num mt-5">
                  <thead><tr><th scope="col">{t("Quantity", "כמות")}</th><th scope="col" className="text-end">{t(`Unit price (${currency})`, `מחיר ליחידה (${currency})`)}</th></tr></thead>
                  <tbody>
                    {tiers.map((tier) => <tr key={tier.minQty}><td>{t(`${tier.minQty}+ units`, `${tier.minQty}+ יח׳`)}</td><td className="text-end font-semibold text-deep-900"><Money cents={conv(tier.unitCents)} currency={currency} /></td></tr>)}
                    {d.contractCents !== null && <tr><td>{t("Your contract price", "מחיר החוזה שלכם")}</td><td className="text-end font-semibold text-ok"><Money cents={conv(d.contractCents)} currency={currency} /></td></tr>}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-steel-500">
                  {t(`Indicative list prices${p.isSample ? " (sample data)" : ""}, excluding tax and freight. Totals are recalculated and confirmed at checkout.`, `מחירון משוער${p.isSample ? " (נתוני דוגמה)" : ""}, לא כולל מע״מ ומשלוח. הסכומים מחושבים מחדש ומאושרים בתשלום.`)}
                  {currency !== "USD" && rate.isSample && t(" Converted with a sample exchange rate.", " הומר לפי שער חליפין לדוגמה.")}
                  {" "}<Link className="link" href={`?currency=${currency === "USD" ? "EUR" : currency === "EUR" ? "ILS" : "USD"}`}>{t("Show in", "הצגה ב-")} {currency === "USD" ? "EUR" : currency === "EUR" ? "ILS" : "USD"}</Link>
                </p>
              </>
            ) : (
              <div className="space-y-3">
                <p className="font-semibold text-deep-900">{t("Wholesale pricing is available to approved trade accounts.", "מחירי סיטונאות זמינים לחשבונות עסקיים מאושרים.")}</p>
                <p className="text-sm text-steel-500">{t("Minimum order quantity for this listing:", "כמות הזמנה מינימלית למוצר זה:")} <span className="num font-semibold text-steel">{units(p.moq)}</span>.</p>
                {!actor ? (
                  <div className="flex flex-wrap gap-2"><Link href="/register" className="btn-primary">{t("Register your business", "רישום העסק")}</Link><Link href={`/login?next=/products/${p.slug}`} className="btn-outline">{t("Sign in", "כניסה")}</Link></div>
                ) : <p className="text-sm text-steel-500">{t("Your account is under review. We will email you as soon as pricing is unlocked.", "החשבון שלכם בבדיקה. נשלח לכם מייל ברגע שהמחירים ייפתחו.")}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="wide mb-4 text-xl">{t("Specifications", "מפרט טכני")}</h2>
          <div className="panel">
            {groups.map((g) => (
              <div key={g} className="grid gap-2 border-b border-line/70 px-5 py-4 last:border-0 sm:grid-cols-[10rem_1fr]">
                <h3 className="text-sm font-semibold text-deep-900" dir="auto">{g}</h3>
                <dl dir="auto" className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-1 text-sm">
                  {p.specs.filter((s) => s.group === g).map((s) => (<div key={s.label} className="contents"><dt className="text-steel-500">{s.label}</dt><dd>{s.value}</dd></div>))}
                </dl>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-steel-500">{t("Specifications are compiled for catalog setup and should be verified against the manufacturer's current datasheet.", "המפרטים נאספו לצורך הקמת הקטלוג ויש לאמת אותם מול דף הנתונים העדכני של היצרן.")}</p>
          <h2 className="wide mb-3 mt-10 text-xl">{t("Available SKUs", "מק״טים זמינים")}</h2>
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label={t("Scrollable table", "טבלה נגללת")}>
            <table className="tbl"><thead><tr><th scope="col">{t("SKU", "מק״ט")}</th><th scope="col">{t("Configuration", "תצורה")}</th><th scope="col">{t("Region", "אזור")}</th></tr></thead>
              <tbody>{variants.map((v) => <tr key={v.id}><td className="num font-medium">{v.sku}</td><td>{v.label}</td><td>{v.region ?? "—"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
        <aside className="space-y-6">
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold text-deep-900">{t("Ordering & logistics", "הזמנה ולוגיסטיקה")}</h2>
            <DL rows={[
              [t("Minimum order", "הזמנה מינימלית"), <span key="m" className="num">{units(p.moq)}</span>],
              [t("Order increment", "כפולות הזמנה"), p.orderIncrement > 1 ? units(p.orderIncrement) : t("Single units", "יחידות בודדות")],
              [t("Case / carton / pallet", "אריזה / קרטון / משטח"), p.casePack || p.cartonQty || p.palletQty ? `${p.casePack ?? "—"} / ${p.cartonQty ?? "—"} / ${p.palletQty ?? "—"}` : t("Confirmed with offer", "יאושר בהצעה")],
              [t("Availability", "זמינות"), p.availabilityVerified && p.availableQty !== null ? t(`${p.availableQty} units confirmed`, `${p.availableQty} יח׳ מאושרות`) : t("Indicative — confirmed at order review", "משוערת — מאושרת בבדיקת ההזמנה")],
              [t("Lead time", "זמן אספקה"), p.leadTime ? <span key="lt" dir="auto">{p.leadTime}</span> : t("Confirmed at order review", "יאושר בבדיקת ההזמנה")],
              [t("Country of origin", "ארץ ייצור"), p.origin ?? t("Per manufacturer labelling — confirmed with offer", "לפי סימון היצרן — יאושר בהצעה")],
            ]} />
          </section>
          <section className="panel panel-pad space-y-3 text-sm">
            <h2 className="font-semibold text-deep-900">{t("Compliance & warranty", "תאימות ואחריות")}</h2>
            {p.regionCompatibility && <p><span className="font-medium text-deep-900">{t("Region: ", "אזור: ")}</span><span dir="auto" lang="en">{p.regionCompatibility}</span></p>}
            {p.shippingRestrictions && <p><span className="font-medium text-deep-900">{t("Shipping: ", "משלוח: ")}</span><span dir="auto" lang="en">{p.shippingRestrictions}</span></p>}
            <p><span className="font-medium text-deep-900">{t("Warranty: ", "אחריות: ")}</span>{p.warrantyInfo ? <span dir="auto" lang="en">{p.warrantyInfo}</span> : t("Terms confirmed per order.", "התנאים מאושרים בכל הזמנה.")}{!p.warrantyVerified && t(" Not yet verified.", " טרם אומת.")}</p>
            <p className="text-xs text-steel-500">{t("Valden is an independent distributor. Listing a brand does not indicate an authorised-distributor relationship with its manufacturer.", "Valden היא מפיצה עצמאית. הצגת מותג אינה מעידה על מעמד של מפיץ מורשה מטעם היצרן.")}</p>
          </section>
          {actor?.isStaff && (
            <section className="panel panel-pad text-sm">
              <h2 className="mb-2 font-semibold text-deep-900">{t("Staff only", "לצוות בלבד")}</h2>
              <DL rows={[["Reference", p.referencePriceCents !== null ? <Money key="r" cents={p.referencePriceCents} currency="USD" /> : "—"], ["Source", p.referenceSource], ["Pricing", p.pricingNote], ["Supplier SKU", p.supplierSku], ["Internal notes", p.internalNotes]]} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
