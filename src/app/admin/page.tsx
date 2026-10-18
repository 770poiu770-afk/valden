import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { paypal } from "@/server/paypal";
import { getRates } from "@/lib/fx";
import { Money, Notice, PageHeader, Stat, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin dashboard" };

const q = async <T,>(s: ReturnType<typeof sql>) => (await db.execute(s)).rows[0] as T;

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const a = await requireStaff();
  const [cos, ord, sales, quotesOpen, flags, pays, recent, rates] = await Promise.all([
    q<{ pending: number; approved: number; info: number }>(sql`SELECT count(*) FILTER (WHERE status='PENDING_REVIEW')::int pending, count(*) FILTER (WHERE status='APPROVED')::int approved, count(*) FILTER (WHERE status='MORE_INFO_REQUIRED')::int info FROM companies`),
    q<{ review: number; awaiting: number; fulfil: number; risk: number }>(sql`SELECT count(*) FILTER (WHERE status='PENDING_REVIEW')::int review, count(*) FILTER (WHERE status='AWAITING_PAYMENT')::int awaiting, count(*) FILTER (WHERE status IN ('PAID','PROCESSING','PARTIALLY_SHIPPED'))::int fulfil, count(*) FILTER (WHERE risk_status='PENDING_REVIEW')::int risk FROM orders`),
    q<{ paid30: string; count30: number; avg: string | null }>(sql`SELECT coalesce(sum(subtotal_base_cents),0)::text paid30, count(*)::int count30, avg(subtotal_base_cents)::bigint::text avg FROM orders WHERE payment_status IN ('PAID','PARTIALLY_REFUNDED') AND created_at > now() - interval '30 days'`),
    q<{ n: number; offered: number }>(sql`SELECT count(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_REVIEW'))::int n, count(*) FILTER (WHERE status='OFFERED')::int offered FROM quotes`),
    q<{ review: number; fallback: number; sample: number; active: number }>(sql`SELECT count(*) FILTER (WHERE pricing_flag='NEEDS_REVIEW')::int review, count(*) FILTER (WHERE pricing_flag='FALLBACK_POLICY')::int fallback, count(*) FILTER (WHERE reference_is_sample)::int sample, count(*) FILTER (WHERE purchasable)::int active FROM products`),
    q<{ pending: number; disputed: number; mismatch: number }>(sql`SELECT count(*) FILTER (WHERE status='PENDING')::int pending, count(*) FILTER (WHERE status='DISPUTED')::int disputed, count(*) FILTER (WHERE failure_reason LIKE 'Verification mismatch%')::int mismatch FROM payments`),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(12),
    getRates(),
  ]);
  const sampleFx = Object.values(rates).some((r) => r?.isSample);
  return (
    <div className="space-y-8">
      <PageHeader title="Trade desk overview" intro={`Signed in as ${a.fullName}. Figures are calculated live from the database.`} />
      {(await searchParams).denied && <Notice tone="bad">Your role does not include access to that page.</Notice>}
      <div className="space-y-2">
        {!paypal().isConfigured() && <Notice tone="warn" title="PayPal is not configured">Set PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET and PAYPAL_WEBHOOK_ID. Until then, buyers can only pay by bank transfer.</Notice>}
        {paypal().isConfigured() && (
          <Notice tone={process.env.PAYPAL_ENV === "live" ? "warn" : "info"} title={process.env.PAYPAL_ENV === "live" ? "PayPal mode: LIVE — real payments" : "PayPal mode: Sandbox — test payments only"}>
            {process.env.PAYPAL_ENV === "live"
              ? (process.env.ALLOW_SAMPLE_DATA === "true" ? "PayPal checkout is blocked because ALLOW_SAMPLE_DATA is set. Remove it before taking real payments." : "Payments are charged to real buyer accounts.")
              : "No real money is charged. Use PayPal sandbox buyer accounts to test."}
          </Notice>
        )}
        {paypal().isConfigured() && !process.env.PAYPAL_WEBHOOK_ID && <Notice tone="bad" title="PAYPAL_WEBHOOK_ID is missing">Every PayPal webhook will be rejected, so refunds made in PayPal, pending payments and disputes will not update orders. Add the Webhook ID from the same PayPal app.</Notice>}
        {sampleFx && <Notice tone="warn" title="Sample exchange rates in use">Record verified rates in <Link className="link" href="/admin/settings">Settings</Link>. Production refuses non-USD checkout on sample rates.</Notice>}
        {flags.sample > 0 && <Notice tone="info" title={`${flags.sample} products still use sample reference prices`}>Replace them with verified benchmarks via <Link className="link" href="/admin/pricing">Pricing</Link> (CSV import) before launch. {flags.active} products are activated for sale.</Notice>}
      </div>
      <section>
        <h2 className="wide mb-3 text-lg">Needs attention</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Link href="/admin/companies?status=PENDING_REVIEW"><Stat label="Accounts awaiting review" value={cos.pending} sub={`${cos.info} awaiting more information`} /></Link>
          <Link href="/admin/orders?status=PENDING_REVIEW"><Stat label="Orders pending review" value={ord.review} sub={`${ord.risk} flagged by risk rules`} /></Link>
          <Link href="/admin/quotes"><Stat label="Quote requests to answer" value={quotesOpen.n} sub={`${quotesOpen.offered} offers outstanding`} /></Link>
          <Link href="/admin/payments"><Stat label="Payments needing review" value={pays.pending + pays.disputed} sub={`${pays.disputed} disputed, ${pays.mismatch} mismatched`} /></Link>
        </div>
      </section>
      <section>
        <h2 className="wide mb-3 text-lg">Commercial</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Paid order value, 30 days (USD)" value={<Money cents={BigInt(sales.paid30)} currency="USD" />} sub={`${sales.count30} orders`} />
          <Stat label="Average paid order (USD)" value={sales.avg ? <Money cents={BigInt(sales.avg)} currency="USD" /> : "—"} />
          <Stat label="Orders awaiting payment" value={ord.awaiting} />
          <Stat label="Orders in fulfillment" value={ord.fulfil} />
          <Stat label="Approved accounts" value={cos.approved} />
          <Link href="/admin/pricing"><Stat label="Prices needing review" value={flags.review} sub={`${flags.fallback} on fallback policy`} /></Link>
        </div>
      </section>
      {a.permissions.has("audit.view") && (
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="wide text-lg">Recent activity</h2><Link className="link text-sm" href="/admin/audit">Audit log</Link></div>
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table"><table className="tbl"><tbody>{recent.map((r) => <tr key={r.id}><td className="whitespace-nowrap text-xs text-steel-500">{fmtDate(r.createdAt, true)}</td><td className="font-medium">{r.action}</td><td>{r.actorEmail ?? "system"}</td><td className="text-xs text-steel-500">{r.entityType} {r.entityId?.slice(0, 8)}</td></tr>)}</tbody></table></div>
        </section>
      )}
    </div>
  );
}
