import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { CATEGORIES } from "@/lib/catalog-meta";
export const metadata = { title: "New product" };
export default async function NewProduct() {
  await requireStaff("catalog.manage");
  return (
    <div className="max-w-2xl">
      <PageHeader title="New product" back={{ href: "/admin/products", label: "Products" }} intro="Create the listing with its reference price; add specifications, SKUs and logistics data on the next screen. New products are not purchasable until activated." />
      <ActionForm action="/api/admin/products" className="panel panel-pad grid gap-4 sm:grid-cols-2" submitLabel="Create product">
        <div className="sm:col-span-2"><label className="field-label" htmlFor="name">Listing name</label><input id="name" name="name" required className="input" /></div>
        <div><label className="field-label" htmlFor="manufacturer">Manufacturer</label><input id="manufacturer" name="manufacturer" required className="input" /></div>
        <div><label className="field-label" htmlFor="model">Model</label><input id="model" name="model" required className="input" /></div>
        <div><label className="field-label" htmlFor="categorySlug">Category</label><select id="categorySlug" name="categorySlug" className="input">{CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div>
        <div><label className="field-label" htmlFor="subcategory">Subcategory</label><input id="subcategory" name="subcategory" required className="input" /></div>
        <div><label className="field-label" htmlFor="referencePrice">Verified reference price (USD)</label><input id="referencePrice" name="referencePrice" required className="input" /></div>
        <div><label className="field-label" htmlFor="moq">MOQ</label><input id="moq" name="moq" type="number" min={1} defaultValue={10} className="input" /></div>
      </ActionForm>
    </div>
  );
}
