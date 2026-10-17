import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, type DbOrTx } from "@/db";
import { settings } from "@/db/schema";

const moneyRule = z.object({ amountMinor: z.number().int().nonnegative(), currency: z.enum(["USD", "EUR", "ILS"]) });

export const SettingsSchema = z.object({
  enabledCurrencies: z.array(z.enum(["USD", "EUR", "ILS"])).min(1),
  minimumOrderValue: moneyRule,
  targetOrderValue: moneyRule,
  pricingPolicy: z.object({
    targetPremiumMinor: z.number().int().nonnegative(),   // e.g. 35000 = US$350
    minPremiumMinor: z.number().int().nonnegative(),
    maxPremiumMinor: z.number().int().nonnegative(),
    maxPremiumPercentBps: z.number().int().min(0).max(100_000), // premium allowed only if ≤ this share of reference
    fallbackMode: z.enum(["FLAG", "PERCENT"]),
    fallbackMarkupBps: z.number().int().min(0).max(100_000),
    tierSchedule: z.array(z.object({ moqMultiple: z.number().int().min(1), discountBps: z.number().int().min(0).max(5000) })).min(1),
  }),
  taxRules: z.object({
    byCountry: z.record(z.string().length(2), z.number().int().min(0).max(10_000)),
    defaultRateBps: z.number().int().min(0).max(10_000),
    note: z.string(),
  }),
  orderRules: z.object({
    requireOrderConfirmation: z.boolean(),
    riskReviewThresholdBaseMinor: z.number().int().nonnegative(),
    newCompanyReviewDays: z.number().int().nonnegative(),
    reviewFirstOrder: z.boolean(),
  }),
  payments: z.object({
    paypalEnabled: z.boolean(),
    paypalMaxOrderBaseMinor: z.number().int().nonnegative(), // 0 = no application cap
    manualTransferEnabled: z.boolean(),
    manualTransferInstructions: z.string(),
  }),
  shippingMethods: z.array(z.object({
    code: z.string().min(2), name: z.string().min(2), description: z.string(), quotedByStaff: z.boolean(),
  })).min(1),
  quoteDefaults: z.object({ offerValidityDays: z.number().int().min(1).max(90) }),
});
export type AppSettings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  enabledCurrencies: ["USD", "EUR", "ILS"],
  minimumOrderValue: { amountMinor: 5_000_000, currency: "ILS" },   // ₪50,000
  targetOrderValue: { amountMinor: 30_000_000, currency: "ILS" },   // ₪300,000
  pricingPolicy: {
    targetPremiumMinor: 35_000, minPremiumMinor: 30_000, maxPremiumMinor: 40_000,
    maxPremiumPercentBps: 2_500, fallbackMode: "PERCENT", fallbackMarkupBps: 800,
    tierSchedule: [
      { moqMultiple: 1, discountBps: 0 },
      { moqMultiple: 5, discountBps: 150 },
      { moqMultiple: 10, discountBps: 300 },
      { moqMultiple: 25, discountBps: 450 },
      { moqMultiple: 50, discountBps: 600 },
    ],
  },
  taxRules: {
    byCountry: { IL: 1_800 },
    defaultRateBps: 0,
    note: "Indicative configuration only. Confirm VAT/sales-tax treatment for each jurisdiction with your accountant before launch.",
  },
  orderRules: {
    requireOrderConfirmation: true,
    riskReviewThresholdBaseMinor: 5_000_000, // US$50,000
    newCompanyReviewDays: 30,
    reviewFirstOrder: true,
  },
  payments: {
    paypalEnabled: true,
    paypalMaxOrderBaseMinor: 10_000_000, // US$100,000 — set to the limit confirmed for your PayPal account
    manualTransferEnabled: true,
    manualTransferInstructions: "Bank transfer details are issued by our finance team on a pro-forma invoice once the order is confirmed. Payment is only recorded after funds are verified as received.",
  },
  shippingMethods: [
    { code: "VALDEN_FREIGHT", name: "Insured freight arranged by Valden", description: "Freight, insurance and handling are quoted by our logistics desk after order review.", quotedByStaff: true },
    { code: "BUYER_FORWARDER", name: "Buyer's own forwarder (collection)", description: "Your appointed forwarder collects from the agreed dispatch point. No freight charge from Valden.", quotedByStaff: false },
  ],
  quoteDefaults: { offerValidityDays: 7 },
};

export async function getSettings(tx: DbOrTx = db): Promise<AppSettings> {
  const rows = await tx.select().from(settings);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) if (r.key in DEFAULT_SETTINGS) merged[r.key] = r.value;
  const parsed = SettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K], userId: string | null, tx: DbOrTx = db) {
  const shape = SettingsSchema.shape[key];
  const v = shape.parse(value);
  await tx.insert(settings).values({ key, value: v, updatedById: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value: v, updatedAt: new Date(), updatedById: userId } });
}

export async function deleteSetting(key: string) {
  await db.delete(settings).where(eq(settings.key, key));
}
