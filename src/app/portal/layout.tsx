import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CompareBar } from "@/components/client/CompareToggle";
import { currentActor } from "@/server/http";
import { LogoutButton } from "@/components/client/LogoutButton";

const NAV = [
  ["/portal", "Dashboard"], ["/catalog", "Wholesale catalog"], ["/portal/bulk", "Bulk order builder"], ["/portal/cart", "Cart"],
  ["/portal/quotes", "Quotes & offers"], ["/portal/orders", "Orders"], ["/portal/saved", "Saved products"], ["/portal/compare", "Compare"],
  ["/portal/company", "Company & addresses"],
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const actor = await currentActor();
  if (!actor) redirect("/login?next=/portal");
  if (actor.isStaff) redirect("/admin");
  const approved = actor.companyStatus === "APPROVED";
  const nav = approved ? NAV : NAV.filter(([h]) => h === "/portal" || h === "/portal/company" || h === "/catalog");
  return (
    <>
      <SiteHeader />
      <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-8 py-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="mb-3 rounded-md border border-line bg-white p-4">
            <p className="text-sm font-semibold text-deep-900">{actor.companyName}</p>
            <p className="text-xs text-steel-500">{actor.fullName}</p>
          </div>
          <nav aria-label="Account" className="flex gap-1 overflow-x-auto lg:flex-col">
            {nav.map(([h, l]) => <Link key={h} href={h} className="whitespace-nowrap rounded px-3 py-2 text-sm text-steel-600 hover:bg-white hover:text-deep">{l}</Link>)}
            <LogoutButton />
          </nav>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
      <SiteFooter />
      <CompareBar />
    </>
  );
}
