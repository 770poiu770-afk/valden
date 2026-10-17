# Deploying Valden to Railway (PayPal Sandbox staging)

This deploys Valden as a **new, separate Railway project** with a Postgres database, a persistent
volume for verification documents, and a public HTTPS domain — with PayPal in **Sandbox** mode only.

The repository is Railway-ready: `railway.json` selects the Dockerfile build, runs database
migrations as a **pre-deploy command** (a failed migration never receives traffic), starts Next.js on
Railway's `$PORT`, and health-checks `/api/health` (which also checks the database).

---

## 0. Safety rules for an account that already has other projects

- Create a **new project named `valden`**. Never deploy into, link to, or add services to an existing
  project (`the-trial`, `show-fans`).
- Before every dashboard change, check the project name in the top-left breadcrumb reads **valden**.
- Before every CLI command, run `railway status` and confirm it prints `Project: valden`. Only run
  `railway link` / `railway init` **inside the Valden folder**.
- Name the environment **staging** so it is obvious no real payments happen there.
- Keep `PAYPAL_ENV=sandbox` and Sandbox credentials until every item in section 6 passes.

---

## 1. Get the source code into Railway

### Option A — GitHub (recommended: automatic redeploys on push)

1. Unzip `valden-b2b-platform.zip`, then in a terminal:
   ```bash
   cd valden
   git init -b main
   git add -A
   git commit -m "Valden initial import"
   ```
2. On GitHub create a new **private** repository named `valden` (no README / .gitignore).
3. Push:
   ```bash
   git remote add origin git@github.com:<your-github-user>/valden.git
   git push -u origin main
   ```
   `.env` is git-ignored, so no secrets are pushed.
4. In Railway: **New Project → Empty Project**. Rename it to `valden` (project **Settings → General**),
   and rename the environment to `staging` (**Settings → Environments**).
5. Do step 2 below (database) **before** adding the app, so the first deploy can migrate.
6. On the canvas: **Create → GitHub Repo → `<you>/valden`** (grant Railway's GitHub app access to that
   single repo if prompted). Rename the service to `web` (service **Settings → Service Name**).

### Option B — Railway CLI from your computer (no GitHub)

```bash
npm i -g @railway/cli          # or: brew install railway
railway login
cd valden                      # the unzipped project folder
railway init --name valden     # creates a NEW project; does not touch existing ones
railway status                 # must show Project: valden
railway add --database postgres
railway add --service web
railway up --service web       # uploads this folder and builds it
```

---

## 2. PostgreSQL and the documents volume

1. In the `valden` project: **Create → Database → Add PostgreSQL**. Railway deploys it and creates
   variables such as `DATABASE_URL` on the Postgres service.
