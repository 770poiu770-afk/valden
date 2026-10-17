import { afterEach, describe, expect, it } from "vitest";
import { isOrderableProduct } from "@/server/catalog";
import { sampleRatesAllowed } from "@/lib/fx";

const env = process.env as Record<string, string | undefined>;
const orig = { NODE_ENV: env.NODE_ENV, ALLOW_SAMPLE_DATA: env.ALLOW_SAMPLE_DATA };
afterEach(() => { env.NODE_ENV = orig.NODE_ENV; env.ALLOW_SAMPLE_DATA = orig.ALLOW_SAMPLE_DATA; });
const sample = { isActive: true, purchasable: false, isSample: true, pricingFlag: "NONE", availability: "INDICATIVE_AVAILABLE" };

describe("production safety switches", () => {
  it("sample products are not purchasable in production unless activated", () => {
    env.NODE_ENV = "production"; delete env.ALLOW_SAMPLE_DATA;
    expect(isOrderableProduct(sample)).toBe(false);
    expect(isOrderableProduct({ ...sample, purchasable: true })).toBe(true);
    expect(sampleRatesAllowed()).toBe(false);
  });
  it("development allows sample data; NEEDS_REVIEW and UNAVAILABLE are never orderable", () => {
    env.NODE_ENV = "development";
    expect(isOrderableProduct(sample)).toBe(true);
    expect(isOrderableProduct({ ...sample, pricingFlag: "NEEDS_REVIEW", purchasable: true })).toBe(false);
    expect(isOrderableProduct({ ...sample, availability: "UNAVAILABLE", purchasable: true })).toBe(false);
    expect(isOrderableProduct({ ...sample, isActive: false, purchasable: true })).toBe(false);
  });
});
