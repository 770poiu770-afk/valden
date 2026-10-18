import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, users } from "@/db/schema";
import { hashPassword, loadActorByUserId, type Actor } from "@/lib/auth";
import { registerCustomer, saveCheckoutAddress, type RegistrationInput } from "@/server/accounts";
import { setPayPalGateway, type PayPalGateway, type PayPalOrder, type PayPalRefund } from "@/server/paypal";

/** Open-store sign-up input: only email, password and terms are required. */
export function regInput(over: Partial<RegistrationInput> = {}): RegistrationInput {
  const tag = randomUUID().slice(0, 8);
  return { email: `shopper-${tag}@example.com`, password: "CorrectHorse12battery", acceptTerms: true, ...over };
}

let adminCache: Actor | null = null;
export async function staff(roleKey = "SUPER_ADMIN"): Promise<Actor> {
  if (roleKey === "SUPER_ADMIN" && adminCache) return adminCache;
  const role = (await db.select().from(roles).where(eq(roles.key, roleKey)))[0];
  const u = (await db.insert(users).values({ email: `${roleKey.toLowerCase()}-${randomUUID().slice(0, 6)}@staff.example`, fullName: `Staff ${roleKey}`, roleId: role.id, passwordHash: await hashPassword("StaffPassword123") }).returning())[0];
  const a = (await loadActorByUserId(u.id))!;
  if (roleKey === "SUPER_ADMIN") adminCache = a;
  return a;
}

/** A signed-up customer with a saved delivery and billing address (as after a first checkout). */
export async function approvedBuyer(over: Partial<RegistrationInput> = {}) {
  const r = await registerCustomer(regInput({ fullName: "Test Contact", ...over }));
  const actor = (await loadActorByUserId(r.userId))! as Actor & { companyId: string };
  const addr = { contactName: "Test Contact", line1: "10 Harbour Road", city: "Tel Aviv", countryCode: "IL" };
  const shippingAddressId = await saveCheckoutAddress(actor, "SHIPPING", addr);
  const billingAddressId = await saveCheckoutAddress(actor, "BILLING", addr);
  return { actor, ...r, shippingAddressId, billingAddressId };
}

/** In-memory PayPal sandbox double. Records calls; behaviour is configurable per test. */
export class FakePayPal implements PayPalGateway {
  orders = new Map<string, { amount: { currency_code: string; value: string }; customId: string; status: string }>();
  requestIds = new Map<string, string>();
  captureBehaviour: "COMPLETED" | "PENDING" | "DECLINED" | "INSTRUMENT_DECLINED" | "WRONG_AMOUNT" = "COMPLETED";
  verify = true;
  refundStatus: PayPalRefund["status"] = "COMPLETED";
  calls: string[] = [];
  isConfigured() { return true; }
  async createOrder(a: Parameters<PayPalGateway["createOrder"]>[0]): Promise<PayPalOrder> {
    this.calls.push("create");
    const existing = this.requestIds.get(a.requestId);
    if (existing) return { id: existing, status: "CREATED" };
    const id = `PPO${randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`;
    this.orders.set(id, { amount: a.amount, customId: a.customId, status: "CREATED" });
    this.requestIds.set(a.requestId, id);
    return { id, status: "CREATED" };
  }
  /** When set, getOrder reports this (uncaptured) status instead of a completed capture. */
  getOrderStatus: "CREATED" | "APPROVED" | "VOIDED" | null = null;
  async getOrder(id: string): Promise<PayPalOrder> {
    if (this.getOrderStatus) return { id, status: this.getOrderStatus };
    return this.captured(id, "COMPLETED");
  }
  async captureOrder(id: string): Promise<PayPalOrder> {
    this.calls.push("capture");
    if (this.captureBehaviour === "INSTRUMENT_DECLINED") {
      const { PayPalApiError } = await import("@/server/paypal");
      throw new PayPalApiError(422, "INSTRUMENT_DECLINED", "Instrument declined");
    }
    return this.captured(id, this.captureBehaviour === "WRONG_AMOUNT" ? "COMPLETED" : this.captureBehaviour, this.captureBehaviour === "WRONG_AMOUNT");
  }
  private captured(id: string, status: string, wrong = false): PayPalOrder {
    const o = this.orders.get(id)!;
    return {
      id, status: "COMPLETED", payer: { payer_id: "PAYERTEST01" },
      purchase_units: [{ payments: { captures: [{ id: `CAP-${id}`, status: status as "COMPLETED", custom_id: o.customId, amount: wrong ? { ...o.amount, value: "1.00" } : o.amount, supplementary_data: { related_ids: { order_id: id } } }] } }],
    };
  }
  async refundCapture(_c: string, a: { requestId: string; amount: { currency_code: string; value: string } }): Promise<PayPalRefund> {
    this.calls.push("refund");
    return { id: `RF-${a.requestId.slice(-10)}`, status: this.refundStatus, amount: a.amount };
  }
  async verifyWebhook() { return this.verify; }
}

export function installFakePayPal() { const f = new FakePayPal(); setPayPalGateway(f); return f; }
