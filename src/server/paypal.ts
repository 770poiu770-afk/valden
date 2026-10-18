/**
 * PayPal REST v2 gateway (Orders API, Payments API, Webhooks API).
 * All calls are server-side; the client secret never reaches the browser.
 * Tests replace the gateway with `setPayPalGateway()`; production uses the HTTP implementation.
 */
import { log } from "@/lib/log";

export type PayPalAmount = { currency_code: string; value: string };
export type PayPalOrder = {
  id: string;
  status: "CREATED" | "SAVED" | "APPROVED" | "VOIDED" | "COMPLETED" | "PAYER_ACTION_REQUIRED";
  purchase_units?: {
    reference_id?: string; custom_id?: string; invoice_id?: string; amount?: PayPalAmount;
    payments?: { captures?: PayPalCapture[] };
  }[];
  payer?: { payer_id?: string };
};
export type PayPalCapture = {
  id: string; status: "COMPLETED" | "DECLINED" | "PARTIALLY_REFUNDED" | "PENDING" | "REFUNDED" | "FAILED";
  amount: PayPalAmount; custom_id?: string; invoice_id?: string;
  status_details?: { reason?: string };
  supplementary_data?: { related_ids?: { order_id?: string } };
};
export type PayPalRefund = { id: string; status: "CANCELLED" | "FAILED" | "PENDING" | "COMPLETED"; amount?: PayPalAmount; status_details?: { reason?: string } };
export type WebhookHeaders = { authAlgo: string; certUrl: string; transmissionId: string; transmissionSig: string; transmissionTime: string };

export class PayPalApiError extends Error {
  constructor(public httpStatus: number, public issue: string | null, message: string, public debugId?: string) { super(message); }
}

export interface PayPalGateway {
  isConfigured(): boolean;
  createOrder(args: { requestId: string; amount: PayPalAmount; referenceId: string; customId: string; invoiceId: string; description: string }): Promise<PayPalOrder>;
  getOrder(id: string): Promise<PayPalOrder>;
  captureOrder(id: string, requestId: string): Promise<PayPalOrder>;
  refundCapture(captureId: string, args: { requestId: string; amount: PayPalAmount; invoiceId: string; note: string }): Promise<PayPalRefund>;
  verifyWebhook(headers: WebhookHeaders, event: unknown): Promise<boolean>;
}

