/**
 * Role/permission catalogue. This is the source of truth used to seed the `roles`,
 * `permissions` and `role_permissions` tables; at runtime permissions are read from the
 * database so administrators can adjust the matrix (changes are audited).
 */
export const PERMISSIONS = {
  "catalog.view_prices": "View wholesale prices (approved buyers)",
  "orders.place": "Place orders and manage the company cart",
  "quotes.request": "Request and accept wholesale quotations",
  "company.manage": "Manage company profile, addresses and documents",
  "admin.access": "Access the administrative portal",
  "companies.review": "Approve, reject and suspend business accounts",
  "customers.manage": "Manage customer companies and their users",
  "catalog.manage": "Create and edit products, variants and availability",
  "pricing.manage": "Manage reference prices, pricing policy, tiers and contract pricing",
  "quotes.manage": "Respond to quote requests and issue offers",
  "orders.manage": "Review, confirm, cancel and update orders",
  "payments.view": "View payments and payment events",
  "payments.manage": "Record manual payments and issue refunds",
  "shipping.manage": "Create and update shipments",
  "audit.view": "View the audit log",
  "users.manage": "Manage staff users, roles and permissions",
  "settings.manage": "Configure currencies, exchange rates, taxes and order rules",
} as const;
export type Permission = keyof typeof PERMISSIONS;

export const ROLES: Record<string, { name: string; description: string; isStaff: boolean; permissions: Permission[] }> = {
  BUYER_ADMIN: {
    name: "Buyer administrator",
    description: "Primary purchasing contact for a customer company",
    isStaff: false,
    permissions: ["catalog.view_prices", "orders.place", "quotes.request", "company.manage"],
  },
  BUYER: {
    name: "Buyer",
    description: "Purchasing user within a customer company",
    isStaff: false,
    permissions: ["catalog.view_prices", "orders.place", "quotes.request"],
  },
  SUPER_ADMIN: {
    name: "Super administrator",
    description: "Full administrative access",
    isStaff: true,
    permissions: Object.keys(PERMISSIONS).filter((p) => !["orders.place", "quotes.request", "company.manage"].includes(p)) as Permission[],
  },
  SALES: {
    name: "Sales desk",
    description: "Account reviews, quotes and order confirmation",
    isStaff: true,
    permissions: ["admin.access", "catalog.view_prices", "companies.review", "customers.manage", "quotes.manage", "orders.manage", "payments.view"],
  },
  CATALOG: {
    name: "Catalog & pricing",
    description: "Product data, availability and pricing",
    isStaff: true,
    permissions: ["admin.access", "catalog.view_prices", "catalog.manage", "pricing.manage"],
  },
  FINANCE: {
    name: "Finance",
    description: "Payments, reconciliation and refunds",
    isStaff: true,
    permissions: ["admin.access", "catalog.view_prices", "payments.view", "payments.manage", "audit.view"],
  },
  FULFILLMENT: {
    name: "Fulfillment",
    description: "Shipments and delivery status",
    isStaff: true,
    permissions: ["admin.access", "shipping.manage", "payments.view"],
  },
};
