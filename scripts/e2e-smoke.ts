/**
 * End-to-end smoke test against a running server (default http://localhost:3000).
 *   E2E_BASE=http://localhost:3000 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run test:e2e
 * Exercises the HTTP layer: auth cookies, CSRF origin checks, multipart upload, role guards,
 * company isolation and the full order lifecycle using bank transfer (no real payments).
 */
import "./load-env";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const ADMIN = { email: process.env.E2E_ADMIN_EMAIL ?? "admin@valden.local", password: process.env.E2E_ADMIN_PASSWORD ?? "" };
let pass = 0, fail = 0;
const results: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++; else fail++;
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail && !ok ? `  — ${detail}` : ""}`);
}

class Client {
  cookie = "";
  async req(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers: Record<string, string> = { Origin: BASE, ...(init.headers as Record<string, string>) };
    if (this.cookie) headers.Cookie = this.cookie;
    let body = init.body;
    if (init.json !== undefined) { body = JSON.stringify(init.json); headers["Content-Type"] = "application/json"; }
    const res = await fetch(BASE + path, { ...init, body, headers, redirect: "manual" });
    const set = res.headers.get("set-cookie");
    if (set) { const m = set.match(/vld_session=([^;]*)/); if (m) this.cookie = m[1] ? `vld_session=${m[1]}` : ""; }
    return res;
  }
  async json(path: string, init: RequestInit & { json?: unknown } = {}) {
    const r = await this.req(path, init);
    let data: Record<string, unknown> = {};
    try { data = await r.json(); } catch { /* not json */ }
    return { status: r.status, data };
  }
}

/** Read the value attribute of the first <input name="…"> regardless of attribute order. */
function inputValue(html: string, name: string): string | undefined {
  const tag = html.match(new RegExp(`<input[^>]*name="${name.replace(/[[\]().]/g, "\\$&")}"[^>]*>`))?.[0];
  return tag?.match(/value="([^"]*)"/)?.[1];
}


async function main() {
  if (!ADMIN.password) throw new Error("Set E2E_ADMIN_PASSWORD");
  const tag = randomUUID().slice(0, 6);
  if (process.env.E2E_RESET_RATE_LIMITS !== "0" && process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("DELETE FROM rate_limits"); // start from a clean limiter (never run against production)
    await pool.end();
  }

  // ---- public pages
  for (const p of ["/", "/catalog", "/categories", "/products/apple-iphone-17-pro-max-1tb", "/register", "/login", "/forgot-password", "/about", "/services", "/contact", "/quote", "/faq", "/policies/shipping", "/policies/returns", "/privacy", "/terms"]) {
    const r = await new Client().req(p);
    check(`GET ${p} → 200`, r.status === 200, String(r.status));
  }
  const guestPdp = await (await new Client().req("/products/apple-iphone-17-pro-max-1tb?currency=USD")).text();
  check("guest product page shows public price", /\$1,949\.00/.test(guestPdp) && /Create an account to order/.test(guestPdp));
  const g404 = await new Client().req("/products/does-not-exist");
  check("unknown product → 404", g404.status === 404, String(g404.status));

  // ---- open sign-up: email + password only (plus optional company name so admin can find the account)
  const buyer = new Client();
  const reg = await buyer.json("/api/auth/register", { method: "POST", json: { email: `eve-${tag}@e2e.example`, password: "E2eStrongPassword1", companyName: `E2E Distribution ${tag} Ltd`, isBusiness: true, acceptTerms: true } });
  check("register (email + password, no documents)", reg.status === 200 && reg.data.redirect === "/portal?welcome=1", JSON.stringify(reg.data));
  const personal = new Client();
  const preg = await personal.json("/api/auth/register", { method: "POST", json: { email: `pat-${tag}@e2e.example`, password: "E2eStrongPassword1", acceptTerms: true } });
  check("register personal account (no company)", preg.status === 200, JSON.stringify(preg.data));
  const noTerms = await new Client().json("/api/auth/register", { method: "POST", json: { email: `x-${tag}@e2e.example`, password: "E2eStrongPassword1" } });
  check("sign-up without accepting terms rejected", noTerms.status === 400, JSON.stringify(noTerms.data));

  const welcome = await buyer.req("/portal?welcome=1");
  check("new customer lands on an active dashboard", welcome.status === 200 && !(await welcome.text()).includes("under review"));
  const pendAdmin = await buyer.req("/admin");
  check("buyer redirected away from /admin", pendAdmin.status === 307 || pendAdmin.status === 308, String(pendAdmin.status));

  // ---- CSRF: cross-origin POST is blocked
  const csrf = await fetch(`${BASE}/api/cart`, { method: "POST", headers: { Origin: "https://evil.example", Cookie: buyer.cookie, "Content-Type": "application/json" }, body: "{}" });
  check("cross-origin POST blocked (CSRF)", csrf.status === 403, String(csrf.status));

  // ---- admin login
  const admin = new Client();
  const bad = await admin.json("/api/auth/login", { method: "POST", json: { email: ADMIN.email, password: "wrong-password" } });
  check("admin wrong password → 401", bad.status === 401);
  const login = await admin.json("/api/auth/login", { method: "POST", json: ADMIN });
  check("admin login", login.status === 200 && login.data.redirect === "/admin", JSON.stringify(login.data));
  for (const p of ["/admin", "/admin/companies", "/admin/products", "/admin/pricing", "/admin/import", "/admin/quotes", "/admin/orders", "/admin/payments", "/admin/refunds", "/admin/shipments", "/admin/users", "/admin/roles", "/admin/settings", "/admin/audit", "/admin/inquiries", "/admin/outbox"]) {
    const r = await admin.req(p);
    check(`admin GET ${p} → 200`, r.status === 200, String(r.status));
  }
  const coList = await (await admin.req(`/admin/companies?q=${encodeURIComponent(`E2E Distribution ${tag}`)}`)).text();
  check("admin sees the new customer account", /\/admin\/companies\/[0-9a-f-]{36}/.test(coList));

  // ---- personal customer: single unit with an address entered at checkout
  const sku = (await personal.json("/api/skus?q=iphone%2017%20pro%20max%201tb")).data as { results: { sku: string; variantId: string }[] };
  check("SKU search returns results", sku.results?.length > 0);
  const v = sku.results[0];
  const one = await personal.json("/api/cart", { method: "POST", json: { mode: "set", lines: [{ variantId: v.variantId, quantity: 1 }] } });
  check("add 1 unit to cart", one.status === 200, JSON.stringify(one.data));
  const oneOrder = await personal.json("/api/orders", { method: "POST", json: { currency: "ILS", shippingMethod: "STANDARD_DELIVERY", paymentMethod: "PAYPAL", billingSameAsShipping: true,
    totalCents: "1", status: "PAID", paymentStatus: "PAID", // tampered fields — must be ignored
    newShipping: { label: "Home", contactName: "Pat Shopper", line1: "2 Test St", city: "Haifa", countryCode: "IL" } } });
  check("personal customer orders a single unit (standard delivery, PayPal)", oneOrder.status === 200, JSON.stringify(oneOrder.data));
  const oneId = String(oneOrder.data.orderId);
  const oneHtml = await (await personal.req(`/portal/orders/${oneId}`)).text();
  check("pay-now order is awaiting payment, not paid", oneHtml.includes("Payment due") && !/>Paid</.test(oneHtml));
  const ppStart = await personal.json(`/api/orders/${oneId}/paypal`, { method: "POST", json: {} });
  check("PayPal start is server-side (503 until credentials are set, else 200)", ppStart.status === 200 || (ppStart.status === 503 && ppStart.data.code === "PAYPAL_NOT_CONFIGURED"), JSON.stringify(ppStart.data));
  const fakeCap = await personal.json(`/api/orders/${oneId}/paypal/capture`, { method: "POST", json: { paypalOrderId: "FAKE-FROM-BROWSER" } });
  check("browser cannot capture a malformed PayPal order id (400)", fakeCap.status === 400, JSON.stringify(fakeCap.data));
  const fakeCap2 = await personal.json(`/api/orders/${oneId}/paypal/capture`, { method: "POST", json: { paypalOrderId: "5O190127TN364715T" } });
  check("browser cannot capture an unknown PayPal order (404)", fakeCap2.status === 404, JSON.stringify(fakeCap2.data));

  // ---- business customer: bulk order with volume pricing
  const add = await buyer.json("/api/cart", { method: "POST", json: { mode: "set", lines: [{ variantId: v.variantId, quantity: 45 }] } });
  check("add 45 units to cart", add.status === 200, JSON.stringify(add.data));
  const cart = await buyer.json("/api/cart?currency=ILS");
  const sub = BigInt(String(cart.data.subtotalCents));
  check("cart subtotal ₪ computed server-side (45 × ₪7,016.40)", sub === 31573800n, String(cart.data.subtotalCents));
  for (const p of ["/portal", "/portal/cart?currency=ILS", "/portal/checkout?currency=ILS", "/portal/bulk", "/portal/quotes", "/portal/quotes/new", "/portal/orders", "/portal/saved", "/portal/compare", "/portal/company"]) {
    const r = await buyer.req(p);
    check(`buyer GET ${p} → 200`, r.status === 200, String(r.status));
  }
  const tamper = await buyer.json("/api/orders", { method: "POST", json: { currency: "ILS", shippingMethod: "VALDEN_FREIGHT", paymentMethod: "MANUAL_TRANSFER", subtotalCents: "1", unitCents: "1", billingSameAsShipping: true,
    newShipping: { label: "Warehouse", contactName: "Eve Tester", line1: "1 Test Way", city: "Tel Aviv", countryCode: "IL" } } });
  const order = tamper; // client-supplied totals are ignored; the server prices the order itself
  check("place bulk order (client price fields ignored)", order.status === 200, JSON.stringify(order.data));
  const orderId = String(order.data.orderId);
  const orderHtml = await (await buyer.req(`/portal/orders/${orderId}`)).text();
  check("order is pending review with server totals", orderHtml.includes("Under review") || orderHtml.includes("Order received"));
  check("order shows ₪315,738.00 subtotal", orderHtml.includes("₪315,738.00"));

  // ---- isolation: another customer cannot see the order
  const intruder = personal;
  const peek = await intruder.req(`/portal/orders/${orderId}`);
  check("other customer cannot view order (404)", peek.status === 404, String(peek.status));
  const peekDoc = await intruder.req(`/documents/orders/${orderId}?type=proforma`);
  check("other customer cannot open order documents (404)", peekDoc.status === 404, String(peekDoc.status));
  const peekCancel = await intruder.json(`/api/orders/${orderId}/cancel`, { method: "POST", json: {} });
  check("other company cannot cancel order", peekCancel.status === 404, String(peekCancel.status));
  const buyerAdminApi = await buyer.json(`/api/admin/orders/${orderId}/confirm`, { method: "POST", json: {} });
  check("buyer cannot call admin API (403)", buyerAdminApi.status === 403, String(buyerAdminApi.status));

  // ---- admin confirms, records transfer, ships
  const conf = await admin.json(`/api/admin/orders/${orderId}/confirm`, { method: "POST", json: { shippingAmount: "4500.00", estimateNote: "Provisional: 5–7 business days" } });
  check("admin confirms order with freight", conf.status === 200, JSON.stringify(conf.data));
  const adminOrder = await (await admin.req(`/admin/orders/${orderId}`)).text();
  const total = inputValue(adminOrder, "amount");
  const payBad = await admin.json(`/api/admin/orders/${orderId}/manual-payment`, { method: "POST", json: { amount: "1.00", reference: `TRX-${tag}` } });
  check("manual payment with wrong amount rejected", payBad.status === 400);
  const pay = await admin.json(`/api/admin/orders/${orderId}/manual-payment`, { method: "POST", json: { amount: total, reference: `TRX-${tag}` } });
  check("finance records verified transfer", pay.status === 200, `${total} ${JSON.stringify(pay.data)}`);
  const ord2 = await (await admin.req(`/admin/orders/${orderId}`)).text();
  const itemId = ord2.match(/name="qty_(\d+)"/)?.[1];
  const ship = await admin.json(`/api/admin/orders/${orderId}/shipments`, { method: "POST", json: { [`qty_${itemId}`]: "45", carrier: "Manual freight", packageCount: "3" } });
  check("create shipment", ship.status === 200, JSON.stringify(ship.data));
  const bo = await (await buyer.req(`/portal/orders/${orderId}`)).text();
  check("buyer sees shipment and paid status", bo.includes("-S1") && bo.includes("Paid"));
  const docs = await buyer.req(`/documents/orders/${orderId}?type=proforma`);
  check("buyer opens pro-forma invoice", docs.status === 200);

  // ---- quotes over HTTP
  const q = await buyer.json("/api/quotes", { method: "POST", json: { currency: "USD", lines: [{ sku: v.sku, quantity: 300, targetUnitPrice: "1800" }] } });
  check("buyer submits quote request", q.status === 200, JSON.stringify(q.data));
  const quoteId = String(q.data.redirect).split("/")[3].split("?")[0];
  const qa = await (await admin.req(`/admin/quotes/${quoteId}`)).text();
  const lineId = inputValue(qa, "lines[0].id");
  const offer = await admin.json(`/api/admin/quotes/${quoteId}/offer`, { method: "POST", json: { lines: [{ id: lineId, offeredUnitPrice: "1850.00" }], validityDays: 5 } });
  check("admin issues offer", offer.status === 200, JSON.stringify(offer.data));
  const acc = await buyer.json(`/api/quotes/${quoteId}/accept`, { method: "POST", json: { currency: "USD", billingSameAsShipping: true, newShipping: { label: "Forwarder", contactName: "Eve Tester", line1: "3 Port Rd", city: "Ashdod", countryCode: "IL" }, shippingMethod: "BUYER_FORWARDER", paymentMethod: "MANUAL_TRANSFER" } });
  check("buyer accepts offer → order", acc.status === 200 && String(acc.data.redirect).startsWith("/portal/orders/"), JSON.stringify(acc.data));

  // ---- webhook endpoint rejects unsigned / forged calls
  const wh = await fetch(`${BASE}/api/webhooks/paypal`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "WH-FAKE", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: {} }) });
  check("webhook without signature headers rejected", wh.status === 400, String(wh.status));
  const wh2 = await fetch(`${BASE}/api/webhooks/paypal`, { method: "POST", headers: { "Content-Type": "application/json", "paypal-transmission-id": "x", "paypal-transmission-sig": "y", "paypal-cert-url": "https://evil.example/c.pem", "paypal-auth-algo": "SHA256withRSA", "paypal-transmission-time": new Date().toISOString() }, body: JSON.stringify({ id: "WH-FAKE2", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: { id: "X" } }) });
  check("forged webhook (bad cert URL) rejected", wh2.status === 400, String(wh2.status));

  // ---- security headers & logout
  const h = await new Client().req("/");
  check("security headers present", !!h.headers.get("content-security-policy") && h.headers.get("x-frame-options") === "DENY" && !h.headers.get("x-powered-by"));
  await buyer.json("/api/auth/logout", { method: "POST" });
  const after = await buyer.req("/portal");
  check("logout ends session", after.status === 307, String(after.status));

  // ---- rate limiting: repeated failed logins for one email are throttled
  const rl = new Client();
  let throttled = false;
  for (let i = 0; i < 12 && !throttled; i++) {
    const r = await rl.json("/api/auth/login", { method: "POST", json: { email: `nobody-${tag}@e2e.example`, password: "wrong-password-x" } });
    if (r.status === 429) throttled = true;
  }
  check("login attempts are rate-limited (429)", throttled);

  console.log(results.join("\n"));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch((e) => { console.error(e); console.log(results.join("\n")); process.exit(1); });
