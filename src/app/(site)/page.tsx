import Link from "next/link";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ProductArt } from "@/components/ProductArt";
import { listCategoriesWithCounts, searchCatalog } from "@/server/catalog";
import { currentActor } from "@/server/http";
import { getSettings } from "@/lib/settings";
import { getRate } from "@/lib/fx";
import { convertMinor, formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Register your business", "Submit company details, registration and tax numbers, and a verification document."],
  ["Verification by our trade desk", "We review every application. Approved accounts unlock wholesale pricing and ordering."],
  ["Order online or request a quote", "Build a cart against tier pricing, or send a list for a negotiated offer."],
  ["Confirmation and payment", "We confirm availability and freight, then you pay by PayPal or bank transfer."],
  ["Dispatch and tracking", "Shipments, references and tracking are posted to your account as they happen."],
];

export default async function Home() {
  const actor = await currentActor();
  const [cats, settings, manifest] = await Promise.all([
    listCategoriesWithCounts(),
    getSettings(),
    db.execute(sql`SELECT c.slug, c.name, count(p.id)::int AS n, min(p.moq)::int AS moq FROM categories c JOIN products p ON p.category_id = c.id AND p.is_active GROUP BY c.id ORDER BY c.sort_order`),
  ]);
  const rows = manifest.rows as { slug: string; name: string; n: number; moq: number }[];
  const total = rows.reduce((s, r) => s + r.n, 0);
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
            <h1 className="display text-[40px] text-white sm:text-[56px] lg:text-[64px]">Electronics by the case and the pallet.</h1>
            <p className="mt-6 max-w-[54ch] text-lg text-deep-100">
              Valden supplies flagship smartphones, workstations, graphics cards, displays and network equipment to wholesalers, resellers, retail chains and IT procurement teams. Trade accounts only.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {!actor ? (<>
                <Link href="/register" className="btn-primary px-6 py-3 text-[15px]">Register your business</Link>
                <Link href="/login" className="btn border border-white/40 px-6 py-3 text-[15px] text-white hover:bg-white/10">Sign in</Link>
              </>) : (
                <Link href={actor.isStaff ? "/admin" : "/portal"} className="btn-primary px-6 py-3 text-[15px]">Go to your account</Link>
              )}
              <Link href="/catalog" className="btn px-4 py-3 text-[15px] text-deep-100 underline underline-offset-4 hover:text-white">Browse the catalog</Link>
            </div>
            <p className="mt-8 text-sm text-deep-200">Online orders from {minOrder}. Larger programmes, from {target} upwards, are handled by quotation.</p>
          </div>

          {/* Live catalog manifest — figures come straight from the catalog database */}
          <div className="rounded-md bg-white text-steel shadow-[0_1px_0_rgba(0,0,0,0.04)]">
            <div className="flex items-baseline justify-between border-b-2 border-deep px-5 py-3">
              <p className="wide text-[15px] text-deep">Catalog manifest</p>
              <p className="num text-xs text-steel-500">{new Date().toISOString().slice(0, 10)}</p>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-steel-500"><th className="px-5 py-2 font-medium">Line</th><th className="px-2 py-2 text-right font-medium">Listings</th><th className="px-5 py-2 text-right font-medium">MOQ from</th></tr></thead>
              <tbody>
                {rows.slice(0, 9).map((r) => (
                  <tr key={r.slug} className="border-t border-line/70">
                    <td className="px-5 py-1.5"><Link href={`/catalog?category=${r.slug}`} className="hover:underline">{r.name}</Link></td>
                    <td className="num px-2 py-1.5 text-right">{r.n}</td>
                    <td className="num px-5 py-1.5 text-right">{r.moq}</td>
                  </tr>
                ))}
                <tr className="border-t border-line/70 text-steel-500"><td className="px-5 py-1.5" colSpan={3}>+ {rows.length - 9} further lines</td></tr>
              </tbody>
              <tfoot><tr className="border-t-2 border-deep font-semibold text-deep-900"><td className="px-5 py-2.5">Total listings</td><td className="num px-2 py-2.5 text-right">{total}</td><td /></tr></tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page pt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="wide text-2xl">Product lines</h2>
          <Link href="/categories" className="link text-sm">All categories</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {cats.map((c) => (
            <Link key={c.slug} href={`/catalog?category=${c.slug}`} className="group rounded-md border border-line bg-white p-2 hover:border-deep">
              <ProductArt kind={c.imageKey} className="aspect-[4/3] w-full rounded-sm" label={c.name} />
              <p className="mt-2 px-1 text-[13px] font-semibold leading-tight text-deep-900">{c.name}</p>
              <p className="num px-1 pb-1 text-xs text-steel-500">{c.n} listings</p>
            </Link>
          ))}
        </div>
      </section>

      {/* High-value collections — compact lists rather than repeated cards */}
      <section className="container-page pt-14">
        <h2 className="wide mb-5 text-2xl">High-value lines</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Flagship smartphones", art: "phone", href: "/catalog?q=17+pro+max", items: phones.items.slice(0, 4) },
            { title: "GeForce RTX 5090 cards", art: "gpu", href: "/catalog?category=graphics-cards&gpu=5090", items: gpus.items.slice(0, 4) },
            { title: "Professional workstations", art: "workstation", href: "/catalog?category=workstations", items: ws.items.slice(0, 4) },
          ].map((col) => (
            <div key={col.title} className="panel flex flex-col overflow-hidden">
              <div className="grid grid-cols-[6rem_1fr] items-center gap-4 border-b border-line p-4">
                <ProductArt kind={col.art} className="aspect-[4/3] w-full rounded-sm" label={col.title} />
                <h3 className="wide text-lg">{col.title}</h3>
              </div>
              <ul className="flex-1 divide-y divide-line/70">
                {col.items.map((p) => (
                  <li key={p.slug} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                    <Link href={`/products/${p.slug}`} className="hover:underline">{p.name}</Link>
                    <span className="num shrink-0 text-xs text-steel-500">
                      {p.wholesaleCents !== null && rate ? formatMoney(convertMinor(BigInt(p.wholesaleCents), rate.rate), "USD") : `MOQ ${p.moq}`}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href={col.href} className="border-t border-line px-4 py-3 text-sm font-semibold text-deep-600 hover:bg-paper">View the full range</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Volume pricing */}
      <section className="container-page pt-16">
        <div className="grid gap-8 rounded-md border border-line bg-white p-6 sm:p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="wide text-2xl">Volume pricing, published per listing</h2>
            <p className="mt-3 max-w-[56ch] text-steel-500">
              Every listing carries a minimum order quantity and quantity breaks priced in steps of that minimum. Approved accounts see the exact unit price for each break, can hold negotiated contract prices, and can ask for a formal offer on any list.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services" className="btn-outline">How pricing works</Link>
              <Link href="/quote" className="btn-deep">Request a quote</Link>
            </div>
          </div>
          <div>
            <table className="tbl num">
              <thead><tr><th>Order quantity</th><th className="text-right">Discount from list</th></tr></thead>
              <tbody>
                {settings.pricingPolicy.tierSchedule.map((t) => (
                  <tr key={t.moqMultiple}><td>{t.moqMultiple === 1 ? "Minimum order quantity" : `${t.moqMultiple}× minimum`}</td><td className="text-right font-semibold text-deep-900">{t.discountBps === 0 ? "List" : `−${(t.discountBps / 100).toFixed(1)}%`}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-steel-500">Standard schedule; individual listings and contract prices may differ.</p>
          </div>
        </div>
      </section>

      {/* How it works — a real sequence */}
      <section className="container-page pt-16">
        <h2 className="wide mb-6 text-2xl">How trade purchasing works</h2>
        <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-5">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="bg-white p-5">
              <span className="num mb-3 flex h-7 w-7 items-center justify-center rounded-sm bg-deep text-sm font-bold text-white">{i + 1}</span>
              <h3 className="font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-steel-500">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Quote band */}
      <section className="container-page pt-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-md bg-deep-900 p-8 text-white sm:p-10 lg:flex-row lg:items-center">
          <div>
            <h2 className="wide text-2xl text-white">Buying for a programme or a container load?</h2>
            <p className="mt-2 max-w-[60ch] text-deep-100">Send your SKU list with quantities and target prices. Our trade desk replies with a formal, time-limited offer you can accept online.</p>
          </div>
          <Link href="/quote" className="btn-primary shrink-0 px-6 py-3">Request a wholesale quote</Link>
        </div>
      </section>
    </>
  );
}