/** "live" only when PAYPAL_ENV is exactly "live"; anything else is Sandbox. */
export function paypalMode(): "live" | "sandbox" { return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox"; }

/**
 * Sandbox and Live keys live in separate variables, so switching PAYPAL_ENV can never pair Live mode
 * with Sandbox keys (or the reverse):
 *   sandbox → PAYPAL_SANDBOX_CLIENT_ID / PAYPAL_SANDBOX_CLIENT_SECRET / PAYPAL_SANDBOX_WEBHOOK_ID
 *             (the older un-prefixed PAYPAL_CLIENT_ID / _CLIENT_SECRET / _WEBHOOK_ID are accepted for Sandbox only)
 *   live    → PAYPAL_LIVE_CLIENT_ID / PAYPAL_LIVE_CLIENT_SECRET / PAYPAL_LIVE_WEBHOOK_ID (no fallback)
 */
export function paypalVarNames() {
  const p = paypalMode() === "live" ? "PAYPAL_LIVE_" : "PAYPAL_SANDBOX_";
  return { clientId: `${p}CLIENT_ID`, clientSecret: `${p}CLIENT_SECRET`, webhookId: `${p}WEBHOOK_ID` };
}
export function paypalCredentials() {
  const live = paypalMode() === "live";
  const n = paypalVarNames();
  const get = (name: string, legacy: string) => (process.env[name] || (live ? "" : process.env[legacy] || "")).trim() || null;
  return { clientId: get(n.clientId, "PAYPAL_CLIENT_ID"), clientSecret: get(n.clientSecret, "PAYPAL_CLIENT_SECRET"), webhookId: get(n.webhookId, "PAYPAL_WEBHOOK_ID") };
}

const BASE = () => (paypalMode() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

export class HttpPayPalGateway implements PayPalGateway {
  private token: { value: string; exp: number; mode: string } | null = null;

  isConfigured() {
    const c = paypalCredentials();
    return !!(c.clientId && c.clientSecret);
  }

  private async accessToken(): Promise<string> {
    const mode = paypalMode();
    if (this.token && this.token.mode === mode && this.token.exp > Date.now() + 60_000) return this.token.value;
    if (!this.isConfigured()) throw new PayPalApiError(503, "NOT_CONFIGURED", "PayPal credentials are not configured.");
    const c = paypalCredentials();
    const auth = Buffer.from(`${c.clientId}:${c.clientSecret}`).toString("base64");
    const res = await fetch(`${BASE()}/v1/oauth2/token`, {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new PayPalApiError(res.status, "AUTH_FAILED", "PayPal authentication failed.");
    const j = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: j.access_token, exp: Date.now() + j.expires_in * 1000, mode };
    return j.access_token;
  }

  private async call<T>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<T> {
    const res = await fetch(`${BASE()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, "Content-Type": "application/json", Prefer: "return=representation", ...extra },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const issue = json?.details?.[0]?.issue ?? json?.name ?? null;
      log.warn("paypal_api_error", { path: path.replace(/[A-Z0-9]{10,}/g, ":id"), status: res.status, issue, debugId: json?.debug_id });
      throw new PayPalApiError(res.status, issue, json?.message ?? `PayPal API error ${res.status}`, json?.debug_id);
    }
    return json as T;
  }

  createOrder(a: Parameters<PayPalGateway["createOrder"]>[0]) {
    return this.call<PayPalOrder>("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [{ reference_id: a.referenceId, custom_id: a.customId, invoice_id: a.invoiceId, description: a.description.slice(0, 127), amount: a.amount }],
      payment_source: { paypal: { experience_context: { shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW", brand_name: "Valden" } } },
    }, { "PayPal-Request-Id": a.requestId });
  }
  getOrder(id: string) { return this.call<PayPalOrder>("GET", `/v2/checkout/orders/${encodeURIComponent(id)}`); }
  captureOrder(id: string, requestId: string) {
    return this.call<PayPalOrder>("POST", `/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {}, { "PayPal-Request-Id": requestId });
  }
  refundCapture(captureId: string, a: { requestId: string; amount: PayPalAmount; invoiceId: string; note: string }) {
    return this.call<PayPalRefund>("POST", `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`, { amount: a.amount, invoice_id: a.invoiceId, note_to_payer: a.note.slice(0, 255) }, { "PayPal-Request-Id": a.requestId });
  }
  async verifyWebhook(h: WebhookHeaders, event: unknown) {
    const webhookId = paypalCredentials().webhookId;
    if (!webhookId) { log.error("paypal_webhook_id_missing"); return false; }
    if (!/^https:\/\/api(-m)?\.(sandbox\.)?paypal\.com\//.test(h.certUrl)) return false; // only trust PayPal-hosted certs
    const r = await this.call<{ verification_status: string }>("POST", "/v1/notifications/verify-webhook-signature", {
      auth_algo: h.authAlgo, cert_url: h.certUrl, transmission_id: h.transmissionId, transmission_sig: h.transmissionSig,
      transmission_time: h.transmissionTime, webhook_id: webhookId, webhook_event: event,
    });
    return r.verification_status === "SUCCESS";
  }
}

let gateway: PayPalGateway = new HttpPayPalGateway();
export function paypal(): PayPalGateway { return gateway; }
export function setPayPalGateway(g: PayPalGateway) { gateway = g; }
export function paypalPublicConfig() {
  return { clientId: paypalCredentials().clientId, env: paypalMode() };
}
