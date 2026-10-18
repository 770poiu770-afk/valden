import { sql } from "drizzle-orm";
import {
  pgTable, pgEnum, pgSequence, text, integer, bigint, boolean, timestamp, jsonb, uuid,
  numeric, primaryKey, uniqueIndex, index, serial,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */
export const companyStatus = pgEnum("company_status", [
  "PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED", "REJECTED", "SUSPENDED",
]);
export const addressKind = pgEnum("address_kind", ["BILLING", "SHIPPING"]);
export const documentStatus = pgEnum("document_status", ["PENDING", "ACCEPTED", "REJECTED"]);
export const productCondition = pgEnum("product_condition", ["NEW", "REFURBISHED", "USED"]);
export const availabilityStatus = pgEnum("availability_status", [
  "INDICATIVE_AVAILABLE", // believed available, requires confirmation
  "LIMITED_CONFIRM",      // limited, requires confirmation
  "BUILD_TO_ORDER",
  "PRE_ORDER",
  "ON_REQUEST",
  "UNAVAILABLE",
]);
export const pricingFlag = pgEnum("pricing_flag", ["NONE", "NEEDS_REVIEW", "FALLBACK_POLICY", "OVERRIDE"]);
export const quoteStatus = pgEnum("quote_status", [
  "SUBMITTED", "UNDER_REVIEW", "OFFERED", "ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED", "CONVERTED",
]);
export const orderStatus = pgEnum("order_status", [
  "PENDING_REVIEW", "AWAITING_PAYMENT", "PAID", "PROCESSING", "PARTIALLY_SHIPPED", "SHIPPED",
  "DELIVERED", "CANCELLED", "REJECTED",
]);
export const orderPaymentStatus = pgEnum("order_payment_status", [
  "UNPAID", "PENDING", "PAID", "FAILED", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED",
]);
export const riskStatus = pgEnum("risk_status", ["NOT_REQUIRED", "PENDING_REVIEW", "APPROVED", "REJECTED"]);
export const paymentMethod = pgEnum("payment_method", ["PAYPAL", "MANUAL_TRANSFER"]);
export const paymentProvider = pgEnum("payment_provider", ["PAYPAL", "MANUAL"]);
export const paymentState = pgEnum("payment_state", [
  "CREATED", "APPROVED", "PENDING", "COMPLETED", "FAILED", "DECLINED", "CANCELLED",
  "PARTIALLY_REFUNDED", "REFUNDED", "REVERSED", "DISPUTED",
]);
export const refundState = pgEnum("refund_state", ["PENDING", "COMPLETED", "FAILED", "CANCELLED"]);
export const shipmentState = pgEnum("shipment_state", [
  "PREPARING", "READY", "IN_TRANSIT", "DELIVERED", "EXCEPTION", "CANCELLED",
]);

export const orderNumberSeq = pgSequence("order_number_seq", { startWith: 1001 });
export const quoteNumberSeq = pgSequence("quote_number_seq", { startWith: 501 });

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const created = () => ts("created_at").notNull().defaultNow();
const money = (name: string) => bigint(name, { mode: "bigint" });

/* ------------------------------------------------------------------ */
/* Access control                                                      */
/* ------------------------------------------------------------------ */
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isStaff: boolean("is_staff").notNull().default(false),
});

export const permissions = pgTable("permissions", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description").notNull().default(""),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: integer("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]);

/* ------------------------------------------------------------------ */
/* Companies, users, sessions                                          */
/* ------------------------------------------------------------------ */
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  legalName: text("legal_name").notNull(),
  tradingName: text("trading_name"),
  countryCode: text("country_code").notNull(),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  /** PERSONAL = individual shopper (self-service sign-up); BUSINESS = company account. */
  accountType: text("account_type").notNull().default("BUSINESS"),
  businessType: text("business_type"),
  website: text("website"),
  businessEmail: text("business_email").notNull(),
  businessPhone: text("business_phone"),
  expectedMonthlyVolume: text("expected_monthly_volume"),
  status: companyStatus("status").notNull().default("PENDING_REVIEW"),
  preferredCurrency: text("preferred_currency").notNull().default("USD"),
  internalNotes: text("internal_notes"),
  approvedAt: ts("approved_at"),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("companies_status_idx").on(t.status)]);

