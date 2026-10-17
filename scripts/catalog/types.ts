export type Cond = "NEW" | "REFURBISHED" | "USED";
export type Avail = "INDICATIVE_AVAILABLE" | "LIMITED_CONFIRM" | "BUILD_TO_ORDER" | "PRE_ORDER" | "ON_REQUEST" | "UNAVAILABLE";
export type Spec = [group: string, label: string, value: string];

export type CatalogVariant = { label: string; color?: string; region?: string };

export type CatalogItem = {
  category: string;
  subcategory: string;
  manufacturer: string;
  model: string;
  name: string;
  condition?: Cond;
  summary: string;
  specs: Spec[];
  attributes?: Record<string, string | number>;
  referenceUsd: number; // indicative sample reference price (US$) — NOT verified market data
  moq?: number;
  orderIncrement?: number;
  availability?: Avail;
  leadTime?: string;
  imageKey: string;
  variants?: CatalogVariant[];
  regionCompatibility?: string;
  shippingRestrictions?: string;
  warrantyInfo?: string;
};

export const LITHIUM = "Contains lithium-ion battery (UN3481, packed with/in equipment). Air-freight dangerous-goods rules apply.";
export const EXPORT_REVIEW = "Encryption-capable network equipment. Export-control screening is required for some destinations before dispatch.";
export const MFR_WARRANTY = "Manufacturer warranty terms depend on region and sales channel — to be confirmed per order.";
export const REFURB_WARRANTY = "Refurbished unit. Grading standard and warranty terms are confirmed in the commercial offer.";
export const PHONE_REGION = "Network bands, SIM/eSIM configuration and charger inclusion vary by regional model. Confirm the destination market before ordering.";
