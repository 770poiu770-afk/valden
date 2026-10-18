import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { businessDocuments, companyStatusEvents, orders, quotes } from "@/db/schema";
import { currentActor } from "@/server/http";
import { cartCount } from "@/server/cart";
import { expireQuotes } from "@/server/quotes";
import { Empty, Money, Notice, PageHeader, Stat, StatusPill, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const actor = await currentActor();
  if (!actor?.companyId) redirect("/login");
  const sp = await searchParams;

  if (actor.companyStatus !== "APPROVED") {
    const [events, docs] = await Promise.all([
      db.select().from(companyStatusEvents).where(eq(companyStatusEvents.companyId, actor.companyId)).orderBy(desc(companyStatusEvents.createdAt)),
      db.select().from(businessDocuments).where(eq(businessDocuments.companyId, actor.companyId)).orderBy(desc(businessDocuments.createdAt)),
    ]);
    const s = actor.companyStatus;
    const latestReason = events.find((e) => e.toStatus === s)?.reason;
    const steps = [
      { label: "Application submitted", done: true },
      { label: "Verification by our trade desk", done: false, current: s === "PENDING_REVIEW" || s === "MORE_INFO_REQUIRED" },
      { label: "Wholesale access enabled", done: false },
    ];
    return (
      <div className="space-y-6">
        <PageHeader title={s === "REJECTED" ? "Application not approved" : s === "SUSPENDED" ? "Account suspended" : "Your application is under review"}
          intro={s === "PENDING_REVIEW" ? "We review every trade application manually. You will receive an email when pricing and ordering are enabled." : undefined} />
        {sp.registered && <Notice tone="ok" title="Application received">Thank you. Your company details and documents have been submitted.</Notice>}
        {s === "MORE_INFO_REQUIRED" && <Notice tone="warn" title="More information needed">{latestReason ?? "Please check your email for details."} Upload additional documents from <Link className="link" href="/portal/company">Company & addresses</Link>.</Notice>}
        {(s === "REJECTED" || s === "SUSPENDED") && <Notice tone="bad">{latestReason ?? "Contact the trade desk for details."} <Link className="link" href="/contact?topic=Trade+account">Contact the trade desk</Link>.</Notice>}
        {(s === "PENDING_REVIEW" || s === "MORE_INFO_REQUIRED") && (
          <ol className="grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-3">
            {steps.map((st, i) => (
              <li key={st.label} className={`p-5 ${st.current ? "bg-tag-soft" : "bg-white"}`}>
                <span className={`num mb-2 flex h-7 w-7 items-center justify-center rounded-sm text-sm font-bold ${st.done ? "bg-ok text-white" : st.current ? "bg-deep text-white" : "bg-paper text-steel-500 border border-line"}`}>{st.done ? "✓" : i + 1}</span>
                <p className="font-semibold text-deep-900">{st.label}</p>
                {st.current && <p className="text-sm text-steel-500">In progress</p>}
              </li>
            ))}
          </ol>
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold">Verification history</h2>
            <ul className="space-y-3 text-sm">{events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3"><div><StatusPill status={e.toStatus} />{e.reason && <p className="mt-1 text-steel-500">{e.reason}</p>}</div><span className="shrink-0 text-xs text-steel-500">{fmtDate(e.createdAt, true)}</span></li>
            ))}</ul>
          </section>
          <section className="panel panel-pad">
            <h2 className="mb-3 font-semibold">Documents submitted</h2>
            <ul className="space-y-2 text-sm">{docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3"><span>{d.docType}<span className="block text-xs text-steel-500">{d.originalName}</span></span><StatusPill status={d.status === "ACCEPTED" ? "ACCEPTED_DOC" : d.status} label={d.status === "PENDING" ? "Awaiting review" : undefined} /></li>
            ))}</ul>
            <Link href="/portal/company" className="btn-outline btn-sm mt-4">Upload another document</Link>
          </section>
        </div>
        <p className="text-sm text-steel-500">While you wait, you can <Link href="/catalog" className="link">browse the catalog</Link> — prices appear once you are approved.</p>
      </div>
    );
  }

  await expireQuotes();
  const [recent, open, offers, lines] = await Promise.all([
    db.select().from(orders).where(eq(orders.companyId, actor.companyId)).orderBy(desc(orders.placedAt)).limit(6),
    db.select({ id: orders.id, status: orders.status }).from(orders).where(and(eq(orders.companyId, actor.companyId), inArray(orders.status, ["PENDING_REVIEW", "AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED"]))),
    db.select().from(quotes).where(and(eq(quotes.companyId, actor.companyId), inArray(quotes.status, ["SUBMITTED", "UNDER_REVIEW", "OFFERED"]))).orderBy(desc(quotes.updatedAt)),
    cartCount(actor.userId),
  ]);
  const awaiting = open.filter((o) => o.status === "AWAITING_PAYMENT").length;
  const liveOffers = offers.filter((q) => q.status === "OFFERED");
  return (
    <div className="space-y-8">
      <PageHeader title={`Welcome back, ${actor.fullName.split(" ")[0]}`} actions={<><Link href="/portal/bulk" className="btn-outline">Bulk order builder</Link><Link href="/catalog" className="btn-deep">Browse catalog</Link></>} />
      {awaiting > 0 && <Notice tone="warn" title={`${awaiting} order${awaiting > 1 ? "s" : ""} awaiting payment`}>Confirmed orders are held until payment is verified. <Link className="link" href="/portal/orders">View orders</Link></Notice>}
      {liveOffers.length > 0 && <Notice tone="info" title="Offers waiting for your decision">{liveOffers.map((q) => <span key={q.id} className="mr-3"><Link className="link" href={`/portal/quotes/${q.id}`}>{q.number}</Link> (expires {fmtDate(q.offerExpiresAt)})</span>)}</Notice>}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open orders" value={open.length} />
        <Stat label="Awaiting payment" value={awaiting} />
        <Stat label="Open quote requests" value={offers.length} sub={`${liveOffers.length} with offers`} />
        <Stat label="Lines in cart" value={lines} />
      </div>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="wide text-lg">Recent orders</h2><Link className="link text-sm" href="/portal/orders">All orders</Link></div>
        {recent.length === 0 ? <Empty title="No orders yet" action={<Link className="btn-deep" href="/catalog">Start an order</Link>}>Add products from the catalog or paste a SKU list into the bulk order builder.</Empty> : (
          <div className="panel overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="tbl"><thead><tr><th>Order</th><th>Placed</th><th>Status</th><th>Payment</th><th className="text-right">Total</th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id}><td><Link className="link" href={`/portal/orders/${o.id}`}>{o.number}</Link></td><td>{fmtDate(o.placedAt)}</td><td><StatusPill status={o.status} /></td><td><StatusPill status={o.paymentStatus} /></td><td className="text-right"><Money cents={o.totalCents} currency={o.currency} /></td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
