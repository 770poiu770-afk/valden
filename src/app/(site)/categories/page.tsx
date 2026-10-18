import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { PageHeader } from "@/components/ui";
import { listCategoriesWithCounts } from "@/server/catalog";
import { DEPARTMENTS } from "@/lib/catalog-meta";
import { categoryText, departmentText } from "@/lib/labels";
import { getT } from "@/server/locale";

export async function generateMetadata() { const { t } = await getT(); return { title: t("Product categories", "קטגוריות מוצרים") }; }
export const dynamic = "force-dynamic";

export default async function Categories() {
  const cats = await listCategoriesWithCounts();
  const { l, t } = await getT();
  return (
    <div className="container-page py-10">
      <PageHeader title={t("Product categories", "קטגוריות מוצרים")} intro={t("Six departments, each priced for trade volumes with published minimum order quantities.", "שש מחלקות, כולן מתומחרות לכמויות סחר עם כמויות הזמנה מינימליות מפורסמות.")} />
      <div className="space-y-12">
        {DEPARTMENTS.map((d) => {
          const list = cats.filter((c) => (d.categories as readonly string[]).includes(c.slug));
          const n = list.reduce((s, c) => s + c.n, 0);
          const dt = departmentText(d, l);
          return (
            <section key={d.slug} aria-labelledby={`dept-${d.slug}`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
                <h2 id={`dept-${d.slug}`} className="wide text-xl">{dt.name} <span className="num ms-1 text-sm font-normal text-steel-500">{t(`${n} listings`, `${n} מוצרים`)}</span></h2>
                <Link href={`/catalog?dept=${d.slug}`} className="link text-sm">{t(`Browse all ${dt.name.toLowerCase()}`, `לכל המוצרים ב${dt.name}`)}</Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/catalog?category=${c.slug}`} className="group grid h-full grid-cols-[7rem_1fr] gap-4 rounded-md border border-line bg-white p-3 hover:border-deep">
                      <ProductArt kind={c.imageKey} className="aspect-[4/3] w-full rounded-sm" decorative />
                      <span className="block py-1">
                        <span className="block font-semibold text-deep-900 group-hover:underline">{categoryText(c, l).name}</span>
                        <span className="mt-1 block text-sm text-steel-500">{categoryText(c, l).description}</span>
                        <span className="num mt-2 block text-xs font-medium text-steel">{t(`${c.n} listings`, `${c.n} מוצרים`)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
