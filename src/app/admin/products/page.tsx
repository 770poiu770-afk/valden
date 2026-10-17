import Link from "next/link";
import { and, asc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { Badge, Money, PageHeader, StatusPill } from "@/components/ui";
import { CATEGORIES, AVAILABILITY_LABEL } from "@/lib/catalog-meta";
export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };
export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; flag?: string; category?: string; active?: string; page?: string }> }) {
  await requireStaff("catalog.manage");
  const sp = await searchParams;
  const w: SQL[] = [];
  if (sp.q) w.push(sql`${products.searchText} LIKE ${"%" + sp.q.toLowerCase().replace(/[%_\\]/g, "\\$&") + "%"}`);
  if (sp.flag) w.push(eq(products.pricingFlag, sp.flag as "NONE"));
  if (sp.category) w.push(sql`${products.categoryId} = (SELECT id FROM categories WHERE slug = ${sp.category})`);
  if (sp.active === "sale") w.push(eq(products.purchasable, true));
  if (sp.active === "inactive") w.push(eq(products.isActive, false));
  const page = Math.max(1, Number(sp.page) || 1);
  const rows = await db.select({ p: products, cat: categories.name }).from(products).innerJoin(categories, eq(categories.id, products.categoryId)).where(w.length ? and(...w) : undefined).orderBy(asc(categories.sortOrder), asc(products.name)).limit(50).offset((page - 1) * 50);
  const qs = (n: number) => `?${new URLSearchParams({ ...(sp as Record<string, string>), page: String(n) })}`;
  return (
    <div>
      <PageHeader title="Products & SKUs" actions={<Link href="/admin/products/new" className="btn-deep">New product</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Search name, SKU" className="input w-64" />
        <select name="category" defaultValue={sp.category ?? ""} className="input w-56"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
        <select name="flag" defaultValue={sp.flag ?? ""} className="input w-48"><option value="">Any pricing state</option><option value="NONE">Standard premium</option><option value="FALLBACK_POLICY">Fallback policy</option><option value="NEEDS_REVIEW">Needs review</option><option value="OVERRIDE">Override</option></select>
        <select name="active" defaultValue={sp.active ?? ""} className="input w-44"><option value="">All listings</option><option value="sale">Activated for sale</option><option value="inactive">Inactive</option></select>
        <button className="btn-deep">Filter</button>
      </form>
      <div className="panel overflow-x-auto"><table className="tbl min-w-[960px]">
        <thead><tr><th>Product</th><th>Category</th><th className="text-right">Reference</th><th className="text-right">Wholesale</th><th>Pricing</th><th className="text-right">MOQ</th><th>Availability</th><th>Sale</th></tr></thead>
        <tbody>{rows.map(({ p, cat }) => (
          <tr key={p.id}>
            <td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link>{!p.isActive && <Badge tone="muted" className="ml-2">Inactive</Badge>}</td>
            <td className="text-xs">{cat}</td>
            <td className="text-right"><Money cents={p.referencePriceCents} currency="USD" />{p.referenceIsSample && <p className="text-[11px] text-warn">sample</p>}</td>
            <td className="text-right font-medium"><Money cents={p.wholesaleCents} currency="USD" /></td>
            <td><StatusPill status={p.pricingFlag} label={{ NONE: "Standard", FALLBACK_POLICY: "Fallback", NEEDS_REVIEW: "Review", OVERRIDE: "Override" }[p.pricingFlag]} /></td>
            <td className="num text-right">{p.moq}</td>
            <td className="text-xs">{AVAILABILITY_LABEL[p.availability].label}</td>
            <td>{p.purchasable ? <Badge tone="ok">Active</Badge> : p.isSample ? <Badge tone="muted">Sample</Badge> : <Badge tone="warn">Off</Badge>}</td>
          </tr>))}</tbody>
      </table></div>
      <div className="mt-4 flex justify-between text-sm">{page > 1 ? <Link className="btn-outline btn-sm" href={qs(page - 1)}>Previous</Link> : <span />}{rows.length === 50 && <Link className="btn-outline btn-sm" href={qs(page + 1)}>Next</Link>}</div>
    </div>
  );
}
