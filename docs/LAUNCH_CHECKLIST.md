# Launch-readiness checklist

## Business and legal (owner)

- [ ] Legal entity, company registration and VAT registration in place; set `COMPANY_*` variables.
- [ ] Terms of trade, privacy, shipping and returns policies reviewed by counsel (current texts are templates).
- [ ] Tax treatment confirmed per jurisdiction; update **Settings › Taxes** (default: IL 18%, others 0%).
- [ ] Export-control and sanctions screening process defined (networking/security items flagged in catalog).
- [ ] Supplier agreements in place for the products you will list; do not list brands you cannot source.
- [ ] Decide on KYB checks (registry lookups, sanctions lists) used when approving accounts.

## Data

- [ ] Replace sample reference prices with verified benchmarks (Admin › Pricing CSV); review all `FALLBACK_POLICY` products.
- [ ] Verify specifications against manufacturer datasheets; add licensed product images.
- [ ] Enter real availability, lead times, case/carton/pallet data, warranty terms and origin.
- [ ] Remove or deactivate sample listings you will not sell; activate real products for sale.
- [ ] Record verified USD→EUR and USD→ILS rates with their source; define who updates them and how often.
- [ ] Review the pricing policy: the US$300–400 premium over market benchmarks may not be competitive for
      wholesale buyers; confirm it is intended for each category.

## Payments

- [ ] Complete the PayPal sandbox test plan in `docs/PAYPAL.md` (create, capture, refund, webhooks, duplicate events).
- [ ] Live PayPal Business account verified; live credentials and webhook configured.
- [ ] PayPal limits confirmed in writing; set **PayPal maximum** in Settings.
- [ ] Bank transfer instructions finalised; finance process for verifying receipts before recording payment.
- [ ] One live end-to-end transaction and refund reconciled.

## Infrastructure

- [ ] Domain purchased (suggestions — availability not checked: valden.trade, valdensupply.com, valden-distribution.com).
- [ ] HTTPS, `APP_URL`, `NODE_ENV=production`; `ALLOW_SAMPLE_DATA` unset.
- [ ] Managed Postgres with PITR backups; restore tested.
- [ ] Persistent storage for `UPLOAD_DIR` (or S3 implementation) with backups.
- [ ] SMTP configured; SPF/DKIM/DMARC set for the sending domain; test password reset end-to-end.
- [ ] Log shipping and alerting on `"level":"error"` lines and on `payment_amount_mismatch`.
- [ ] Scheduled cleanup of expired sessions and old rate-limit rows.
- [ ] First super admin created on the server; staff accounts created with least-privilege roles.

## Verification

- [ ] `npm test` and `npm run test:e2e` pass against staging.
- [ ] Manual walkthrough on mobile and desktop: registration → approval → order → payment → shipment.
- [ ] Penetration test / security review before taking large transactions.

## Remaining external dependencies

| Dependency | Status |
| --- | --- |
| PayPal merchant account, credentials, webhook | Not configured; integration tested only against a test double |
| Email delivery (SMTP) | Code ready (`SMTP_URL`); no provider configured |
| Hosting, domain, TLS | Not deployed |
| Verified product data, prices, stock, images | Sample data only; no supplier feeds |
| Carrier integration | None — manual fulfillment workflow provided |
| Exchange-rate source | Manual entry by staff; no automated feed |
| Object storage for documents | Local disk implementation; swap for S3 when scaling horizontally |
| Business verification (KYB) provider | None — manual review by staff |
