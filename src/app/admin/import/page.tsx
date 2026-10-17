import { requireStaff } from "@/server/guards";
import { ActionForm } from "@/components/ActionForm";
import { PageHeader } from "@/components/ui";
import { CATALOG_CSV_COLUMNS } from "@/server/catalog-import";
export const metadata = { title: "Catalog import" };
export default async function Import() {
  await requireStaff("catalog.manage");
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Catalog import" intro="Create or update listings in bulk from CSV (one row per SKU) or the JSON catalog format. Products are matched by slug and SKUs by SKU code; nothing is deleted." />
      <section className="panel panel-pad space-y-3">
        <ActionForm action="/api/admin/catalog/import" encoding="multipart" submitLabel="Import catalog file">
          <input type="file" name="file" accept=".csv,.json,text/csv,application/json" required aria-label="Catalog file" className="input" />
        </ActionForm>
        <a className="link text-sm" href="/api/admin/catalog/template">Download the CSV template</a>
      </section>
      <section className="panel panel-pad text-sm">
        <h2 className="mb-2 font-semibold">CSV columns</h2>
        <p className="num mb-3 break-words text-xs text-steel-500">{CATALOG_CSV_COLUMNS.join(", ")}</p>
        <ul className="list-disc space-y-1 pl-5 text-steel">
          <li>Repeat product columns on each SKU row; the first row for a slug defines the product.</li>
          <li><code>specs</code>: entries separated by <code>;;</code>, each as <code>Group|Label|Value</code>.</li>
          <li><code>reference_is_sample</code>: set to <code>false</code> only for verified benchmark prices.</li>
          <li>Imported products are not purchasable in production until activated on the product page.</li>
          <li>Wholesale prices and tiers are always computed by the platform from the reference price and policy.</li>
        </ul>
      </section>
    </div>
  );
}
