# Test results

Run on 17 Oct 2026 in the build environment (Linux, Node 22.22, PostgreSQL 16.x). These are the
actual outputs of the final run — nothing here is projected.

## Summary

| Suite | Command | Result |
| --- | --- | --- |
| TypeScript | `npx tsc --noEmit` | 0 errors |
| Production build (incl. ESLint + type check) | `npm run build` | Success — 55 routes |
| Database migrations | `npm run db:migrate` (fresh DB in test setup) | Applied cleanly (2 migrations, 37 tables) |
| Seed | `npm run db:seed -- --demo` | 337 products, 748 SKUs, 0 import errors |
| Integration + unit tests | `npm test` | **37 passed, 0 failed** |
| End-to-end HTTP smoke test (production server) | `npm run test:e2e` | **81 passed, 0 failed** |
| Responsive layout | Headless Chromium at 390 / 768 / 1366 px, 15 pages | No horizontal overflow after fixes (see below) |

## Acceptance criteria coverage

| # | Requirement | Where verified |
| --- | --- | --- |
| 1 | Business registration | Vitest "registers a business…", "requires a document…"; e2e multipart registration with PDF and magic-byte rejection |
| 2 | Approval and rejection | Vitest "approves, rejects and suspends…"; e2e admin approval |
| 3 | Restricted wholesale pricing | Vitest "hides prices…", "ignores price filters…"; e2e guest vs approved product page |
| 4 | Search and filtering | Vitest "searches by text, manufacturer, storage and sorts by price" |
| 5 | Quantity and minimum-order validation | Vitest "validates MOQ and case-pack increments", "enforces the minimum order value (₪50,000)" |
| 6 | Tiered pricing | Vitest "applies quantity tiers server-side", "builds tiers and resolves the best of contract and tier price" |
| 7 | Cart persistence | Vitest "persists the cart across sessions"; e2e cart API |
| 8 | ₪300,000 order calculation | Vitest "calculates an order above ₪300,000 exactly, with VAT and freight" (45 × ₪7,016.40 = ₪315,738.00 + RTX 5090 line, 18% VAT, ₪4,500 freight); e2e order shows ₪315,738.00 |
| 9 | Quote submission and admin response | Vitest "submits a quote, receives an offer…"; e2e quote → offer |
| 10 | Quote acceptance → order | Vitest (same) and "refuses expired offers"; e2e accept → order |
| 11 | PayPal order creation | Vitest "creates a PayPal order server-side, reuses it…" (**test double**, not PayPal sandbox) |
| 12 | Capture and webhook verification | Vitest capture + "processes verified webhooks once and rejects unverified ones"; real gateway rejects missing webhook ID / non-PayPal cert URL; e2e forged webhook rejected |
| 13 | Duplicate webhooks | Vitest — second delivery returns `duplicate_ignored`, one stored event |
| 14 | Failed payments | Vitest "handles declined and instrument-declined captures", "never marks paid on amount mismatch" |
| 15 | Refunds | Vitest partial + webhook-reported refund → fully refunded, over-refund blocked, role check |
| 16 | Admin access restrictions | Vitest "restricts admin actions by role"; e2e buyer → /admin redirect and admin API 403 |
| 17 | Buyer isolation | Vitest "isolates orders and quotes between companies"; e2e other company gets 404 on order, documents and cancel |
| 18 | Product import and price updates | Vitest CSV price import, catalog CSV import, policy recalculation |
| 19 | Mobile responsiveness | Chromium width checks at 390/768/1366 px |
| 20 | Production build and migrations | Build success; migrations applied to a fresh database by the test setup |

Also covered: login lockout and one-time password reset, CSRF origin enforcement, login rate limiting,
security headers, logout, bank-transfer recording and duplicate protection, multi-shipment
fulfillment, production guards for sample products and sample exchange rates.

## Not tested — and why

