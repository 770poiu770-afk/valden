import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ProductArt } from "@/components/ProductArt";
import { listCategoriesWithCounts, searchCatalog } from "@/server/catalog";
import { currentActor } from "@/server/http";
import { getSettings } from "@/lib/settings";
import { getRate } from "@/lib/fx";
import { convertMinor, formatMoney } from "@/lib/money";
import { DEPARTMENTS } from "@/lib/catalog-meta";
import { departmentText } from "@/lib/labels";
import { getT } from "@/server/locale";
import type { T } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const steps = (t: T) => [
  [t("Register your business", "רישום העסק"), t("Submit company details, registration and tax numbers, and a verification document.", "שולחים פרטי חברה, מספר רישום ומספר עוסק, ומסמך לאימות.")],
  [t("Verification by our trade desk", "אימות על ידי צוות המכירות"), t("We review every application. Approved accounts unlock wholesale pricing and ordering.", "אנחנו בודקים כל בקשה. בחשבונות שאושרו נפתחים מחירי סיטונאות והזמנות.")],
  [t("Order online or request a quote", "הזמנה באתר או בקשת הצעת מחיר"), t("Build a cart against tier pricing, or send a list for a negotiated offer.", "בונים סל לפי מדרגות מחיר, או שולחים רשימה לקבלת הצעה מותאמת.")],
  [t("Confirmation and payment", "אישור ותשלום"), t("We confirm availability and freight, then you pay by PayPal or bank transfer.", "אנחנו מאשרים זמינות ומשלוח, ואז משלמים ב-PayPal או בהעברה בנקאית.")],
  [t("Dispatch and tracking", "משלוח ומעקב"), t("Shipments, references and tracking are posted to your account as they happen.", "משלוחים, אסמכתאות ומספרי מעקב מתעדכנים בחשבון שלכם בזמן אמת.")],
];

