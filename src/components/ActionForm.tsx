"use client";
import { useT } from "./client/LocaleProvider";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

type Props = {
  action: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  children: ReactNode;
  className?: string;
  /** "json" serialises fields (supports name="lines[0].qty" paths); "multipart" sends files. */
  encoding?: "json" | "multipart";
  successMessage?: string;
  confirm?: string;
  redirectTo?: string;
  resetOnSuccess?: boolean;
  submitLabel?: string;
  submitClass?: string;
  pendingLabel?: string;
};

function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.replace(/\]/g, "").split(/\.|\[/);
  let cur: Record<string, unknown> = obj;
  parts.forEach((p, i) => {
    const last = i === parts.length - 1;
    const nextIsIndex = !last && /^\d+$/.test(parts[i + 1]);
    if (last) {
      if (p.endsWith("+")) { const k = p.slice(0, -1); cur[k] = [...((cur[k] as unknown[]) ?? []), value]; }
      else cur[p] = value;
    } else {
      cur[p] ??= nextIsIndex ? [] : {};
      cur = cur[p] as Record<string, unknown>;
    }
  });
}

export function formToJson(form: HTMLFormElement) {
  const out: Record<string, unknown> = {};
  const fd = new FormData(form);
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || el.disabled) continue;
    if (el.type === "checkbox") { if (!el.name.endsWith("+")) setPath(out, el.name, el.checked); else if (el.checked) setPath(out, el.name, el.value); continue; }
    if (el.type === "radio") { if (el.checked) setPath(out, el.name, el.value); continue; }
    if (el.type === "file" || el.type === "submit") continue;
    setPath(out, el.name, el.dataset.number !== undefined ? (el.value === "" ? undefined : Number(el.value)) : el.value);
  }
  void fd;
  return out;
}

export function ActionForm({ action, method = "POST", children, className = "", encoding = "json", successMessage, confirm, redirectTo, resetOnSuccess, submitLabel, submitClass = "btn-deep", pendingLabel }: Props) {
  const router = useRouter();
  const t = useT();
  const [state, setState] = useState<{ pending: boolean; error?: string; details?: string[]; ok?: string }>({ pending: false });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirm && !window.confirm(confirm)) return;
    const form = e.currentTarget;
    setState({ pending: true });
    try {
      const body = encoding === "multipart" ? new FormData(form) : JSON.stringify(formToJson(form));
      const res = await fetch(action, { method, body, headers: encoding === "json" ? { "Content-Type": "application/json" } : undefined });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ pending: false, error: data.error ?? t(`Request failed (${res.status}).`, `הבקשה נכשלה (${res.status}).`), details: Array.isArray(data.details) ? data.details : undefined });
        return;
      }
      if (resetOnSuccess) form.reset();
      const to = data.redirect ?? redirectTo;
      setState({ pending: false, ok: data.message ?? successMessage ?? t("Saved.", "נשמר."), details: Array.isArray(data.details) && data.details.length ? data.details : undefined });
      if (to) router.push(to);
      router.refresh();
    } catch {
      setState({ pending: false, error: t("Network error. Check your connection and try again.", "שגיאת רשת. בדקו את החיבור ונסו שוב.") });
    }
  }

  return (
    <form onSubmit={onSubmit} className={className} noValidate={false} {...(method === "POST" ? { method: "post", action, encType: encoding === "multipart" ? "multipart/form-data" : undefined } : { method: "post" })}>
      {children}
      {(state.error || state.ok) && (
        <div role={state.error ? "alert" : "status"} className={`mt-3 rounded border px-3 py-2 text-sm ${state.error ? "border-bad/30 bg-bad-soft text-bad" : "border-ok/30 bg-ok-soft text-ok"}`}>
          {state.error ?? state.ok}
          {state.details && <ul className="mt-1 list-disc ps-5 text-steel">{state.details.map((d, i) => <li key={i}>{d}</li>)}</ul>}
        </div>
      )}
      {submitLabel && (
        <div className="mt-4">
          <button type="submit" className={submitClass} disabled={state.pending}>{state.pending ? pendingLabel ?? t("Working…", "מעבד…") : submitLabel}</button>
        </div>
      )}
    </form>
  );
}

/** A single-button action (e.g. "Approve"), optionally with a confirm prompt. */
export function ActionButton({ action, body, label, className = "btn-outline btn-sm", confirm, method = "POST", redirectTo }: { action: string; body?: Record<string, unknown>; label: string; className?: string; confirm?: string; method?: "POST" | "DELETE"; redirectTo?: string }) {
  const router = useRouter();
  const t = useT();
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-col">
      <button type="button" className={className} disabled={pending} onClick={async () => {
        if (confirm && !window.confirm(confirm)) return;
        setPending(true); setErr(null);
        const res = await fetch(action, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
        const data = await res.json().catch(() => ({}));
        setPending(false);
        if (!res.ok) { setErr(data.error ?? t("Failed", "נכשל")); return; }
        if (data.redirect ?? redirectTo) router.push(data.redirect ?? redirectTo);
        router.refresh();
      }}>{pending ? t("Working…", "מעבד…") : label}</button>
      {err && <span role="alert" className="mt-1 text-xs text-bad">{err}</span>}
    </span>
  );
}
