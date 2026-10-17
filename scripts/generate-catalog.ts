/**
 * Builds data/catalog.json — the structured seed catalog — from the typed family definitions in
 * scripts/catalog/*. Re-run after editing those files. The JSON is the import format used by
 * `npm run catalog:import` (CSV is also supported; see docs/CATALOG.md).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { mobile } from "./catalog/mobile";
import { computers } from "./catalog/computers";
import { components, creatorAndAccessories } from "./catalog/components";
import type { CatalogItem } from "./catalog/types";

const CAT_CODE: Record<string, string> = {
  iphone: "IPH", galaxy: "GLX", "gaming-desktops": "GDT", "custom-gaming-pcs": "BTO", workstations: "WKS", laptops: "LAP",
  "graphics-cards": "GPU", "cpus-motherboards": "CPU", "memory-storage": "MEM", monitors: "MON", tablets: "TAB",
  networking: "NET", creator: "CRE", components: "ACC",
};

export function slugify(s: string) {
  return s.toLowerCase().replace(/["'″]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
}
const hash = (s: string, n = 6) => createHash("sha1").update(s).digest("hex").slice(0, n).toUpperCase();

const items: CatalogItem[] = [...mobile(), ...computers(), ...components(), ...creatorAndAccessories()];
const seen = new Set<string>();
const out = items.map((it) => {
  let slug = slugify(it.name);
  if (seen.has(slug)) slug = `${slug}-${hash(it.name + it.condition, 4).toLowerCase()}`;
  if (seen.has(slug)) throw new Error(`Duplicate listing: ${it.name}`);
  seen.add(slug);
  const base = `VLD-${CAT_CODE[it.category]}-${hash(slug)}`;
  const variants = (it.variants?.length ? it.variants : [{ label: "Standard" }]).map((v, i) => ({
    sku: `${base}-${String(i + 1).padStart(2, "0")}`, label: v.label, color: v.color ?? null, region: v.region ?? null,
  }));
  return {
    slug, sku: base, ...it, condition: it.condition ?? "NEW",
    specs: it.specs.map(([group, label, value]) => ({ group, label, value })),
    variants,
  };
});

mkdirSync("data", { recursive: true });
writeFileSync("data/catalog.json", JSON.stringify({
  _notice: "SAMPLE CATALOG. Reference prices are indicative estimates for development and are NOT verified market data, supplier quotes or stock. Replace before launch.",
  generatedAt: new Date().toISOString().slice(0, 10),
  products: out,
}, null, 1));

const byCat: Record<string, number> = {};
for (const p of out) byCat[p.category] = (byCat[p.category] ?? 0) + 1;
console.log(`Generated ${out.length} listings, ${out.reduce((n, p) => n + p.variants.length, 0)} SKUs`);
console.table(byCat);
