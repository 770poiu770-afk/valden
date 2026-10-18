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
import { AVAILABILITY_HE, categoryText, departmentText } from "@/lib/labels";
import { getT } from "@/server/locale";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("Catalog", "קטלוג") };
}
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CatalogPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const { l, t } = await getT();
  const actor = await currentActor();
  const q: CatalogQuery = {
    q: one(sp.q), dept: one(sp.dept), category: one(sp.category), condition: one(sp.condition), availability: one(sp.availability),
    manufacturer: ([] as string[]).concat(sp.manufacturer ?? []), minPrice: one(sp.minPrice), maxPrice: one(sp.maxPrice),
    currency: one(sp.currency), maxMoq: one(sp.maxMoq), storage: one(sp.storage), ram: one(sp.ram), cpu: one(sp.cpu), gpu: one(sp.gpu),
    refresh: one(sp.refresh), sort: one(sp.sort), page: one(sp.page),
  };
  const { currency, rate } = await displayCurrency(actor, q.currency);
  const [res, settings] = await Promise.all([searchCatalog({ ...q, currency }, actor), getSettings()]);
  const enforceMoq = settings.orderRules.enforceMoq;
  const dept = res.department ?? (res.category ? departmentOf(res.category.slug) : undefined);
  const deptT = dept ? departmentText(dept, l) : undefined;
  const catT = res.category ? categoryText(res.category, l) : undefined;
  const title = catT?.name ?? (res.department ? deptT?.name : undefined) ?? (q.q ? t(`Results for “${q.q}”`, `תוצאות עבור „${q.q}”`) : t("Catalog", "קטלוג"));
  const description = catT?.description ?? (res.department ? deptT?.description : undefined);

  const pageHref = (page: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) for (const x of ([] as string[]).concat(v ?? [])) if (k !== "page" && x) u.append(k, x);
    u.set("page", String(page));
    return `/catalog?${u.toString()}`;
  };
  const gb = (n: number) => (n >= 1024 ? `${n / 1024}TB` : `${n}GB`);
  const any = t("Any", "הכל");

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <nav aria-label={t("Breadcrumb", "נתיב ניווט")} className="mb-1 text-sm text-steel-500"><Link href="/catalog" className="hover:text-deep">{t("Catalog", "קטלוג")}</Link>{dept && deptT && <> / {res.category ? <Link href={`/catalog?dept=${dept.slug}`} className="hover:text-deep">{deptT.name}</Link> : <span aria-current="page">{deptT.name}</span>}</>}{catT && <> / <span aria-current="page">{catT.name}</span></>}</nav>
          <h1 className="wide text-2xl sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-[70ch] text-steel-500">{description}</p>}
        </div>
        <p className="num text-sm text-steel-500">{t(`${res.total} listings`, `${res.total} מוצרים`)}</p>
      </div>

      <nav aria-label={t("Departments", "מחלקות")} className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2">
          <li><Link href="/catalog" aria-current={!dept ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${!dept ? "border-deep bg-deep text-white" : "border-line bg-white text-steel-600 hover:border-deep hover:text-deep"}`}>{t("All", "הכל")}</Link></li>
          {DEPARTMENTS.map((d) => {
            const on = dept?.slug === d.slug;
            return <li key={d.slug}><Link href={`/catalog?dept=${d.slug}`} aria-current={on ? "page" : undefined} className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium ${on ? "border-deep bg-deep text-white" : "border-line bg-white text-steel-600 hover:border-deep hover:text-deep"}`}>{departmentText(d, l).name}</Link></li>;
          })}
        </ul>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[17rem_1fr]">
        {/* Filters: a plain GET form, works without JavaScript */}
        <FilterPanel activeCount={[q.q, q.category, q.condition, q.availability, q.maxMoq, q.storage, q.ram, q.cpu, q.gpu, q.refresh, q.minPrice, q.maxPrice].filter(Boolean).length + (q.manufacturer?.length ?? 0)}>
        <form method="get" action="/catalog" className="space-y-5 rounded-md border border-line bg-white p-4 text-sm" aria-label={t("Filter products", "סינון מוצרים")}>
          <div>
            <label htmlFor="q" className="field-label">{t("Search", "חיפוש")}</label>
            <input id="q" name="q" type="search" defaultValue={q.q} placeholder={t("Model, SKU, manufacturer", "דגם, מק״ט, יצרן")} className="input" />
          </div>
          <div>
            <label htmlFor="dept" className="field-label">{t("Department", "מחלקה")}</label>
            <select id="dept" name="dept" defaultValue={dept?.slug ?? ""} className="input">
              <option value="">{t("All departments", "כל המחלקות")}</option>
              {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{departmentText(d, l).name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="category" className="field-label">{t("Category", "קטגוריה")}</label>
            <select id="category" name="category" defaultValue={q.category ?? ""} className="input">
              <option value="">{deptT ? t(`All categories in ${deptT.name}`, `כל הקטגוריות ב${deptT.name}`) : t("All categories", "כל הקטגוריות")}</option>
              {DEPARTMENTS.filter((d) => !dept || d.slug === dept.slug).map((d) => (
                <optgroup key={d.slug} label={departmentText(d, l).name}>
                  {CATEGORIES.filter((c) => (d.categories as readonly string[]).includes(c.slug)).map((c) => <option key={c.slug} value={c.slug}>{categoryText(c, l).name}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className="field-label">{t("Manufacturer", "יצרן")}</legend>
            <div className="max-h-44 space-y-1 overflow-y-auto pe-1">
              {res.facets.manufacturers.map((m) => (
                <label key={m} className="flex items-center gap-2"><input type="checkbox" name="manufacturer" value={m} defaultChecked={q.manufacturer?.includes(m)} className="accent-deep" />{m}</label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="condition" className="field-label">{t("Condition", "מצב")}</label>
              <select id="condition" name="condition" defaultValue={q.condition ?? ""} className="input">
                <option value="">{any}</option><option value="NEW">{t("New", "חדש")}</option><option value="REFURBISHED">{t("Refurbished", "מחודש")}</option><option value="USED">{t("Used", "משומש")}</option>
              </select>
            </div>
            {enforceMoq && (
            <div>
              <label htmlFor="maxMoq" className="field-label">{t("MOQ up to", "מינימום עד")}</label>
              <input id="maxMoq" name="maxMoq" inputMode="numeric" pattern="\d*" defaultValue={q.maxMoq} className="input" />
            </div>
            )}
          </div>
          <div>
            <label htmlFor="availability" className="field-label">{t("Availability", "זמינות")}</label>
            <select id="availability" name="availability" defaultValue={q.availability ?? ""} className="input">
              <option value="">{any}</option>
              {Object.entries(AVAILABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{l === "he" ? AVAILABILITY_HE[k] : v.label}</option>)}
            </select>
          </div>
          {res.facets.storage.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="storage" className="field-label">{t("Storage", "אחסון")}</label>
                <select id="storage" name="storage" defaultValue={q.storage ?? ""} className="input"><option value="">{any}</option>{res.facets.storage.map((s) => <option key={s} value={s}>{gb(s)}</option>)}</select>
              </div>
              {res.facets.ram.length > 0 && (
                <div>
                  <label htmlFor="ram" className="field-label">{t("Memory", "זיכרון")}</label>
                  <select id="ram" name="ram" defaultValue={q.ram ?? ""} className="input"><option value="">{any}</option>{res.facets.ram.map((s) => <option key={s} value={s}>{s}GB</option>)}</select>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div><label htmlFor="cpu" className="field-label">{t("CPU contains", "מעבד מכיל")}</label><input id="cpu" name="cpu" defaultValue={q.cpu} placeholder="9950X3D" className="input" /></div>
            <div><label htmlFor="gpu" className="field-label">{t("GPU contains", "כרטיס מסך מכיל")}</label><input id="gpu" name="gpu" defaultValue={q.gpu} placeholder="5090" className="input" /></div>
          </div>
          {res.facets.refresh.length > 0 && (
            <div>
              <label htmlFor="refresh" className="field-label">{t("Refresh rate", "קצב רענון")}</label>
              <select id="refresh" name="refresh" defaultValue={q.refresh ?? ""} className="input"><option value="">{any}</option>{res.facets.refresh.map((s) => <option key={s} value={s}>{s}Hz</option>)}</select>
            </div>
          )}
          {res.showPrices && (
            <fieldset>
              <legend className="field-label">{t(`Unit price (${currency})`, `מחיר ליחידה (${currency})`)}</legend>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label={t("Minimum price", "מחיר מינימלי")} name="minPrice" inputMode="decimal" defaultValue={q.minPrice} placeholder={t("Min", "מ-")} className="input" />
                <input aria-label={t("Maximum price", "מחיר מקסימלי")} name="maxPrice" inputMode="decimal" defaultValue={q.maxPrice} placeholder={t("Max", "עד")} className="input" />
              </div>
            </fieldset>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="sort" className="field-label">{t("Sort", "מיון")}</label>
              <select id="sort" name="sort" defaultValue={res.sort} className="input">
                <option value="featured">{t("Featured", "מומלצים")}</option><option value="newest">{t("Newest", "החדשים ביותר")}</option><option value="name">{t("Name", "שם")}</option>{enforceMoq && <option value="moq">{t("Lowest MOQ", "המינימום הנמוך ביותר")}</option>}
                {res.showPrices && <><option value="price_asc">{t("Price: low to high", "מחיר: מהנמוך לגבוה")}</option><option value="price_desc">{t("Price: high to low", "מחיר: מהגבוה לנמוך")}</option></>}
                <option value="storage_desc">{t("Most storage", "הכי הרבה אחסון")}</option><option value="ram_desc">{t("Most memory", "הכי הרבה זיכרון")}</option>
              </select>
            </div>
            {res.showPrices && (
              <div>
                <label htmlFor="currency" className="field-label">{t("Currency", "מטבע")}</label>
                <select id="currency" name="currency" defaultValue={currency} className="input"><option>USD</option><option>EUR</option><option>ILS</option></select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-deep flex-1">{t("Apply filters", "החלת סינון")}</button>
            <Link href="/catalog" className="btn-outline">{t("Reset", "איפוס")}</Link>
          </div>
        </form>
        </FilterPanel>

        <div>
          {rate?.isSample && res.showPrices && currency !== "USD" && (
            <div className="mb-4"><Notice tone="warn">{t(`Prices in ${currency} use a sample exchange rate configured for development (${rate.source}). Base prices are set in USD.`, `המחירים ב-${currency} מחושבים לפי שער חליפין לדוגמה שהוגדר לסביבת הפיתוח. מחירי הבסיס נקבעים בדולר.`)}</Notice></div>
          )}
          {res.items.length === 0 ? (
            <Empty title={t("No listings match these filters", "אין מוצרים שמתאימים לסינון")} action={<Link href="/catalog" className="btn-outline">{t("Clear all filters", "ניקוי כל הסינונים")}</Link>}>
              {l === "he"
                ? <>נסו להסיר סינון, או שלחו לנו את הדגם שאתם צריכים ב<Link href="/quote" className="link">בקשת הצעת מחיר</Link> — אנחנו משיגים לפי בקשה.</>
                : <>Try removing a filter, or send us the model you need through a <Link href="/quote" className="link">quote request</Link> — we source on request.</>}
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {res.items.map((p) => <ProductCard key={p.id} p={p} l={l} enforceMoq={enforceMoq} currency={currency} rate={rate?.rate} compareSlot={actor ? <CompareToggle slug={p.slug} /> : null} />)}
            </div>
          )}
          {res.pages > 1 && (
            <nav className="mt-8 flex items-center justify-between text-sm" aria-label={t("Pagination", "עמודים")}>
              {res.page > 1 ? <Link className="btn-outline btn-sm" href={pageHref(res.page - 1)}>{t("Previous", "הקודם")}</Link> : <span />}
              <span className="num text-steel-500">{t(`Page ${res.page} of ${res.pages}`, `עמוד ${res.page} מתוך ${res.pages}`)}</span>
              {res.page < res.pages ? <Link className="btn-outline btn-sm" href={pageHref(res.page + 1)}>{t("Next", "הבא")}</Link> : <span />}
            </nav>
          )}
          <p className="mt-8 text-xs text-steel-500">{t("Catalog data in this environment is sample data: specifications are compiled for setup and must be verified against manufacturer documentation; availability is indicative and confirmed per order.", "נתוני הקטלוג בסביבה זו הם נתוני דוגמה: המפרטים נאספו לצורך הקמה ויש לאמת אותם מול מסמכי היצרן; הזמינות משוערת ומאושרת בכל הזמנה.")}</p>
        </div>
      </div>
    </div>
  );
}
