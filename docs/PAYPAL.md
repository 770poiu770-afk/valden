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
  (recorded from the `CHECKOUT.ORDER.APPROVED` webhook); the buyer can return and pay again. An
  automatic server-side capture of approved-but-uncaptured orders is a possible enhancement.

## What has and has not been tested

The PayPal flow is covered by automated tests using an in-memory PayPal double that mimics the
REST responses (create, capture success/pending/declined/instrument-declined/amount mismatch,
refunds, webhook verification results, duplicates, disputes). **No calls were made to PayPal's
sandbox**: no credentials were available and PayPal's API was not reachable from the build
environment. Complete the sandbox steps above before treating PayPal as connected.