export const companyStatusEvents = pgTable("company_status_events", {
  id: serial("id").primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  fromStatus: companyStatus("from_status"),
  toStatus: companyStatus("to_status").notNull(),
  reason: text("reason"),
  actorUserId: uuid("actor_user_id"),
  createdAt: created(),
}, (t) => [index("cse_company_idx").on(t.companyId)]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "restrict" }),
  roleId: integer("role_id").notNull().references(() => roles.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  jobTitle: text("job_title"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  failedLogins: integer("failed_logins").notNull().default(0),
  lockedUntil: ts("locked_until"),
  lastLoginAt: ts("last_login_at"),
  createdAt: created(),
}, (t) => [index("users_company_idx").on(t.companyId)]);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // SHA-256 of the session token; raw token only lives in the cookie
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: created(),
}, (t) => [index("sessions_user_idx").on(t.userId)]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: created(),
});

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  kind: addressKind("kind").notNull(),
  label: text("label").notNull().default("Primary"),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region"),
  postalCode: text("postal_code"),
  countryCode: text("country_code").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: created(),
}, (t) => [index("addresses_company_idx").on(t.companyId)]);

export const businessDocuments = pgTable("business_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  docType: text("doc_type").notNull(),
  originalName: text("original_name").notNull(),
  storageKey: text("storage_key").notNull().unique(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sha256: text("sha256").notNull(),
  status: documentStatus("status").notNull().default("PENDING"),
  reviewNote: text("review_note"),
  uploadedById: uuid("uploaded_by_id").references(() => users.id),
  createdAt: created(),
}, (t) => [index("docs_company_idx").on(t.companyId)]);

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  imageKey: text("image_key").notNull().default("generic"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type SpecRow = { group: string; label: string; value: string };
export type ProductAttributes = {
  storageGb?: number; ramGb?: number; cpu?: string; gpu?: string; vramGb?: number;
  screenIn?: number; refreshHz?: number; panel?: string; resolution?: string; capacityGb?: number;
  ports?: string; formFactor?: string; [k: string]: string | number | undefined;
};

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  manufacturer: text("manufacturer").notNull(),
  model: text("model").notNull(),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  subcategory: text("subcategory").notNull(),
  condition: productCondition("condition").notNull().default("NEW"),
  summary: text("summary").notNull().default(""),
  specs: jsonb("specs").$type<SpecRow[]>().notNull().default([]),
  attributes: jsonb("attributes").$type<ProductAttributes>().notNull().default({}),
  regionCompatibility: text("region_compatibility"),
  origin: text("origin"),
  shippingRestrictions: text("shipping_restrictions"),
  warrantyInfo: text("warranty_info"),
  warrantyVerified: boolean("warranty_verified").notNull().default(false),
  moq: integer("moq").notNull().default(1),
  orderIncrement: integer("order_increment").notNull().default(1),
  casePack: integer("case_pack"),
  cartonQty: integer("carton_qty"),
  palletQty: integer("pallet_qty"),
  availability: availabilityStatus("availability").notNull().default("ON_REQUEST"),
  availableQty: integer("available_qty"),
  availabilityVerified: boolean("availability_verified").notNull().default(false),
  leadTime: text("lead_time"),
  imageKey: text("image_key").notNull().default("generic"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isSample: boolean("is_sample").notNull().default(true),
  purchasable: boolean("purchasable").notNull().default(false),
  // staff-only
  supplierSku: text("supplier_sku"),
  internalNotes: text("internal_notes"),
  // pricing (base currency, integer minor units)
  baseCurrency: text("base_currency").notNull().default("USD"),
  referencePriceCents: integer("reference_price_cents"),
  referenceSource: text("reference_source"),
  referenceVerifiedAt: ts("reference_verified_at"),
  referenceIsSample: boolean("reference_is_sample").notNull().default(true),
  premiumCents: integer("premium_cents"),
  markupBps: integer("markup_bps"),
  overrideCents: integer("override_cents"),
  wholesaleCents: integer("wholesale_cents").notNull(),
  pricingFlag: pricingFlag("pricing_flag").notNull().default("NONE"),
  pricingNote: text("pricing_note"),
  searchText: text("search_text").notNull().default(""),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [
  index("products_category_idx").on(t.categoryId),
  index("products_manufacturer_idx").on(t.manufacturer),
  index("products_wholesale_idx").on(t.wholesaleCents),
  index("products_search_trgm").using("gin", sql`${t.searchText} gin_trgm_ops`),
]);

export const variants = pgTable("variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  sku: text("sku").notNull().unique(),
  label: text("label").notNull(),
  color: text("color"),
  region: text("region"),
  attributes: jsonb("attributes").$type<Record<string, string>>().notNull().default({}),
  supplierSku: text("supplier_sku"),
  isActive: boolean("is_active").notNull().default(true),
}, (t) => [index("variants_product_idx").on(t.productId)]);

