# PayPal integration

## How it works

```
Buyer places order ──► staff confirm (availability, freight, risk) ──► order AWAITING_PAYMENT
                                                                         │
 PayPal button ──createOrder──► POST /api/orders/:id/paypal  (server creates PayPal order;
                                                              PayPal-Request-Id = idempotency key)
 Buyer approves in PayPal popup
 onApprove ─────────────────► POST /api/orders/:id/paypal/capture  (server captures; verifies
                                                              amount, currency and custom_id)
 PayPal ───── webhooks ─────► POST /api/webhooks/paypal  (signature verified via PayPal API,
                                                         stored once per event ID, then applied)
```

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

## Sandbox setup

1. Sign in at developer.paypal.com and open **Apps & Credentials** in **Sandbox** mode.
2. Create a REST app. Copy the **Client ID** and **Secret** into `.env`:
   `PAYPAL_ENV=sandbox`, `PAYPAL_CLIENT_ID=…`, `PAYPAL_CLIENT_SECRET=…`.
3. In the app, add a webhook pointing to `https://<your-host>/api/webhooks/paypal` (PayPal must be
   able to reach it — use a deployed preview or a tunnel for local testing). Subscribe to the events
   listed above. Copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`.
4. Use the sandbox **personal** test account (Sandbox › Accounts) to pay. Restart the app after
   changing environment variables.
5. Test: place an order as an approved buyer, confirm it in Admin › Orders, pay from the order page,
   then check Admin › Payments for the capture and the webhook events. Issue a partial refund from
   the order page and confirm the `PAYMENT.CAPTURE.REFUNDED` event arrives.
6. Use the webhook simulator in the developer dashboard to send a duplicate event and confirm the
   second delivery is recorded as `duplicate_ignored`.

## Connecting your real PayPal Business account (later, after Sandbox testing passes)

Do this only after the Sandbox test plan in `docs/RAILWAY.md` §6 passes completely.

1. Open or upgrade to a **PayPal Business** account in the name of your registered company, and
   complete PayPal's business verification (company documents, bank account, identity checks).
2. At developer.paypal.com, sign in with that business account, switch **Apps & Credentials** to
   **Live**, and create an app. Copy the live **Client ID** and **Secret**.
3. Create a **separate Railway environment** (e.g. `production`) so staging keeps using Sandbox.
   In that environment's `web` service **Variables**, enter yourself (never in chat or in GitHub):
   `PAYPAL_ENV=live`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`. Remove `ALLOW_SAMPLE_DATA`.
4. In the live app, add a webhook to `https://<your-live-domain>/api/webhooks/paypal` with the events
   listed above, and set `PAYPAL_WEBHOOK_ID` to its ID.
5. Load verified prices and real exchange rates, then run one small real payment and a refund, and
   reconcile both in PayPal's activity report before inviting buyers.

## Production configuration

1. Use a verified PayPal **Business** account in the country of your legal entity.
2. Create a **Live** REST app; set `PAYPAL_ENV=live` with the live Client ID and Secret.
3. Create a live webhook (same URL and events) and set its ID in `PAYPAL_WEBHOOK_ID`.
4. Confirm with PayPal, in writing, the per-transaction and monthly limits for your account and
   currencies (USD, EUR, ILS), and set **Settings › Payments › PayPal maximum** accordingly.
5. Run one small live transaction end-to-end, refund it, and reconcile against the PayPal activity
   report before opening to buyers.

## Limitations to be aware of

- PayPal decides account eligibility, available funding sources, limits, holds and fees. It may
  decline, hold or review large transactions regardless of this platform's settings. A ₪300,000 order
  should be expected to need bank transfer unless PayPal has confirmed otherwise.
- Not every buyer can pay by card without a PayPal account; that depends on PayPal's rules for the
  buyer's country and your merchant configuration.
- If a buyer approves a payment but closes the browser before capture, the payment stays `APPROVED`
  (recorded from the `CHECKOUT.ORDER.APPROVED` webhook) until finance uses **Check with PayPal**,
  or the buyer returns and cancels/retries. Automatic scheduled reconciliation is a possible
  enhancement.

## What has and has not been tested

The PayPal flow is covered by automated tests using an in-memory PayPal double that mimics the
REST responses (create, capture success/pending/declined/instrument-declined/amount mismatch,
refunds, webhook verification results, duplicates, disputes). **No calls were made to PayPal's
sandbox**: no credentials were available and PayPal's API was not reachable from the build
environment. Complete the sandbox steps above before treating PayPal as connected.
