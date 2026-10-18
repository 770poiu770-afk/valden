# PayPal integration

## How it works

```
Cart ──► Checkout (address, delivery method, PayPal) ──► server prices the order from the database
                                                          (unit prices, volume tiers, delivery, VAT)
   Standard delivery (flat rate), normal-size order ──► order AWAITING_PAYMENT → PayPal button shown
   Freight quoted by staff, or order ≥ review threshold ──► PENDING_REVIEW → staff confirm → AWAITING_PAYMENT

 PayPal button ──createOrder──► POST /api/orders/:id/paypal  (server creates PayPal order for the
                                                              server total; PayPal-Request-Id = idempotency key)
 Buyer approves in PayPal popup
 onApprove ─────────────────► POST /api/orders/:id/paypal/capture  (server captures; verifies
                                                              amount, currency and custom_id)
 PayPal ───── webhooks ─────► POST /api/webhooks/paypal  (signature verified via PayPal API,
                                                         stored once per event ID, then applied)
```

- Delivery methods and the flat-rate amount (USD, converted to the order currency) are edited in
  **Admin › Settings › Shipping methods** (`flatRateBaseMinor`, e.g. `1000` = US$10). Orders at or
  above **Review orders from (USD)** still go to staff review before payment.
- Any price, total or status fields sent by the browser are ignored; the order is priced on the server.
- The browser never tells the server an order is paid. Only a server-side capture response or a
  verified webhook can move a payment to `COMPLETED`, and only when the captured amount and currency
  equal what the order expects. A mismatch leaves the order unpaid and flags it for finance.
- Payment records keep `providerOrderId`, `providerCaptureId`, status history and failure reasons
  for reconciliation. Card numbers, CVVs and PayPal passwords never touch the platform.
- Orders above **Settings › Payments › PayPal maximum** must be paid by bank transfer. Buyers can
  switch method while an order is unpaid.

- **Cancellation:** when the buyer cancels or closes the PayPal window, the browser asks
  `POST /api/orders/:id/paypal/cancel`. The server checks the order with PayPal first: only if PayPal
  has not approved it is the attempt closed as `CANCELLED` (nothing charged, order still awaiting
  payment). If PayPal says it *was* approved, the payment is captured and verified instead.
- **Approved but not captured** (browser closed after approval): finance can press **Check with
  PayPal** on the order page (Admin › Orders › order › Payments), which reconciles the attempt with
  PayPal's record and captures it if needed.
- **Double charges:** one open attempt per order; a new attempt is refused once a payment is pending or
  completed; captures use a per-attempt `PayPal-Request-Id`; webhooks are processed once per event
  ID. If a second capture ever arrives for an already-paid order it is logged as
  `duplicate_payment_captured` and flagged on the order for refund.
- **Safety switch:** with `PAYPAL_ENV=live` and `ALLOW_SAMPLE_DATA=true` at the same time, PayPal
  checkout is refused, so real money can never be taken against sample prices or sample FX rates.
- **Secrets:** `PAYPAL_CLIENT_SECRET` is read only on the server. The browser receives only the
  public Client ID (needed by PayPal's button script). `.env` is git-ignored.

Handled webhook events: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `.PENDING`,
`.DENIED`, `.DECLINED`, `.REFUNDED`, `.REVERSED`, `CUSTOMER.DISPUTE.CREATED`, `.UPDATED`, `.RESOLVED`.

## Environment variables (Railway → project `valden` → service `web` → Variables)

`PAYPAL_ENV` picks the key set. Sandbox and Live keys have **different variable names**, so changing
`PAYPAL_ENV` can never pair Live mode with Sandbox keys (Live has no fallback).

| Variable | Sandbox (testing) | Live (real money) |
|---|---|---|
| `PAYPAL_ENV` | `sandbox` (already set) | `live` |
| `PAYPAL_SANDBOX_CLIENT_ID` | Sandbox app Client ID | — |
| `PAYPAL_SANDBOX_CLIENT_SECRET` | Sandbox app Secret | — |
| `PAYPAL_SANDBOX_WEBHOOK_ID` | Sandbox webhook ID | — |
| `PAYPAL_LIVE_CLIENT_ID` | — | Live app Client ID |
| `PAYPAL_LIVE_CLIENT_SECRET` | — | Live app Secret |
| `PAYPAL_LIVE_WEBHOOK_ID` | — | Live webhook ID |
| `ALLOW_SAMPLE_DATA` | `true` (sample catalog) | **must be removed** — Live PayPal is refused while it is `true` |

The older un-prefixed `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID` are still read,
but for Sandbox only. Secrets are typed directly into Railway Variables — never into chat, code,
GitHub or the browser. Only the Client ID is sent to the browser (PayPal's button script needs it).
Admin › Overview shows the current mode and names any missing variable.

## Sandbox setup

1. developer.paypal.com → **Apps & Credentials** → toggle **Sandbox** → **Create App** (Merchant).
   Copy the **Client ID** and **Secret** into Railway (`staging` → `web` → Variables) as
   `PAYPAL_SANDBOX_CLIENT_ID` and `PAYPAL_SANDBOX_CLIENT_SECRET`.
2. In the app → **Webhooks** → **Add Webhook**: URL `https://web-staging-58453.up.railway.app/api/webhooks/paypal`,
   events: the list above (or "All events"). Copy the **Webhook ID** into `PAYPAL_SANDBOX_WEBHOOK_ID`.
3. Railway shows the variable changes as staged — press **Deploy** to apply them.
4. Test with the sandbox **personal** account (developer.paypal.com → **Testing Tools → Sandbox Accounts**):
   place an order with Standard delivery + PayPal, pay, and check the order shows **Paid**;
   start another payment and press **Cancel** in PayPal — the order must stay **Awaiting payment**.

## Going live (only after the sandbox test passes)

1. A verified **PayPal Business** account. developer.paypal.com → **Apps & Credentials** → toggle
   **Live** → **Create App** → copy Live **Client ID** and **Secret** into `PAYPAL_LIVE_CLIENT_ID` and
   `PAYPAL_LIVE_CLIENT_SECRET`.
2. Live app → **Webhooks** → URL `https://<site-domain>/api/webhooks/paypal` → `PAYPAL_LIVE_WEBHOOK_ID`.
3. Load real prices and exchange rates and mark real products as purchasable, then **remove**
   `ALLOW_SAMPLE_DATA` (live payments are refused against sample data, and sample listings stop being
   orderable once it is removed).
4. Set `PAYPAL_ENV=live` and deploy. Recommended: do this in a separate Railway environment
   (e.g. `production`) so `staging` keeps testing with Sandbox.
5. One small real payment and a refund, reconciled in PayPal's activity report, before opening to buyers.

## Limitations

- PayPal decides eligibility, funding sources, limits, holds and fees. Orders above
  **Settings › Payments › PayPal maximum** (default US$100,000) are paid by bank transfer.
- If a buyer approves but closes the browser before capture, finance can press **Check with PayPal**
  on the order page to capture and reconcile it.

## What has and has not been tested

Automated tests use an in-memory PayPal double (create, capture success/pending/declined/
instrument-declined/amount mismatch, cancellation, refunds, webhook verification, duplicates,
disputes), plus HTTP checks against a production build. **No call has yet been made to PayPal's
sandbox or live API** — that needs the credentials above. Treat PayPal as connected only after the
sandbox test in step 4 passes, and as live only after the real low-value payment in "Going live".