- **PayPal sandbox:** no sandbox credentials were provided and PayPal's API (`api-m.sandbox.paypal.com`)
  was not reachable from the build environment. The PayPal code paths were tested against an
  in-memory double of the REST API. Run the sandbox plan in `docs/PAYPAL.md` before relying on it.
- **Real email delivery:** no SMTP provider configured; messages were verified in the outbox table.
- **Deployment:** the application was run locally as a production build only; it has not been
  deployed to a public host.
- **Real-device testing:** responsive checks used headless Chromium only.

## Defects found and fixed during testing

- Admin dashboard query referenced a non-existent `placed_at` column (500 error) → fixed.
- SKU search required contiguous phrases ("rog astral 5090" found nothing) → switched to per-term matching.
- Mobile overflow from the portal account nav, header, cart table, checkout grid and admin FX table → fixed.
- Cart table cramped at laptop widths → summary stacks below the table until 1536px.
- Price-import test expectation was wrong: $350 on a $1,050 reference is 33%, so the fallback policy correctly applied — kept the behaviour, fixed the test.

## Raw output — integration tests (`npm test -- --reporter=verbose`)

```
✓ tests/workflows.test.ts > money and pricing rules > does exact integer currency conversion and formatting 5ms
✓ tests/workflows.test.ts > money and pricing rules > applies the flat premium only where plausible and flags the rest 4ms
✓ tests/workflows.test.ts > money and pricing rules > builds tiers and resolves the best of contract and tier price 1ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > registers a business as pending with no wholesale access 515ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > requires a document, strong password and unique email 358ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > approves, rejects and suspends with history and permission effects 1187ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > hides prices and staff fields from guests; shows them to approved buyers 445ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > ignores price filters for users without price access (no price probing) 25ms
✓ tests/workflows.test.ts > 1–3. registration, approval and restricted pricing > locks login after repeated failures and supports one-time password reset 1911ms
✓ tests/workflows.test.ts > 4. search and filtering > searches by text, manufacturer, storage and sorts by price 565ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > validates MOQ and case-pack increments 520ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > applies quantity tiers server-side 494ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > persists the cart across sessions 501ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > enforces the minimum order value (₪50,000) 551ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > calculates an order above ₪300,000 exactly, with VAT and freight 690ms
✓ tests/workflows.test.ts > 5–8. quantities, tiers, cart persistence and a ₪300,000 order > rejects PayPal for orders above the configured PayPal cap 420ms
✓ tests/workflows.test.ts > 9–10. quotations > submits a quote, receives an offer, accepts and converts to an order 902ms
✓ tests/workflows.test.ts > 9–10. quotations > refuses expired offers 469ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > creates a PayPal order server-side, reuses it, and captures with verification 419ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > refuses payment before trade-desk confirmation 413ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > never marks paid on amount mismatch 475ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > handles declined and instrument-declined captures 486ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > processes verified webhooks once and rejects unverified ones 456ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > issues partial and full refunds, blocks over-refunds, records dashboard refunds 1344ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > records disputes from webhooks 487ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > records verified bank transfers and blocks duplicates 817ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > lets buyers cancel unpaid orders and switch payment method 412ms
✓ tests/workflows.test.ts > 11–15. PayPal sandbox flow, webhooks, failures and refunds > supports multi-shipment manual fulfillment 1243ms
✓ tests/workflows.test.ts > 16–17. access restrictions and company isolation > restricts admin actions by role 1311ms
✓ tests/workflows.test.ts > 16–17. access restrictions and company isolation > isolates orders and quotes between companies 915ms
✓ tests/workflows.test.ts > 18. product import and price updates > imports prices from CSV, recomputes wholesale and tiers, and exports 71ms
✓ tests/workflows.test.ts > 18. product import and price updates > imports a new product from catalog CSV and rejects invalid rows 26ms
✓ tests/workflows.test.ts > 18. product import and price updates > re-prices all products when the pricing policy changes 2540ms
✓ tests/workflows.test.ts > misc > never leaks password hashes through actors 495ms
✓ tests/workflows.test.ts > misc > real gateway rejects webhooks without a webhook ID or with a non-PayPal cert URL 2ms
✓ tests/production-guards.test.ts > production safety switches > sample products are not purchasable in production unless activated 3ms
✓ tests/production-guards.test.ts > production safety switches > development allows sample data; NEEDS_REVIEW and UNAVAILABLE are never orderable 1ms
Test Files  2 passed (2)
Tests  37 passed (37)
```

