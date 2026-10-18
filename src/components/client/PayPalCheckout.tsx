"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "./LocaleProvider";

declare global { interface Window { paypal?: { Buttons: (o: Record<string, unknown>) => { render: (el: HTMLElement) => Promise<void>; isEligible: () => boolean } } } }

/**
 * PayPal Smart Buttons. The browser only relays approval; the order is created and captured
 * server-side, and our server — not this component — decides whether the order is paid.
 */
export function PayPalCheckout({ orderId, clientId, currency }: { orderId: string; clientId: string; currency: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [msg, setMsg] = useState<{ tone: "ok" | "bad" | "info"; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${currency}&intent=capture&components=buttons&locale=${locale === "he" ? "he_IL" : "en_US"}`;
    const key = `${currency}-${locale}`;
    let script = document.querySelector<HTMLScriptElement>(`script[data-pp="${key}"]`);
    const render = () => {
      if (!window.paypal || !ref.current) return;
      ref.current.innerHTML = "";
      window.paypal.Buttons({
        style: { layout: "vertical", shape: "rect", label: "pay" },
        createOrder: async () => {
          setMsg(null);
          const r = await fetch(`/api/orders/${orderId}/paypal`, { method: "POST" });
          const d = await r.json();
          if (!r.ok) { setMsg({ tone: "bad", text: d.error ?? t("Could not start PayPal payment.", "לא ניתן היה להתחיל את תשלום ה-PayPal.") }); throw new Error(d.error); }
          return d.paypalOrderId;
        },
        onApprove: async (data: { orderID: string }, actions: { restart: () => void }) => {
          setMsg({ tone: "info", text: t("Confirming payment with PayPal…", "מאמתים את התשלום מול PayPal…") });
          const r = await fetch(`/api/orders/${orderId}/paypal/capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) });
          const d = await r.json();
          if (!r.ok) { setMsg({ tone: "bad", text: d.error ?? t("Payment could not be completed.", "לא ניתן היה להשלים את התשלום.") }); router.refresh(); return; }
          if (d.status === "INSTRUMENT_DECLINED") { setMsg({ tone: "bad", text: t("Your funding source was declined. Choose another in PayPal.", "אמצעי התשלום נדחה. בחרו אמצעי אחר ב-PayPal.") }); return actions.restart(); }
          if (d.status === "COMPLETED") setMsg({ tone: "ok", text: t("Payment verified. Thank you.", "התשלום אומת. תודה.") });
          else if (d.status === "PENDING" || d.status === "MISMATCH") setMsg({ tone: "info", text: t("PayPal reports the payment as pending. We will update the order when PayPal confirms it.", "PayPal מדווחת שהתשלום בהמתנה. נעדכן את ההזמנה כש-PayPal תאשר אותו.") });
          else setMsg({ tone: "bad", text: t("PayPal declined the payment. No funds were taken.", "PayPal דחתה את התשלום. לא נגבה כסף.") });
          router.refresh();
        },
        onCancel: async (data: { orderID?: string }) => {
          setMsg({ tone: "info", text: t("Payment cancelled. Nothing was charged; your order is still awaiting payment.", "התשלום בוטל. לא נגבה כסף; ההזמנה עדיין ממתינה לתשלום.") });
          if (data?.orderID) {
            await fetch(`/api/orders/${orderId}/paypal/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paypalOrderId: data.orderID }) }).catch(() => undefined);
            router.refresh();
          }
        },
        onError: () => setMsg({ tone: "bad", text: t("PayPal encountered an error. Please try again or switch to bank transfer.", "אירעה שגיאה ב-PayPal. נסו שוב או עברו להעברה בנקאית.") }),
      }).render(ref.current).then(() => setLoaded(true)).catch(() => setMsg({ tone: "bad", text: t("PayPal buttons could not be displayed.", "לא ניתן היה להציג את כפתורי PayPal.") }));
    };
    if (window.paypal && script) { render(); return; }
    script = document.createElement("script");
    script.src = src; script.dataset.pp = key; script.async = true;
    script.onload = render;
    script.onerror = () => setMsg({ tone: "bad", text: t("Could not load PayPal. Check your connection or ad-blocker.", "לא ניתן היה לטעון את PayPal. בדקו את החיבור או חוסם הפרסומות.") });
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t depends only on locale
  }, [orderId, clientId, currency, router, locale]);

  return (
    <div>
      {!loaded && !msg && <p className="text-sm text-steel-500">{t("Loading PayPal…", "טוען את PayPal…")}</p>}
      <div ref={ref} className="max-w-sm" />
      {msg && <p role={msg.tone === "bad" ? "alert" : "status"} className={`mt-3 rounded border px-3 py-2 text-sm ${msg.tone === "ok" ? "border-ok/30 bg-ok-soft text-ok" : msg.tone === "bad" ? "border-bad/30 bg-bad-soft text-bad" : "border-info/30 bg-info-soft text-info"}`}>{msg.text}</p>}
    </div>
  );
}