export const priceTiers = pgTable("price_tiers", {
  id: serial("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  minQty: integer("min_qty").notNull(),
  unitCents: integer("unit_cents").notNull(),
}, (t) => [uniqueIndex("price_tiers_product_qty").on(t.productId, t.minQty)]);

export const referencePriceObservations = pgTable("reference_price_observations", {
  id: serial("id").primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  source: text("source").notNull(),
  isSample: boolean("is_sample").notNull().default(true),
  note: text("note"),
  observedAt: ts("observed_at").notNull().defaultNow(),
  createdById: uuid("created_by_id"),
}, (t) => [index("rpo_product_idx").on(t.productId)]);

export const contractPrices = pgTable("contract_prices", {
  id: serial("id").primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  unitCents: integer("unit_cents").notNull(),
  validFrom: ts("valid_from").notNull().defaultNow(),
  validTo: ts("valid_to"),
  note: text("note"),
  createdById: uuid("created_by_id"),
  createdAt: created(),
}, (t) => [uniqueIndex("contract_company_product").on(t.companyId, t.productId)]);

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  base: text("base").notNull(),
  quote: text("quote").notNull(),
  rate: numeric("rate", { precision: 18, scale: 8 }).notNull(),
  source: text("source").notNull(),
  isSample: boolean("is_sample").notNull().default(true),
  effectiveAt: ts("effective_at").notNull().defaultNow(),
  createdById: uuid("created_by_id"),
}, (t) => [index("fx_pair_idx").on(t.base, t.quote, t.effectiveAt)]);

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
  updatedById: uuid("updated_by_id"),
});

/* ------------------------------------------------------------------ */
/* Carts and saved items                                               */
/* ------------------------------------------------------------------ */
export const carts = pgTable("carts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  cartId: uuid("cart_id").notNull().references(() => carts.id, { onDelete: "cascade" }),
  variantId: uuid("variant_id").notNull().references(() => variants.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  addedAt: created(),
}, (t) => [uniqueIndex("cart_items_cart_variant").on(t.cartId, t.variantId)]);

export const savedProducts = pgTable("saved_products", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  createdAt: created(),
}, (t) => [primaryKey({ columns: [t.userId, t.productId] })]);

/* ------------------------------------------------------------------ */
/* Quotes                                                              */
/* ------------------------------------------------------------------ */
export const quotes = pgTable("quotes", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  requestedById: uuid("requested_by_id").notNull().references(() => users.id),
  status: quoteStatus("status").notNull().default("SUBMITTED"),
  currency: text("currency").notNull().default("USD"),
  buyerNotes: text("buyer_notes"),
  internalNotes: text("internal_notes"),
  offerNotes: text("offer_notes"),
  offerExpiresAt: ts("offer_expires_at"),
  offeredAt: ts("offered_at"),
  offeredById: uuid("offered_by_id"),
  respondedAt: ts("responded_at"),
  orderId: uuid("order_id"),
  listTotalBaseCents: money("list_total_base_cents").notNull().default(sql`0`),
  offerTotalBaseCents: money("offer_total_base_cents"),
  offerShippingBaseCents: money("offer_shipping_base_cents"),
  offerShippingMethod: text("offer_shipping_method"),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("quotes_company_idx").on(t.companyId), index("quotes_status_idx").on(t.status)]);

export const quoteItems = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: uuid("quote_id").notNull().references(() => quotes.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  variantId: uuid("variant_id").notNull().references(() => variants.id),
  quantity: integer("quantity").notNull(),
  targetUnitCents: integer("target_unit_cents"),
  listUnitCents: integer("list_unit_cents").notNull(),
  offeredUnitCents: integer("offered_unit_cents"),
  lineNote: text("line_note"),
});

/* ------------------------------------------------------------------ */
/* Orders, payments, refunds, shipments                                */
/* ------------------------------------------------------------------ */
export type AddressSnapshot = {
  contactName: string; phone?: string | null; line1: string; line2?: string | null; city: string;
  region?: string | null; postalCode?: string | null; countryCode: string; companyName: string;
};

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  number: text("number").notNull().unique(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  placedById: uuid("placed_by_id").notNull().references(() => users.id),
  quoteId: uuid("quote_id"),
  status: orderStatus("status").notNull(),
  paymentStatus: orderPaymentStatus("payment_status").notNull().default("UNPAID"),
  riskStatus: riskStatus("risk_status").notNull().default("NOT_REQUIRED"),
  riskReasons: jsonb("risk_reasons").$type<string[]>().notNull().default([]),
  paymentMethod: paymentMethod("payment_method").notNull().default("PAYPAL"),
  baseCurrency: text("base_currency").notNull().default("USD"),
  currency: text("currency").notNull(),
  fxRate: numeric("fx_rate", { precision: 18, scale: 8 }).notNull(),
  fxSource: text("fx_source").notNull(),
  fxIsSample: boolean("fx_is_sample").notNull().default(false),
  subtotalBaseCents: money("subtotal_base_cents").notNull(),
  subtotalCents: money("subtotal_cents").notNull(),
  shippingCents: money("shipping_cents").notNull().default(sql`0`),
  taxRateBps: integer("tax_rate_bps").notNull().default(0),
  taxCents: money("tax_cents").notNull().default(sql`0`),
  totalCents: money("total_cents").notNull(),
  refundedCents: money("refunded_cents").notNull().default(sql`0`),
  poNumber: text("po_number"),
  deliveryInstructions: text("delivery_instructions"),
  shippingMethod: text("shipping_method").notNull().default("To be confirmed"),
  shippingEstimateNote: text("shipping_estimate_note"),
  incoterm: text("incoterm"),
  exportDetails: jsonb("export_details").$type<Record<string, string>>().notNull().default({}),
  shippingAddress: jsonb("shipping_address").$type<AddressSnapshot>().notNull(),
  billingAddress: jsonb("billing_address").$type<AddressSnapshot>().notNull(),
  cancelReason: text("cancel_reason"),
  cancelledAt: ts("cancelled_at"),
  placedAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("orders_company_idx").on(t.companyId), index("orders_status_idx").on(t.status)]);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id),
  variantId: uuid("variant_id").notNull().references(() => variants.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitBaseCents: integer("unit_base_cents").notNull(),
  unitCents: money("unit_cents").notNull(),
  lineCents: money("line_cents").notNull(),
  priceSource: text("price_source").notNull(),
}, (t) => [index("order_items_order_idx").on(t.orderId)]);

