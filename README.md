# Valden — B2B wholesale electronics platform

Valden is a business-to-business wholesale platform for high-value electronics. Verified companies
register, are approved by staff, then see wholesale pricing, build bulk orders or request negotiated
quotations, and pay by PayPal or verified bank transfer. Staff run approvals, catalog, pricing,
quotes, orders, payments, refunds and manual fulfillment from an admin portal.

> **Status:** application complete and tested locally (see `docs/TEST_RESULTS.md`). It is **not
> deployed**, **PayPal is not connected** (no merchant credentials have been configured or tested
> against PayPal), and the catalog contains **sample data** — not live supplier feeds.

## Stack

| Layer | Choice |
| --- | --- |
| Web | Next.js 15 (App Router, React 19, server components), TypeScript |
| Styling | Tailwind CSS 3, self-hosted Archivo variable font |
| Database | PostgreSQL 16, Drizzle ORM, SQL migrations in `drizzle/` |
| Auth | Email + password (bcrypt, cost 12), DB-backed sessions (SHA-256-hashed tokens, httpOnly cookie) |
| Validation | Zod on every API input |
| Payments | PayPal REST v2 (Orders, Payments, Webhooks) — server-side only |
| Tests | Vitest integration tests on a real Postgres DB; HTTP end-to-end smoke test |

Prisma was the first choice but its engine binaries could not be downloaded in the build
environment; Drizzle provides the same typed-ORM + migrations role with no native binaries.

## Quick start (development)

```bash
# 1. Postgres 16 running locally, then:
cp .env.example .env                     # set DATABASE_URL
npm install
npm run db:migrate                       # apply migrations
npm run db:seed -- --demo                # reference data + 337-listing sample catalog + demo buyers
ADMIN_PASSWORD='choose-a-strong-one-1' npm run admin:create -- --email you@company.com --name "Your Name"
npm run dev                              # http://localhost:3000
```

`--demo` creates three fictional buyers (two approved, one pending). Set `DEMO_PASSWORD` to choose
their password; otherwise one is generated and printed once. Demo accounts are refused when
`NODE_ENV=production`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development, production build, production server |
| `npm run db:generate` | Generate a new SQL migration after editing `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (also run automatically by the Docker image) |
| `npm run db:seed [-- --demo]` | Seed roles, permissions, categories, settings, sample FX rates and the catalog |
| `npm run catalog:generate` | Rebuild `data/catalog.json` from the typed definitions in `scripts/catalog/` |
| `npm run admin:create -- --email … --name … [--role …]` | Create or reset a staff account |
| `npm test` | Vitest integration + unit tests (uses a separate `valden_test` database) |
| `npm run test:e2e` | HTTP smoke test against a running server (`E2E_ADMIN_PASSWORD` required) |

## Project layout

```
src/
  app/(site)/        public site: home, catalog, product pages, registration, login, policies
  app/portal/        approved-buyer portal: dashboard, cart, checkout, orders, quotes, company
  app/admin/         staff portal (permission-gated per page)
  app/documents/     printable order confirmation, pro-forma invoice, packing list
  app/api/           route handlers (auth, cart, orders, quotes, PayPal, webhooks, admin dispatcher)
  db/schema.ts       normalized schema (37 tables)
  lib/               money (integer minor units), pricing rules, RBAC, auth, settings, FX, audit, logging
  server/            services: accounts, catalog, pricing engine, cart, orders, quotes, payments, PayPal gateway
scripts/             migrate, seed, catalog generator, admin creation, e2e smoke test
data/catalog.json    generated sample catalog (337 listings, 748 SKUs)
tests/               Vitest suites
docs/                deployment, PayPal, catalog, launch checklist, test results, brand notes
```

## Feature inventory

Fully implemented and covered by automated tests:

- **Business accounts:** registration with company, tax/registration numbers, purchasing contact,
  billing/delivery addresses and document upload (PDF/PNG/JPEG, magic-byte checked, stored outside
  the web root); pending-approval experience; approve / reject / request more info / suspend /
  reinstate with reasons, history and emails; document review; buyer users added by staff.
- **Access control:** roles and permissions stored in the database (2 buyer roles, 5 staff roles),
  editable matrix, server-side checks on every page and API; buyer permissions only while the company
  is approved; strict company isolation (404 on other companies' orders, quotes, documents, addresses).
- **Catalog:** 337 distinct listings / 748 SKUs across 14 categories with specs, condition, variants,
  region notes, MOQ, order increments, case/carton/pallet fields, availability status, lead time,
  warranty, origin, shipping restrictions, staff-only supplier SKU and notes; search, filters
  (manufacturer, category, condition, availability, MOQ, storage, memory, CPU, GPU, refresh rate,
  price for entitled users), sorting, pagination, comparison, saved products.
- **Pricing:** reference market price with source, verification date and sample flag; observation
  history; configurable flat premium (default US$350 within a US$300–400 band) applied only where it
  stays within a maximum share of the reference; explicit fallback policy or manual review otherwise;
  per-product markup; admin override; quantity tiers from a configurable schedule; contract prices
  per company; CSV price export/import; bulk recalculation. All money is integer minor units.
- **Currencies:** USD (base), EUR, ILS with staff-recorded exchange rates (source + effective date);
  rate snapshotted on each order; production refuses sample rates.
- **Ordering:** persistent server-side cart, bulk order builder (paste SKU lists), server-side
  pricing and validation (MOQ, increments, availability), configurable minimum order value
  (default ₪50,000), PO numbers, delivery instructions, Incoterms and export-document fields, tax by
  delivery country, order review/risk rules, freight entered by staff, cancellation, order
  documents, buyer-visible timeline.
- **Quotations:** request with target prices, staff offer with per-line prices, freight and expiry,
  accept-to-order in one transaction, decline/withdraw, automatic expiry.
- **Payments:** PayPal server-side create and capture with idempotency keys, amount/currency/order
  verification, pending/failed/declined/instrument-declined handling, webhook signature verification
  through PayPal's API, duplicate-event protection, refunds (partial/full, dashboard refunds recorded
  from webhooks), disputes and reversals; configurable PayPal order cap with bank-transfer path;
  finance-recorded verified bank transfers; payment status separate from order status.
- **Fulfillment:** manual shipments (multiple per order, partial quantities), carrier, tracking,
  packages, weight, freight cost, insured value, special handling, provisional vs confirmed estimates;
  order status derived from shipments.
- **Operations:** audit log of sensitive actions, structured JSON logs with secret redaction,
  Postgres-backed rate limiting, CSRF origin checks, security headers (CSP, frame denial, HSTS),
  email outbox with optional SMTP delivery.

Railway deployment: `docs/RAILWAY.md`. See `docs/LAUNCH_CHECKLIST.md` for what must happen before going live and the list of external
dependencies.
