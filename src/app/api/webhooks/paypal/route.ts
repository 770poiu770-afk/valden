import { NextResponse, type NextRequest } from "next/server";
import { handlePayPalWebhook } from "@/server/payments";
import { log } from "@/lib/log";

export const runtime = "nodejs";

/** PayPal webhook receiver. Signature is verified with PayPal before anything is processed. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > 1_000_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const h = (k: string) => req.headers.get(k) ?? "";
  const headers = { authAlgo: h("paypal-auth-algo"), certUrl: h("paypal-cert-url"), transmissionId: h("paypal-transmission-id"), transmissionSig: h("paypal-transmission-sig"), transmissionTime: h("paypal-transmission-time") };
  if (!headers.transmissionId || !headers.transmissionSig) return NextResponse.json({ error: "missing signature headers" }, { status: 400 });
  const r = await handlePayPalWebhook(headers, raw);
  log.info("paypal_webhook", { status: r.status, result: r.result });
  return NextResponse.json({ result: r.result }, { status: r.status });
}