## Raw output — end-to-end (`npm run test:e2e`, production build)

```
PASS  GET / → 200
PASS  GET /catalog → 200
PASS  GET /categories → 200
PASS  GET /products/apple-iphone-17-pro-max-1tb → 200
PASS  GET /register → 200
PASS  GET /login → 200
PASS  GET /forgot-password → 200
PASS  GET /about → 200
PASS  GET /services → 200
PASS  GET /contact → 200
PASS  GET /quote → 200
PASS  GET /faq → 200
PASS  GET /policies/shipping → 200
PASS  GET /policies/returns → 200
PASS  GET /privacy → 200
PASS  GET /terms → 200
PASS  guest product page hides wholesale price
PASS  unknown product → 404
PASS  register business (multipart + PDF)
PASS  upload with mismatched magic bytes rejected
PASS  pending buyer sees review page
PASS  pending buyer cannot use cart (403)
PASS  buyer redirected away from /admin
PASS  cross-origin POST blocked (CSRF)
PASS  admin wrong password → 401
PASS  admin login
PASS  admin GET /admin → 200
PASS  admin GET /admin/companies → 200
PASS  admin GET /admin/products → 200
PASS  admin GET /admin/pricing → 200
PASS  admin GET /admin/import → 200
PASS  admin GET /admin/quotes → 200
PASS  admin GET /admin/orders → 200
PASS  admin GET /admin/payments → 200
PASS  admin GET /admin/refunds → 200
PASS  admin GET /admin/shipments → 200
PASS  admin GET /admin/users → 200
PASS  admin GET /admin/roles → 200
PASS  admin GET /admin/settings → 200
PASS  admin GET /admin/audit → 200
PASS  admin GET /admin/inquiries → 200
PASS  admin GET /admin/outbox → 200
PASS  admin finds new company
PASS  admin downloads verification document as attachment
PASS  anonymous cannot download document
PASS  admin approves company
PASS  approved buyer sees wholesale price
PASS  SKU search returns results
PASS  add to cart
PASS  cart subtotal ₪ computed server-side (45 × ₪7,016.40)
PASS  buyer GET /portal → 200
PASS  buyer GET /portal/cart?currency=ILS → 200
PASS  buyer GET /portal/checkout?currency=ILS → 200
PASS  buyer GET /portal/bulk → 200
PASS  buyer GET /portal/quotes → 200
PASS  buyer GET /portal/quotes/new → 200
PASS  buyer GET /portal/orders → 200
PASS  buyer GET /portal/saved → 200
PASS  buyer GET /portal/compare → 200
PASS  buyer GET /portal/company → 200
PASS  place order (client price fields ignored)
PASS  order is pending review with server totals
PASS  order shows ₪315,738.00 subtotal
PASS  other company cannot view order (404)
PASS  other company cannot open order documents (404)
PASS  other company cannot cancel order
PASS  buyer cannot call admin API (403)
PASS  admin confirms order with freight
PASS  manual payment with wrong amount rejected
PASS  finance records verified transfer
PASS  create shipment
PASS  buyer sees shipment and paid status
PASS  buyer opens pro-forma invoice
PASS  buyer submits quote request
PASS  admin issues offer
PASS  buyer accepts offer → order
PASS  webhook without signature headers rejected
PASS  forged webhook (bad cert URL) rejected
PASS  security headers present
PASS  logout ends session
PASS  login attempts are rate-limited (429)

81 passed, 0 failed
```
