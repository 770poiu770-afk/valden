import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { CompareToggle } from "@/components/client/CompareToggle";
import { FilterPanel } from "@/components/client/FilterPanel";
import { Empty, Notice } from "@/components/ui";
import { searchCatalog, type CatalogQuery } from "@/server/catalog";
import { currentActor } from "@/server/http";
import { displayCurrency } from "@/lib/buyer-currency";
import { AVAILABILITY_LABEL, CATEGORIES, DEPARTMENTS, departmentOf } from "@/lib/catalog-meta";

export const metadata: Metadata = { title: "Wholesale catalog" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const actor = await currentActor();
  const q: CatalogQuery = {
    q: one(sp.q), dept: one(sp.dept), category: one(sp.category), condition: one(sp.condition), availability: one(sp.availability),
    manufacturer: ([] as string[]).concat(sp.manufacturer ?? []), minPrice: one(sp.minPrice), maxPrice: one(sp.maxPrice),
    currency: one(sp.currency), maxMoq: one(sp.maxMoq), storage: one(sp.storage), ram: one(sp.ram), cpu: one(sp.cpu), gpu: one(sp.gpu),
    refresh: one(sp.refresh), sort: one(sp.sort), page: one(sp.page),
  };
  const { currency, rate } = await displayCurrency(actor, q.currency);
  const res = await searchCatalog({ ...q, currency }, actor);
  const dept = res.department ?? (res.category ? departmentOf(res.category.slug) : undefined);
  const title = res.category?.name ?? res.department?.name ?? (q.q ? `Results for “${q.q}”` : "Wholesale catalog");

  const pageHref = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of ([] as string[]).concat(v ?? [])) if (k !== "page" && x) u.append(k, x);
    u.set("page", String(page));
    return `/catalog?${u.toString()}`;
  };
  const gb = (n: number) => (n >= 1024 ? `${n / 1024}TB` : `${n}GB`);

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-1 text-sm text-steel-500"><Link href="/catalog" className="hover:text-deep">Catalog</Link>{dept && <> / {res.category ? <Link href={`/catalog?dept=${dept.slug}`} className="hover:text-deep">{dept.name}</Link> : <span aria-current="page">{dept.name}</span>}</>}{res.category && <> / <span aria-current="page">{res.category.name}</span></>}</nav>
          <h1 className="wide text-2xl sm:text-3xl">{title}</h1>
          {(res.category ?? res.department) && <p className="mt-1 max-w-[70ch] text-steel-500">{(res.category ?? res.department)!.description}</p>}
        </div>
        <p className="num text-sm text-steel-500">{res.total} listings</p>
      </div>

      <nav aria-label="Departments" className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2">
          <li><Link href="/catalog" aria-current={!dept ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${!dept ? "border-deep bg-deep text-white" : "border-line bg-white text-steel-600 hover:border-deep hover:text-deep"}`}>All</Link></li>
          {DEPARTMENTS.map((d) => {
            const on = dept?.slug === d.slug;
            return <li key={d.slug}><Link href={`/catalog?dept=${d.slug}`} aria-current={on ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${on ? "border-deep bg-deep text-white" : "border-line bg-white text-steel-600 hover:border-deep hover:text-deep"}`}>{d.name}</Link></li>;
          })}
        </ul>
      </nav>

      {!res.showPrices && (
        <div className="mb-6"><Notice title="Wholesale prices are shown to approved trade accounts">
          {actor ? "Your account is awaiting verification. Prices and ordering unlock as soon as it is approved." : <> <Link className="link" href="/register">Register your business</Link> or <Link className="link" href="/login">sign in</Link> to see unit prices, quantity breaks and contract pricing.</>}
        </Notice></div>
      )}

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        {/* Filters: a plain GET form, works without JavaScript */}
        <FilterPanel activeCount={[q.q, q.category, q.condition, q.availability, q.maxMoq, q.storage, q.ram, q.cpu, q.gpu, q.refresh, q.minPrice, q.maxPrice].filter(Boolean).length + (q.manufacturer?.length ?? 0)}>
        <form method="get" action="/catalog" className="space-y-5 rounded-md border border-line bg-white p-4 text-sm" aria-label="Filter products">
          <div>
            <label htmlFor="q" className="field-label">Search</label>
            <input id="q" name="q" defaultValue={q.q} placeholder="Model, SKU, manufacturer" className="input" />
          </div>
          <div>
            <label htmlFor="dept" className="field-label">Department</label>
            <select id="dept" name="dept" defaultValue={dept?.slug ?? ""} className="input">
              <option value="">All departments</option>
              {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="category" className="field-label">Category</label>
            <select id="category" name="category" defaultValue={q.category ?? ""} className="input">
              <option value="">All categories{dept ? ` in ${dept.name}` : ""}</option>
              {DEPARTMENTS.filter((d) => !dept || d.slug === dept.slug).map((d) => (
                <optgroup key={d.slug} label={d.name}>
                  {CATEGORIES.filter((c) => (d.categories as readonly string[]).includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="field-label">Manufacturer</legend>
            <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {res.facets.manufacturers.map((m) => (
                <label key={m} className="flex items-center gap-2"><input type="checkbox" name="manufacturer" value={m} defaultChecked={q.manufacturer?.includes(m)} className="accent-deep" />{m}</label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="condition" className="field-label">Condition</label>
              <select id="condition" name="condition" defaultValue={q.condition ?? ""} className="input">
                <option value="">Any</option><option value="NEW">New</option><option value="REFURBISHED">Refurbished</option><option value="USED">Used</option>
              </select>
            </div>
            <div>
              <label htmlFor="maxMoq" className="field-label">MOQ up to</label>
              <input id="maxMoq" name="maxMoq" inputMode="numeric" pattern="\d*" defaultValue={q.maxMoq} className="input" />
            </div>
          </div>
          <div>
            <label htmlFor="availability" className="field-label">Availability</label>
            <select id="availability" name="availability" defaultValue={q.availability ?? ""} className="input">
              <option value="">Any</option>
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {res.facets.storage.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="storage" className="field-label">Storage</label>
                <select id="storage" name="storage" defaultValue={q.storage ?? ""} className="input"><option value="">Any</option>{res.facets.storage.map((s) => <option key={s} value={s}>{gb(s)}</option>)}</select>
              </div>
              {res.facets.ram.length > 0 && (
                <div>
                  <label htmlFor="ram" className="field-label">Memory</label>
                  <select id="ram" name="ram" defaultValue={q.ram ?? ""} className="input"><option value="">Any</option>{res.facets.ram.map((s) => <option key={s} value={s}>{s}GB</option>)}</select>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label htmlFor="cpu" className="field-label">CPU contains</label><input id="cpu" name="cpu" defaultValue={q.cpu} placeholder="9950X3D" className="input" /></div>
            <div><label htmlFor="gpu" className="field-label">GPU contains</label><input id="gpu" name="gpu" defaultValue={q.gpu} placeholder="5090" className="input" /></div>
          </div>
          {res.facets.refresh.length > 0 && (
            <div>
              <label htmlFor="refresh" className="field-label">Refresh rate</label>
              <select id="refresh" name="refresh" defaultValue={q.refresh ?? ""} className="input"><option value="">Any</option>{res.facets.refresh.map((s) => <option key={s} value={s}>{s}Hz</option>)}</select>
            </div>
          )}
          {res.showPrices && (
            <fieldset>
              <legend className="field-label">Unit price ({currency})</legend>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="Minimum price" name="minPrice" inputMode="decimal" defaultValue={q.minPrice} placeholder="Min" className="input" />
                <input aria-label="Maximum price" name="maxPrice" inputMode="decimal" defaultValue={q.maxPrice} placeholder="Max" className="input" />
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sort" className="field-label">Sort</label>
              <select id="sort" name="sort" defaultValue={res.sort} className="input">
                <option value="featured">Featured</option><option value="newest">Newest</option><option value="name">Name</option><option value="moq">Lowest MOQ</option>
                {res.showPrices && <><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></>}
                <option value="storage_desc">Most storage</option><option value="ram_desc">Most memory</option>
              </select>
            </div>
            {res.showPrices && (
              <div>
                <label htmlFor="currency" className="field-label">Currency</label>
                <select id="currency" name="currency" defaultValue={currency} className="input"><option>USD</option><option>EUR</option><option>ILS</option></select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-deep flex-1">Apply filters</button>
            <Link href="/catalog" className="btn-outline">Reset</Link>
          </div>
        </form>
        </FilterPanel>

        <div>
          {rate?.isSample && res.showPrices && currency !== "USD" && (
            <div className="mb-4"><Notice tone="warn">Prices in {currency} use a sample exchange rate configured for development ({rate.source}). Base prices are set in USD.</Notice></div>
          )}
          {res.items.length === 0 ? (
            <Empty title="No listings match these filters" action={<Link href="/catalog" className="btn-outline">Clear all filters</Link>}>
              Try removing a filter, or send us the model you need through a <Link href="/quote" className="link">quote request</Link> — we source on request.
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {res.items.map((p) => <ProductCard key={p.id} p={p} currency={currency} rate={rate?.rate} compareSlot={actor ? <CompareToggle slug={p.slug} /> : null} />)}
            </div>
          )}
          {res.pages > 1 && (
            <nav className="mt-8 flex items-center justify-between text-sm" aria-label="Pagination">
              {res.page > 1 ? <Link className="btn-outline btn-sm" href={pageHref(res.page - 1)}>Previous</Link> : <span />}
              <span className="num text-steel-500">Page {res.page} of {res.pages}</span>
              {res.page < res.pages ? <Link className="btn-outline btn-sm" href={pageHref(res.page + 1)}>Next</Link> : <span />}
            </nav>
          )}
          <p className="mt-8 text-xs text-steel-500">Catalog data in this environment is sample data: specifications are compiled for setup and must be verified against manufacturer documentation; availability is indicative and confirmed per order.</p>
        </div>
      </div>
    </div>
  );
}
