import type { ReactNode } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";

export function Money({ cents, currency, className = "" }: { cents: bigint | number | string | null | undefined; currency: string; className?: string }) {
  if (cents === null || cents === undefined) return <span className={className}>—</span>;
  const v = typeof cents === "string" ? BigInt(cents) : cents;
  return <span className={`num ${className}`}>{formatMoney(v, currency)}</span>;
}

const TONES = {
  ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", bad: "bg-bad-soft text-bad", info: "bg-info-soft text-info",
  muted: "bg-paper text-steel-500 border border-line", tag: "bg-tag-soft text-[#6B5200]", deep: "bg-deep text-white",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "muted", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}>{children}</span>;
}

const STATUS_TONE: Record<string, Tone> = {
  APPROVED: "ok", PENDING_REVIEW: "warn", MORE_INFO_REQUIRED: "warn", REJECTED: "bad", SUSPENDED: "bad",
  AWAITING_PAYMENT: "tag", PAID: "ok", PROCESSING: "info", PARTIALLY_SHIPPED: "info", SHIPPED: "info", DELIVERED: "ok", CANCELLED: "muted",
  UNPAID: "muted", PENDING: "warn", FAILED: "bad", PARTIALLY_REFUNDED: "warn", REFUNDED: "muted", DISPUTED: "bad",
  SUBMITTED: "warn", UNDER_REVIEW: "info", OFFERED: "tag", ACCEPTED: "ok", DECLINED: "muted", EXPIRED: "muted", CONVERTED: "ok",
  CREATED: "muted", COMPLETED: "ok", DECLINED_PAYMENT: "bad", REVERSED: "bad", NOT_REQUIRED: "muted",
  PREPARING: "warn", READY: "info", IN_TRANSIT: "info", EXCEPTION: "bad", ACCEPTED_DOC: "ok",
  NONE: "ok", NEEDS_REVIEW: "bad", FALLBACK_POLICY: "warn", OVERRIDE: "info", QUEUED: "muted",
};
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const text = label ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");
  return <Badge tone={STATUS_TONE[status] ?? "muted"}>{text}</Badge>;
}

export function PageHeader({ title, intro, actions, back }: { title: string; intro?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {back && <Link href={back.href} className="mb-2 inline-block text-sm text-steel-500 hover:text-deep">‹ {back.label}</Link>}
        <h1 className="wide text-2xl sm:text-[28px]">{title}</h1>
        {intro && <div className="mt-1.5 max-w-[70ch] text-steel-500">{intro}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-start gap-3 px-6 py-10">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <div className="max-w-[60ch] text-steel-500">{children}</div>}
      {action}
    </div>
  );
}

export function Notice({ tone = "info", title, children }: { tone?: "info" | "warn" | "bad" | "ok"; title?: string; children: ReactNode }) {
  const c = { info: "border-info/30 bg-info-soft", warn: "border-warn/30 bg-warn-soft", bad: "border-bad/30 bg-bad-soft", ok: "border-ok/30 bg-ok-soft" }[tone];
  return (
    <div className={`rounded border px-4 py-3 text-sm ${c}`} role={tone === "bad" ? "alert" : "status"}>
      {title && <p className="mb-0.5 font-semibold text-deep-900">{title}</p>}
      <div className="text-steel">{children}</div>
    </div>
  );
}

export function Field({ label, name, hint, children, className = "" }: { label: string; name?: string; hint?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={name}>{label}</label>
      {children}
      {hint && <p className="field-hint">{hint}</p>}
    </div>
  );
}

export function DL({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 gap-y-2 text-sm">
      {rows.map(([k, v], i) => (<div key={i} className="contents"><dt className="text-steel-500">{k}</dt><dd className="text-steel">{v ?? "—"}</dd></div>))}
    </dl>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="panel px-5 py-4">
      <p className="text-[13px] text-steel-500">{label}</p>
      <p className="num mt-1 text-2xl font-bold text-deep-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-steel-500">{sub}</p>}
    </div>
  );
}

export const fmtDate = (d: Date | string | null | undefined, withTime = false) =>
  d ? new Date(d).toLocaleString("en-GB", withTime ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" } : { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) + (withTime ? " UTC" : "") : "—";
