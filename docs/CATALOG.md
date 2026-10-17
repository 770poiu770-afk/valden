# Catalog and pricing data

## The sample catalog

`data/catalog.json` contains 337 listings and 748 SKUs across 14 categories. It is generated from
typed definitions in `scripts/catalog/*.ts` (`npm run catalog:generate`).

- **Reference prices are sample estimates**, approximating publicly known launch prices as of mid-2026.
  They are flagged `referenceIsSample = true` and must be replaced with verified benchmarks.
- **Specifications** were compiled for setup and must be checked against manufacturer datasheets.
- **Availability** is indicative; no quantities are marked as confirmed. Case/carton/pallet data
  is left empty until supplier data is available.
- iPhone 17-generation models are the newest Apple phones included; later models were not added
  because they could not be verified when the catalog was built.
- Product images are neutral line illustrations. Add licensed photography by setting `Image URL` on
  each product.

## Pricing model

For each product: **reference price** (market benchmark with source and date) → **wholesale list
price** → **quantity tiers**, with optional **contract prices** per company.

1. **Override** (admin) wins if set.
2. **Product markup %** applies if set.
3. Otherwise the **target premium** (default US$350, allowed band US$300–400) is added — only if it is
   no more than **25%** of the reference.
4. If the premium would exceed that share, the **fallback** applies: either an explicit markup
   (default 8%, product flagged `FALLBACK_POLICY` for review) or no premium with the product held as
   `NEEDS_REVIEW` (not orderable online). With the sample catalog, 180 products use the flat
   premium and 157 lower-priced items use the fallback.
5. Tiers are generated from the schedule (MOQ ×1, ×5, ×10, ×25, ×50 at 0 / 1.5 / 3 / 4.5 / 6% off).

All values are configurable in **Admin › Pricing**. Buyers never see reference prices.

## Price file (CSV) — Admin › Pricing

Export, edit and re-import. Columns (omit any you don't want to change):

`slug, name, reference_price_usd, reference_source, reference_verified_at (YYYY-MM-DD),
reference_is_sample (true/false), markup_percent, override_price_usd, wholesale_price_usd (read-only),
pricing_flag (read-only), moq, availability, available_qty, availability_verified, lead_time`

Every change records a reference-price observation and an audit entry, and regenerates tiers.

## Catalog file — Admin › Catalog import or `importProducts()`

CSV with one row per SKU (product columns repeated), or JSON in the `data/catalog.json` format.
Columns:

`slug, name, manufacturer, model, category, subcategory, condition, summary, specs, attributes_json,
reference_price_usd, reference_source, reference_is_sample, moq, order_increment, case_pack,
carton_qty, pallet_qty, availability, lead_time, image_key, region_compatibility,
shipping_restrictions, warranty_info, origin, variant_sku, variant_label, variant_color, variant_region`

- `category`: one of `iphone, galaxy, gaming-desktops, custom-gaming-pcs, workstations, laptops,
  graphics-cards, cpus-motherboards, memory-storage, monitors, tablets, networking, creator, components`.
- `specs`: `Group|Label|Value` entries separated by `;;`.
- `attributes_json`: filter attributes, e.g. `{"storageGb":512,"ramGb":12,"cpu":"A19 Pro"}`.
- `availability`: `INDICATIVE_AVAILABLE, LIMITED_CONFIRM, BUILD_TO_ORDER, PRE_ORDER, ON_REQUEST, UNAVAILABLE`.
- Products match on `slug`, SKUs on `variant_sku`. SKUs missing from a re-import are deactivated,
  never deleted (orders may reference them).

## Going live with real products

Imported or edited products are only purchasable in production after a staff member ticks
**Activated for sale** on the product page (requires the pricing permission). Products held for
pricing review cannot be activated until an override or markup is set.
