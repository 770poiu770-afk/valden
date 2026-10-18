import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { PageHeader } from "@/components/ui";
import { listCategoriesWithCounts } from "@/server/catalog";
import { DEPARTMENTS } from "@/lib/catalog-meta";

export const metadata = { title: "Product categories" };
export const dynamic = "force-dynamic";

export default async function Categories() {
  const cats = await listCategoriesWithCounts();
  return (
    <div className="container-page py-10">
      <PageHeader title="Product categories" intro="Six departments, each priced for trade volumes with published minimum order quantities." />
      <div className="space-y-12">
        {DEPARTMENTS.map((d) => {
          const list = cats.filter((c) => (d.categories as readonly string[]).includes(c.slug));
          const n = list.reduce((s, c) => s + c.n, 0);
          return (
            <section key={d.slug} aria-labelledby={`dept-${d.slug}`}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
                <h2 id={`dept-${d.slug}`} className="wide text-xl">{d.name} <span className="num ml-1 text-sm font-normal text-steel-500">{n} listings</span></h2>
                <Link href={`/catalog?dept=${d.slug}`} className="link text-sm">Browse all {d.name.toLowerCase()}<span className="sr-only"> listings</span></Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/catalog?category=${c.slug}`} className="group grid h-full grid-cols-[7rem_1fr] gap-4 rounded-md border border-line bg-white p-3 hover:border-deep">
                      <ProductArt kind={c.imageKey} className="aspect-[4/3] w-full rounded-sm" decorative />
                      <span className="block py-1">
                        <span className="block font-semibold text-deep-900 group-hover:underline">{c.name}</span>
                        <span className="mt-1 block text-sm text-steel-500">{c.description}</span>
                        <span className="num mt-2 block text-xs font-medium text-steel">{c.n} listings</span>
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
