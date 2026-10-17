import Link from "next/link";
import { Logo } from "@/components/Brand";
import { requireStaff } from "@/server/guards";
import { LogoutButton } from "@/components/client/LogoutButton";
import type { Permission } from "@/lib/rbac";

const NAV: { group: string; items: [string, string, Permission][] }[] = [
  { group: "Overview", items: [["/admin", "Dashboard", "admin.access"]] },
  { group: "Customers", items: [["/admin/companies", "Business accounts", "companies.review"], ["/admin/inquiries", "Enquiries", "customers.manage"]] },
  { group: "Catalog", items: [["/admin/products", "Products & SKUs", "catalog.manage"], ["/admin/pricing", "Pricing", "pricing.manage"], ["/admin/import", "Catalog import", "catalog.manage"]] },
  { group: "Sales", items: [["/admin/quotes", "Quotes", "quotes.manage"], ["/admin/orders", "Orders", "orders.manage"]] },
  { group: "Finance", items: [["/admin/payments", "Payments", "payments.view"], ["/admin/refunds", "Refunds", "payments.view"]] },
  { group: "Logistics", items: [["/admin/shipments", "Shipments", "shipping.manage"]] },
  { group: "System", items: [["/admin/users", "Users", "users.manage"], ["/admin/roles", "Roles & permissions", "users.manage"], ["/admin/settings", "Settings", "settings.manage"], ["/admin/audit", "Audit log", "audit.view"], ["/admin/outbox", "Email outbox", "settings.manage"]] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const a = await requireStaff();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-white/10 bg-deep-900 text-deep-100 lg:min-h-screen lg:border-b-0">
        <div className="flex items-center justify-between px-5 py-4"><Logo inverted href="/admin" /><span className="rounded-sm bg-tag px-1.5 py-0.5 text-[11px] font-bold text-deep-900">Admin</span></div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-4 lg:pb-6">
          {NAV.map((g) => {
            const items = g.items.filter(([, , p]) => a.permissions.has(p));
            if (!items.length) return null;
            return (
              <div key={g.group} className="flex gap-1 lg:block">
                <p className="hidden px-2 pb-1 text-xs text-deep-200 lg:block">{g.group}</p>
                {items.map(([h, l]) => <Link key={h} href={h} className="block whitespace-nowrap rounded px-2 py-1.5 text-sm hover:bg-white/10 hover:text-white">{l}</Link>)}
              </div>
            );
          })}
        </nav>
        <div className="hidden border-t border-white/10 px-5 py-4 text-xs lg:block">
          <p className="text-white">{a.fullName}</p><p className="text-deep-200">{a.roleKey.replace("_", " ").toLowerCase()}</p>
          <div className="mt-2 flex gap-3"><Link href="/" className="hover:text-white">View site</Link><LogoutButton className="hover:text-white" /></div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
