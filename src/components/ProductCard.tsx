import Link from "next/link";
import { ProductArt } from "./ProductArt";
import { Badge, Money } from "./ui";
import { AVAILABILITY_LABEL, CONDITION_LABEL } from "@/lib/catalog-meta";
import { convertMinor, type Currency } from "@/lib/money";
import { makeT, type Locale } from "@/lib/i18n";
import { AVAILABILITY_HE, CONDITION_HE } from "@/lib/labels";

export type CardProduct = {
  slug: string; name: string; manufacturer: string; subcategory: string; condition: string; moq: number;
  availability: string; imageKey: string; imageUrl?: string | null; wholesaleCents: number | null; isSample?: boolean;
};

export function ProductCard({ p, currency = "USD", rate, compareSlot, l = "en", enforceMoq = false }: { p: CardProduct; currency?: Currency; rate?: string | null; compareSlot?: React.ReactNode; l?: Locale; enforceMoq?: boolean }) {
  const t = makeT(l);
  const av = AVAILABILITY_LABEL[p.availability];
  const avLabel = (l === "he" ? AVAILABILITY_HE[p.availability] : av?.label) ?? p.availability;
  const price = p.wholesaleCents !== null && rate ? convertMinor(BigInt(p.wholesaleCents), rate) : null;
  return (
    <article className="group flex flex-col overflow-hidden rounded-md border border-line bg-white hover:border-deep-200">
      <Link href={`/products/${p.slug}`} className="block" tabIndex={-1} aria-hidden>
        {p.imageUrl
          ? <img src={p.imageUrl} alt="" className="aspect-[16/9] w-full object-contain bg-deep-50" loading="lazy" />
          : <ProductArt kind={p.imageKey} className="aspect-[16/9] w-full object-cover" />}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-steel-500">
          <span className="truncate" dir="auto">{p.manufacturer}</span>
          {p.condition !== "NEW" && <Badge tone={p.condition === "REFURBISHED" ? "info" : "warn"}>{l === "he" ? CONDITION_HE[p.condition] : CONDITION_LABEL[p.condition]}</Badge>}
        </div>
        <h3 className="text-[15px] font-semibold leading-snug text-deep-900">
          <Link href={`/products/${p.slug}`} className="hover:underline" dir="auto">{p.name}</Link>
        </h3>
        <div className="mt-auto space-y-2 pt-2">
          <div className="flex items-end justify-between gap-2">
            {price !== null ? (
              <div>
                <p className="text-[11px] text-steel-500">{t("Price per unit", "מחיר ליחידה")}</p>
                <Money cents={price} currency={currency} className="text-lg font-bold text-deep-900" />
              </div>
            ) : (
              <p className="text-sm font-medium text-steel-500">{t("Price not available", "המחיר אינו זמין")}</p>
            )}
            {enforceMoq
              ? <p className="num text-end text-xs text-steel-500">{t("MOQ", "מינימום")} <span className="font-semibold text-steel">{p.moq}</span></p>
              : p.moq > 1 ? <p className="num text-end text-xs text-steel-500">{t("Bulk price from", "מחיר כמות מ-")} <span className="font-semibold text-steel">{p.moq}</span></p> : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge tone={av?.tone === "ok" ? "ok" : av?.tone === "warn" ? "warn" : av?.tone === "info" ? "info" : "muted"}>{avLabel}</Badge>
            {compareSlot}
          </div>
        </div>
      </div>
    </article>
  );
}