export const orderEvents = pgTable("order_events", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  visibleToBuyer: boolean("visible_to_buyer").notNull().default(true),
  actorUserId: uuid("actor_user_id"),
  createdAt: created(),
}, (t) => [index("order_events_order_idx").on(t.orderId)]);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  provider: paymentProvider("provider").notNull(),
  status: paymentState("status").notNull().default("CREATED"),
  amountCents: money("amount_cents").notNull(),
  currency: text("currency").notNull(),
  providerOrderId: text("provider_order_id").unique(),
  providerCaptureId: text("provider_capture_id").unique(),
  providerStatus: text("provider_status"),
  payerId: text("payer_id"),
  manualReference: text("manual_reference"),
  failureReason: text("failure_reason"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  recordedById: uuid("recorded_by_id"),
  capturedAt: ts("captured_at"),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
}, (t) => [index("payments_order_idx").on(t.orderId)]);

export const paymentEvents = pgTable("payment_events", {
  id: serial("id").primaryKey(),
  provider: paymentProvider("provider").notNull(),
  providerEventId: text("provider_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  resourceId: text("resource_id"),
  paymentId: uuid("payment_id"),
  verified: boolean("verified").notNull(),
  result: text("result").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: created(),
});

export const refunds = pgTable("refunds", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  paymentId: uuid("payment_id").notNull().references(() => payments.id),
  status: refundState("status").notNull().default("PENDING"),
  amountCents: money("amount_cents").notNull(),
  currency: text("currency").notNull(),
  reason: text("reason").notNull(),
  providerRefundId: text("provider_refund_id").unique(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  failureReason: text("failure_reason"),
  requestedById: uuid("requested_by_id"),
  createdAt: created(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export type ShipmentLine = { orderItemId: number; quantity: number };
export const shipments = pgTable("shipments", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  reference: text("reference").notNull(),
  carrier: text("carrier"),
  service: text("service"),
  trackingNumber: text("tracking_number"),
  status: shipmentState("status").notNull().default("PREPARING"),
  packageCount: integer("package_count"),
  grossWeightKg: numeric("gross_weight_kg", { precision: 10, scale: 2 }),
  shippingCostCents: money("shipping_cost_cents"),
  insuredValueCents: money("insured_value_cents"),
  insuranceNote: text("insurance_note"),
  specialHandling: text("special_handling"),
  estimatedDelivery: text("estimated_delivery"),
  estimateConfirmed: boolean("estimate_confirmed").notNull().default(false),
  lines: jsonb("lines").$type<ShipmentLine[]>().notNull().default([]),
  shippedAt: ts("shipped_at"),
  deliveredAt: ts("delivered_at"),
  createdAt: created(),
}, (t) => [index("shipments_order_idx").on(t.orderId)]);

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUserId: uuid("actor_user_id"),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  details: jsonb("details").notNull().default({}),
  ip: text("ip"),
  createdAt: created(),
}, (t) => [index("audit_entity_idx").on(t.entityType, t.entityId), index("audit_created_idx").on(t.createdAt)]);

export const emailOutbox = pgTable("email_outbox", {
  id: serial("id").primaryKey(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("QUEUED"),
  error: text("error"),
  createdAt: created(),
  sentAt: ts("sent_at"),
});

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyName: text("company_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  topic: text("topic").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("NEW"),
  createdAt: created(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: ts("window_start").notNull(),
  count: integer("count").notNull(),
});