export default async function Home() {
  const { l, t } = await getT();
  const STEPS = steps(t);
  const actor = await currentActor();
  const [cats, settings, manifest] = await Promise.all([
    listCategoriesWithCounts(),
    getSettings(),
    db.execute(sql`SELECT c.slug, c.name, count(p.id)::int AS n, min(p.moq)::int AS moq FROM categories c JOIN products p ON p.category_id = c.id AND p.is_active GROUP BY c.id ORDER BY c.sort_order`),
  ]);
  const rows = manifest.rows as { slug: string; name: string; n: number; moq: number }[];
  const total = rows.reduce((s, r) => s + r.n, 0);
  const deptRows = DEPARTMENTS.map((d) => {
    const rs = rows.filter((r) => (d.categories as readonly string[]).includes(r.slug));
    return { slug: d.slug, name: departmentText(d, l).name, n: rs.reduce((s, r) => s + r.n, 0), moq: rs.length ? Math.min(...rs.map((r) => r.moq)) : null };
  });
  const depts = DEPARTMENTS.map((d) => ({ ...d, name: departmentText(d, l).name, n: cats.filter((c) => (d.categories as readonly string[]).includes(c.slug)).reduce((s, c) => s + c.n, 0) }));
  const cur = "USD" as const;
  const rate = await getRate(cur);
  const [phones, gpus, ws] = await Promise.all([
    searchCatalog({ q: "17 pro max" }, actor),
    searchCatalog({ category: "graphics-cards", gpu: "5090", sort: "price_desc" }, actor),
    searchCatalog({ category: "workstations", sort: "newest" }, actor),
  ]);
  const minOrder = formatMoney(BigInt(settings.minimumOrderValue.amountMinor), settings.minimumOrderValue.currency).replace(/\.00$/, "");
  const target = formatMoney(BigInt(settings.targetOrderValue.amountMinor), settings.targetOrderValue.currency).replace(/\.00$/, "");

  return (
    <>
      {/* Hero */}
      <section className="bg-deep text-white">
        <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="flex flex-col justify-center">
            <h1 className="display text-[40px] text-white sm:text-[56px] lg:text-[64px]">{t("Electronics by the case and the pallet.", "אלקטרוניקה בקרטונים ובמשטחים.")}</h1>
            <p className="mt-6 max-w-[54ch] text-lg text-deep-100">
              {t("Valden supplies flagship smartphones, workstations, graphics cards, displays and network equipment to wholesalers, resellers, retail chains and IT procurement teams. Trade accounts only.", "Valden מספקת סמארטפונים מובילים, תחנות עבודה, כרטיסי מסך, מסכים וציוד תקשורת לסיטונאים, משווקים, רשתות קמעונאות וצוותי רכש IT. לחשבונות עסקיים בלבד.")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {!actor ? (<>
                <Link href="/register" className="btn-primary px-6 py-3 text-[15px]">{t("Register your business", "רישום העסק")}</Link>
                <Link href="/login" className="btn border border-white/40 px-6 py-3 text-[15px] text-white hover:bg-white/10">{t("Sign in", "כניסה")}</Link>
              </>) : (
                <Link href={actor.isStaff ? "/admin" : "/portal"} className="btn-primary px-6 py-3 text-[15px]">{t("Go to your account", "מעבר לחשבון")}</Link>
              )}
              <Link href="/catalog" className="btn px-4 py-3 text-[15px] text-deep-100 underline underline-offset-4 hover:text-white">{t("Browse the catalog", "לקטלוג המוצרים")}</Link>
            </div>
            <p className="mt-8 text-sm text-deep-200">{t(`Online orders from ${minOrder}. Larger programmes, from ${target} upwards, are handled by quotation.`, `הזמנות באתר החל מ-${minOrder}. פרויקטים גדולים, מ-${target} ומעלה, מטופלים בהצעת מחיר.`)}</p>
          </div>

          {/* Live catalog manifest — figures come straight from the catalog database */}
          <div className="rounded-md bg-white text-steel shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <div className="flex items-baseline justify-between border-b-2 border-deep px-5 py-3">
              <p className="wide text-[15px] text-deep">{t("Catalog manifest", "תמונת מצב הקטלוג")}</p>
              <p className="num text-xs text-steel-500">{new Date().toISOString().slice(0, 10)}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-start text-xs text-steel-500"><th scope="col" className="px-5 py-2 text-start font-medium">{t("Department", "מחלקה")}</th><th scope="col" className="px-2 py-2 text-end font-medium">{t("Listings", "מוצרים")}</th><th scope="col" className="px-5 py-2 text-end font-medium">{t("MOQ from", "מינימום החל מ-")}</th></tr></thead>
              <tbody>
                {deptRows.map((r) => (
                  <tr key={r.slug} className="border-t border-line/70">
                    <th scope="row" className="px-5 py-1.5 text-start font-normal"><Link href={`/catalog?dept=${r.slug}`} className="hover:underline">{r.name}</Link></th>
                    <td className="num px-2 py-1.5 text-end">{r.n}</td>
                    <td className="num px-5 py-1.5 text-end">{r.moq ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="border-t-2 border-deep font-semibold text-deep-900"><td className="px-5 py-2.5">{t("Total listings", "סה״כ מוצרים")}</td><td className="num px-2 py-2.5 text-end">{total}</td><td /></tr></tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page pt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="wide text-2xl">{t("Shop by department", "קנייה לפי מחלקה")}</h2>
          <Link href="/categories" className="link text-sm">{t("All categories", "כל הקטגוריות")}</Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {depts.map((d) => (
            <li key={d.slug}>
              <Link href={`/catalog?dept=${d.slug}`} className="group block h-full rounded-md border border-line bg-white p-2 hover:border-deep">
                <ProductArt kind={d.imageKey} className="aspect-[4/3] w-full rounded-sm" decorative />
                <span className="mt-2 block px-1 text-[14px] font-semibold leading-tight text-deep-900 group-hover:underline">{d.name}</span>
                <span className="num block px-1 pb-1 text-xs text-steel-500">{t(`${d.n} listings`, `${d.n} מוצרים`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* High-value collections — compact lists rather than repeated cards */}
      <section className="container-page pt-14">
        <h2 className="wide mb-5 text-2xl">{t("High-value lines", "קווי מוצרים מובילים")}</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: t("Flagship smartphones", "סמארטפונים מובילים"), art: "phone", href: "/catalog?q=17+pro+max", items: phones.items.slice(0, 4) },
            { title: t("GeForce RTX 5090 cards", "כרטיסי GeForce RTX 5090"), art: "gpu", href: "/catalog?category=graphics-cards&gpu=5090", items: gpus.items.slice(0, 4) },
            { title: t("Professional workstations", "תחנות עבודה מקצועיות"), art: "workstation", href: "/catalog?category=workstations", items: ws.items.slice(0, 4) },
          ].map((col) => (
            <div key={col.title} className="panel flex flex-col overflow-hidden">
              <div className="grid grid-cols-[6rem_1fr] items-center gap-4 border-b border-line p-4">
                <ProductArt kind={col.art} className="aspect-[4/3] w-full rounded-sm" decorative />
                <h3 className="wide text-lg">{col.title}</h3>
              </div>
              <ul className="flex-1 divide-y divide-line/70">
                {col.items.map((p) => (
                  <li key={p.slug} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                    <Link href={`/products/${p.slug}`} className="hover:underline" dir="auto">{p.name}</Link>
                    <span className="num shrink-0 text-xs text-steel-500">
                      {p.wholesaleCents !== null && rate ? formatMoney(convertMinor(BigInt(p.wholesaleCents), rate.rate), "USD") : t(`MOQ ${p.moq}`, `מינימום ${p.moq}`)}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={col.href} className="border-t border-line px-4 py-3 text-sm font-semibold text-deep-600 hover:bg-paper">{t("View the full range", "לכל המוצרים בקו")}</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Volume pricing */}
      <section className="container-page pt-16">
        <div className="grid gap-8 rounded-md border border-line bg-white p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="wide text-2xl">{t("Volume pricing, published per listing", "מחירי כמויות, מפורסמים לכל מוצר")}</h2>
            <p className="mt-3 max-w-[56ch] text-steel-500">
              {t("Every listing carries a minimum order quantity and quantity breaks priced in steps of that minimum. Approved accounts see the exact unit price for each break, can hold negotiated contract prices, and can ask for a formal offer on any list.", "לכל מוצר יש כמות הזמנה מינימלית ומדרגות כמות לפי כפולות של המינימום. חשבונות מאושרים רואים את מחיר היחידה המדויק בכל מדרגה, יכולים לקבל מחירי חוזה מוסכמים ולבקש הצעה רשמית לכל רשימה.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services" className="btn-outline">{t("How pricing works", "איך המחירים נקבעים")}</Link>
              <Link href="/quote" className="btn-deep">{t("Request a quote", "בקשת הצעת מחיר")}</Link>
            </div>
          </div>
          <div>
            <table className="tbl num">
              <thead><tr><th scope="col">{t("Order quantity", "כמות בהזמנה")}</th><th scope="col" className="text-end">{t("Discount from list", "הנחה ממחיר המחירון")}</th></tr></thead>
              <tbody>
                {settings.pricingPolicy.tierSchedule.map((tier) => (
                  <tr key={tier.moqMultiple}><td>{tier.moqMultiple === 1 ? t("Minimum order quantity", "כמות הזמנה מינימלית") : t(`${tier.moqMultiple}× minimum`, `פי ${tier.moqMultiple} מהמינימום`)}</td><td className="text-end font-semibold text-deep-900">{tier.discountBps === 0 ? t("List", "מחירון") : `−${(tier.discountBps / 100).toFixed(1)}%`}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-steel-500">{t("Standard schedule; individual listings and contract prices may differ.", "מדרגות סטנדרטיות; מחירי מוצרים מסוימים ומחירי חוזה עשויים להיות שונים.")}</p>
          </div>
        </div>
      </section>

      {/* How it works — a real sequence */}
      <section className="container-page pt-16">
        <h2 className="wide mb-6 text-2xl">{t("How trade purchasing works", "איך עובדת רכישה עסקית")}</h2>
        <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-5">
          {STEPS.map(([title, d], i) => (
            <li key={title} className="bg-white p-5">
              <span className="num mb-3 flex h-7 w-7 items-center justify-center rounded-sm bg-deep text-sm font-bold text-white">{i + 1}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-steel-500">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Quote band */}
      <section className="container-page pt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-md bg-deep-900 p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="wide text-2xl text-white">{t("Buying for a programme or a container load?", "קונים לפרויקט או למכולה שלמה?")}</h2>
            <p className="mt-2 max-w-[60ch] text-deep-100">{t("Send your SKU list with quantities and target prices. Our trade desk replies with a formal, time-limited offer you can accept online.", "שלחו רשימת מק\"טים עם כמויות ומחירי יעד. צוות המכירות ישיב בהצעה רשמית לזמן מוגבל, שאפשר לאשר באתר.")}</p>
          </div>
          <Link href="/quote" className="btn-primary shrink-0 px-6 py-3">{t("Request a wholesale quote", "בקשת הצעת מחיר סיטונאית")}</Link>
        </div>
      </section>
    </>
  );
}