2. On the **web** service → **Variables**, add a reference (resolves over the private network):
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   (If your database service has a different name, use that name instead of `Postgres`.)
3. Right-click the **web** service → **Attach Volume** → mount path **`/app/uploads`**.
4. Because Railway mounts volumes as root and the image runs as a non-root user, also add
   `RAILWAY_RUN_UID=0` to the web service variables (Railway's documented fix).

No other services are required (no Redis; rate limits and sessions live in Postgres).

---

## 3. Environment variables (web service)

Use **Variables → Raw Editor** and paste, then fill the placeholders:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
APP_URL=https://REPLACE-AFTER-STEP-4.up.railway.app
UPLOAD_DIR=/app/uploads
UPLOAD_MAX_BYTES=10485760
RAILWAY_RUN_UID=0
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=REPLACE_WITH_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=REPLACE_WITH_SANDBOX_SECRET
PAYPAL_WEBHOOK_ID=REPLACE_AFTER_STEP_5
ALLOW_SAMPLE_DATA=true
```

| Variable | Required | Why |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Reference to the Postgres service |
| `NODE_ENV` | Yes | Secure cookies, production guards (also set in the Dockerfile) |
| `APP_URL` | Yes | Links in emails/documents and the CSRF origin check — must exactly match the public domain, `https://`, no trailing slash |
| `UPLOAD_DIR` | Yes | Must equal the volume mount path |
| `RAILWAY_RUN_UID` | Yes (with volume) | Lets the app write to the root-owned volume |
| `PAYPAL_ENV` | Yes | **Keep `sandbox`** on this deployment |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | For PayPal | Sandbox REST app credentials (section 5) |
| `PAYPAL_WEBHOOK_ID` | For PayPal | Without it, every webhook is rejected |
| `ALLOW_SAMPLE_DATA` | Staging only | The seeded catalog and exchange rates are flagged *sample*; production blocks buying them. This flag allows it **for testing only — remove before going live** |
| `SMTP_URL`, `MAIL_FROM` | Optional | e.g. `smtps://user:pass@smtp.provider.com:465`. Without it, emails (incl. password-reset links) appear only in Admin › Email outbox |
| `COMPANY_LEGAL_NAME`, `COMPANY_SUPPORT_EMAIL`, `COMPANY_SUPPORT_PHONE`, `COMPANY_ADDRESS` | Optional | Shown on the site and documents only when set |

Do **not** set `PORT` (Railway provides it), `DISABLE_RATE_LIMIT`, `ADMIN_PASSWORD` or `DEMO_PASSWORD`
as service variables.

After saving, click **Deploy** on the staged changes. Watch **Deployments → View logs**:
build → pre-deploy (`Migrations applied.`) → health check `/api/health` → Active.

---

## 4. Public HTTPS domain, then seed data and the first admin

1. Web service → **Settings → Networking → Public Networking → Generate Domain**. Railway issues an
   `https://<name>.up.railway.app` domain with TLS automatically. If asked for a port, choose the
   one the app listens on (the value of `$PORT`, shown in the logs as `Network: http://0.0.0.0:<port>`).
2. Set `APP_URL` to that exact URL and redeploy.
3. Open `https://<domain>/api/health` → `{"status":"ok"}`.
4. Seed reference data and the sample catalog, and create your admin. With the CLI linked to the
   valden project and web service (`railway status` first!):
   ```bash
   railway ssh -- npm run db:seed
   railway ssh -- sh -c 'ADMIN_PASSWORD="choose-a-strong-password-12+chars" npm run admin:create -- --email you@yourdomain.com --name "Your Name"'
   ```
   The seed is idempotent; `--demo` accounts are refused in production by design.
   Tip: put a space before the second command or clear shell history afterwards, so the password
   is not saved in your shell history.
5. Sign in at `https://<domain>/login` → you land in **/admin**.

(Optional) A custom domain: **Networking → Custom Domain**, add the CNAME record Railway shows at
your DNS provider, then update `APP_URL`.

---

## 5. PayPal Sandbox setup

1. Go to **developer.paypal.com → Apps & Credentials**, switch the toggle to **Sandbox**.
2. **Create App** (type: Merchant). Copy **Client ID** and **Secret** into the Railway variables
   `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`.
3. In the app, **Add Webhook**:
   - URL: `https://<your-domain>/api/webhooks/paypal`
   - Events: `Checkout order approved`, `Payment capture completed`, `Payment capture pending`,
     `Payment capture denied`, `Payment capture declined`, `Payment capture refunded`,
     `Payment capture reversed`, `Customer dispute created`, `Customer dispute updated`,
     `Customer dispute resolved`.
   - Copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`. Deploy the staged variable changes.
4. **Sandbox → Accounts**: note the auto-created **Personal** (buyer) account email; open it and
   view/set its password. This is the PayPal login you'll use at checkout. Never use a real PayPal login.
5. Admin › Dashboard should no longer show "PayPal is not configured".

---

## 6. End-to-end checkout test (Sandbox)

Use a second browser profile or private window for the buyer.

| # | Action | Expected |
| --- | --- | --- |
| 1 | Register a business at `/register` (use a test company, upload any small PDF) | Pending-review page |
| 2 | Admin › Business accounts → open it → **Approve** | Status Approved |
| 3 | Admin › Settings: record a USD→ILS rate with its source (or test in USD). **Temporarily** set Minimum order value to e.g. 1,000 ILS so a small test order is possible | Rate listed as *Recorded*; minimum saved |
| 4 | As buyer: add 20 × a DDR5 memory kit (≈ US$4–5k), checkout in **USD**, **PayPal**, insured freight | Order *Pending review* |
| 5 | Admin › Orders → order → enter freight (e.g. 250.00) → **Confirm order and request payment** | Order *Awaiting payment* |
| 6 | Buyer: open the order → PayPal button → log in with the **sandbox personal** account → pay | "Payment verified" ; order *Paid* |
| 7 | Admin › Payments | Payment *Completed* with PayPal order + capture IDs; webhook `PAYMENT.CAPTURE.COMPLETED` → `capture_completed` |
| 8 | Admin order page → **Issue a refund** of 50.00 | Refund *Completed*; order *Partially refunded*; `PAYMENT.CAPTURE.REFUNDED` event arrives |
| 9 | PayPal dashboard → Webhooks → **Resend** the capture event | Admin › Payments shows `duplicate_ignored` |
| 10 | Failure path: new order, at PayPal choose **Cancel and return** | Order still *Awaiting payment*, nothing charged |
| 11 | Webhook check: `curl -X POST https://<domain>/api/webhooks/paypal -H 'Content-Type: application/json' -d '{}'` | HTTP 400 |
| 12 | Create shipment on the paid order, mark *In transit* | Buyer sees the shipment and status |

Afterwards, restore the minimum order value (₪50,000). Sandbox buyer accounts have a limited test
balance — you can create a Personal sandbox account with a larger balance under Sandbox › Accounts.
PayPal Sandbox limits per transaction differ from live accounts; test large amounts (e.g.
₪300,000) via **bank transfer** (Admin › record verified transfer) unless PayPal has confirmed your
live limits.

---

## 7. Before enabling real payments (a separate, later step)

Only after section 6 passes completely:

1. Create a **new Railway environment** (e.g. `production`) in the valden project, or a new project,
   so staging stays on Sandbox.
2. Use a verified PayPal **Business** account; create a **Live** app and live webhook; set
   `PAYPAL_ENV=live` and the live credentials **only in that environment**.
3. Remove `ALLOW_SAMPLE_DATA`, load verified catalog prices, activate products for sale, record real
   exchange rates, configure SMTP, set `COMPANY_*`, and work through `docs/LAUNCH_CHECKLIST.md`.
4. Set Admin › Settings › Payments › PayPal maximum to the limit PayPal confirms for your account.
5. Run one small live payment and refund, and reconcile it, before inviting buyers.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Pre-deploy fails with `ECONNREFUSED` / no `DATABASE_URL` | Add `DATABASE_URL=${{Postgres.DATABASE_URL}}` on the web service and redeploy |
| Health check fails | View logs; `/api/health` returns 503 if the database is unreachable |
| "Cross-origin request blocked" on every form | `APP_URL` doesn't match the domain you're browsing |
| Document upload fails with `EACCES` | Volume mounted at `/app/uploads` and `RAILWAY_RUN_UID=0` set? |
| PayPal button says "not configured" | Client ID/Secret missing, or not redeployed after setting them |
| Webhooks show `signature_verification_failed` | `PAYPAL_WEBHOOK_ID` doesn't match the webhook in the same Sandbox app |
| Checkout says the exchange rate isn't verified | Record a rate in Admin › Settings, or keep `ALLOW_SAMPLE_DATA=true` on staging |
