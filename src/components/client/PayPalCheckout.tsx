"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

declare global { interface Window { paypal?: { Buttons: (o: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void>; isEligible: () => boolean } } } }

/**
 * PayPal Smart Buttons. The browser only relays approval; the order is created and captured
 * server-side, and our server — not this component — decides whether the order is paid.
 */
export function PayPalCheckout({ orderId, clientId, currency }: { orderId: string; clientId: string; currency: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "info"; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons`;
    let script = document.querySelector<HTMLScriptElement>(`script[data-pp="${currency}"]`);
    const render = () => {
      if (!window.paypal || !ref.current) return;
      ref.current.innerHTML = "";
      window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay" },
        createOrder: async () => {
          setMsg(null);
          const r = await fetch(`/api/orders/${orderId}/paypal`, { method: "POST" });
          const d = await r.json();
          if (!r.ok) { setMsg({ tone: "bad", text: d.error ?? "Could not start PayPal payment." }); throw new Error(d.error); }
          return d.paypalOrderId;
        },
        onApprove: async (data: { orderID: string }, actions: { restart: () => void }) => {
          setMsg({ tone: "info", text: "Confirming payment with PayPal…" });
          const r = await fetch(`/api/orders/${orderId}/paypal/capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) });
          const d = await r.json();
          if (!r.ok) { setMsg({ tone: "bad", text: d.error ?? "Payment could not be completed." }); router.refresh(); return; }
          if (d.status === "INSTRUMENT_DECLINED") { setMsg({ tone: "bad", text: "Your funding source was declined. Choose another in PayPal." }); return actions.restart(); }
          if (d.status === "COMPLETED") setMsg({ tone: "ok", text: "Payment verified. Thank you." });
          else if (d.status === "PENDING" || d.status === "MISMATCH") setMsg({ tone: "info", text: "PayPal reports the payment as pending. We will update the order when PayPal confirms it." });
          else setMsg({ tone: "bad", text: "PayPal declined the payment. No funds were taken." });
          router.refresh();
        },
        onCancel: async (data: { orderID?: string }) => {
          setMsg({ tone: "info", text: "Payment cancelled. Nothing was charged; your order is still awaiting payment." });
          if (data?.orderID) {
            await fetch(`/api/orders/${orderId}/paypal/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) }).catch(() => undefined);
            router.refresh();
          }
        },
        onError: () => setMsg({ tone: "bad", text: "PayPal encountered an error. Please try again or switch to bank transfer." }),
      }).render(ref.current).then(() => setLoaded(true)).catch(() => setMsg({ tone: "bad", text: "PayPal buttons could not be displayed." }));
    };
    if (window.paypal && script) { render(); return; }
    script = document.createElement("script");
    script.src = src; script.dataset.pp = currency; script.async = true;
    script.onload = render;
    script.onerror = () => setMsg({ tone: "bad", text: "Could not load PayPal. Check your connection or ad-blocker." });
    document.body.appendChild(script);
  }, [orderId, clientId, currency, router]);

  return (
    <div>
      {!loaded && !msg && <p className="text-sm text-steel-500">Loading PayPal…</p>}
      <div ref={ref} className="max-w-sm" />
      {msg && <p role={msg.tone === "bad" ? "alert" : "status"} className={`mt-3 rounded border px-3 py-2 text-sm ${msg.tone === "ok" ? "border-ok/30 bg-ok-soft text-ok" : msg.tone === "bad" ? "border-bad/30 bg-bad-soft text-bad" : "border-info/30 bg-info-soft text-info"}`}>{msg.text}</p>}
    </div>
  );
}
