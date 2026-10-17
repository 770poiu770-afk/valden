import Link from "next/link";
import { ProductArt } from "@/components/ProductArt";
import { PageHeader } from "@/components/ui";
import { listCategoriesWithCounts } from "@/server/catalog";

export const metadata = { title: "Product categories" };
export const dynamic = "force-dynamic";

export default async function Categories() {
  const cats = await listCategoriesWithCounts();
  return (
    <div className="container-page py-10">
      <PageHeader title="Product categories" intro="Fourteen product lines, each priced for trade volumes with published minimum order quantities." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <Link key={c.slug} href={`/catalog?category=${c.slug}`} className="group grid grid-cols-[7rem_1fr] gap-4 rounded-md border border-line bg-white p-3 hover:border-deep">
            <ProductArt kind={c.imageKey} className="aspect-[4/3] w-full rounded-sm" label={c.name} />
            <div className="py-1">
              <h2 className="font-semibold text-deep-900 group-hover:underline">{c.name}</h2>
              <p className="mt-1 text-sm text-steel-500">{c.description}</p>
              <p className="num mt-2 text-xs font-medium text-steel">{c.n} listings</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
