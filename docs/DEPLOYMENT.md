# Deployment

## Requirements

- Node.js 22 and PostgreSQL 16 (managed Postgres recommended).
- A persistent volume or object storage for verification documents (`UPLOAD_DIR`).
- HTTPS in front of the app (session cookies are `Secure` in production).
- An SMTP account for transactional email.

## Environment variables

See `.env.example`. Required in production:

| Variable | Notes |
| --- | --- |
| `NODE_ENV=production` | Enables secure cookies, hides template notices, blocks sample data |
| `APP_URL` | Public origin, e.g. `https://trade.example.com` — used for links and CSRF checks |
| `DATABASE_URL` | Postgres connection string (use TLS for managed databases) |
| `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID` | See `docs/PAYPAL.md` |
| `UPLOAD_DIR` | Writable, persistent, **not** publicly served |
| `SMTP_URL`, `MAIL_FROM` | e.g. `smtps://user:pass@smtp.provider.com:465` |
| `COMPANY_LEGAL_NAME`, `COMPANY_SUPPORT_EMAIL`, `COMPANY_SUPPORT_PHONE`, `COMPANY_ADDRESS` | Shown in footer, contact page and documents only when set |

Never set `ALLOW_SAMPLE_DATA=true` in a real production deployment. It exists so a production build
can be demonstrated locally with the sample catalog and sample exchange rates.

## Option A — Docker

```bash
docker build -t valden .
docker run -d --env-file .env -p 3000:3000 -v valden-uploads:/app/uploads valden
```

The container applies migrations on start, then runs `next start`. `docker-compose.yml` runs the app
with a local Postgres for production-like testing.

## Option B — a Node host (Railway, Render, Fly.io, a VM)

1. Provision Postgres and set the variables above.
2. Build: `npm ci && npm run build`.
3. Release step: `npm run db:migrate`.
4. Start: `npm start` (listens on port 3000; set `PORT`/proxy as your host requires).
5. Attach a persistent volume at `UPLOAD_DIR`, or replace `src/server/uploads.ts` with an
   S3-compatible implementation before scaling to more than one instance.

## First-time setup

```bash
npm run db:migrate
npm run db:seed                      # reference data and sample catalog (omit --demo in production)
ADMIN_PASSWORD='…' npm run admin:create -- --email ops@yourco.com --name "Operations Lead"
```

Then sign in at `/login`, and in **Admin › Settings** record verified exchange rates, confirm tax
rules, the minimum order value, the PayPal maximum and bank-transfer instructions. Add further staff
in **Admin › Users** — they receive a single-use link to set their own password.

To replace the sample catalog, import your own data (see `docs/CATALOG.md`) and deactivate sample
listings, or start from an empty catalog by skipping the seed's catalog step.

## Admin accounts

- Create the first super administrator with `npm run admin:create` on the server. If
  `ADMIN_PASSWORD` is not set, a strong password is generated and printed once.
- No credentials are stored in the repository. Rotate any password that was shared during setup.
- Staff roles: Super admin, Sales desk, Catalog & pricing, Finance, Fulfillment. Adjust permissions
  in **Admin › Roles & permissions** (super admins only).

## Database backups

- Enable automated daily snapshots with point-in-time recovery (PITR) on your managed Postgres;
  keep at least 30 days.
- Take a logical backup before each deployment that includes migrations:
  `pg_dump --format=custom --no-owner "$DATABASE_URL" > valden-$(date +%F).dump`
- Store backups encrypted, in a different region/account from the database.
- Back up `UPLOAD_DIR` (or enable versioning on the object-storage bucket) on the same schedule.
- Test a restore into a staging database at least quarterly:
  `pg_restore --clean --no-owner -d "$STAGING_DATABASE_URL" valden-YYYY-MM-DD.dump`

## Operations

- Logs are JSON lines on stdout/stderr; ship them to your log platform. Secrets, tokens and
  passwords are redacted by the logger.
- Rate limits are stored in Postgres (`rate_limits`), so they work across instances. Old rows can be
  pruned with `DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`.
- Expired sessions: `DELETE FROM sessions WHERE expires_at < now()` (daily).
- If SMTP delivery fails, messages stay in the outbox with status `FAILED`; inspect them in
  **Admin › Email outbox**.
