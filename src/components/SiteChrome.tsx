import Link from "next/link";
import { Logo } from "./Brand";
import { currentActor } from "@/server/http";
import { cartCount } from "@/server/cart";
import { companyInfo } from "@/lib/company";
import { CATEGORIES } from "@/lib/catalog-meta";

const NAV = [
  { href: "/catalog", label: "Catalog" },
  { href: "/categories", label: "Categories" },
  { href: "/services", label: "Wholesale services" },
  { href: "/quote", label: "Request a quote" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const actor = await currentActor();
  const count = actor && !actor.isStaff && actor.companyStatus === "APPROVED" ? await cartCount(actor.userId) : 0;
  return (
    <header className="border-b border-line bg-white">
      <div className="bg-deep text-[13px] text-deep-100">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <p className="truncate">Trade accounts only — wholesale pricing is shown to verified business buyers.</p>
          {!actor && <Link href="/register" className="hidden shrink-0 font-semibold text-tag hover:underline sm:block">Open a trade account</Link>}
        </div>
      </div>
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded px-3 py-2 text-sm font-medium text-steel-600 hover:bg-paper hover:text-deep">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!actor && (<>
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href="/register" className="btn-primary btn-sm">Register business</Link>
          </>)}
          {actor?.isStaff && <Link href="/admin" className="btn-deep btn-sm">Admin</Link>}
          {actor && !actor.isStaff && (<>
            {actor.companyStatus === "APPROVED" && (
              <Link href="/portal/cart" className="btn-outline btn-sm" aria-label={`Cart, ${count} lines`}>
                <span className="hidden sm:inline">Cart</span><span className="sm:hidden" aria-hidden>Cart</span> <span className="num rounded-sm bg-deep px-1.5 text-xs text-white">{count}</span>
              </Link>
            )}
            <Link href="/portal" className="btn-deep btn-sm"><span className="hidden sm:inline">My account</span><span className="sm:hidden">Account</span></Link>
          </>)}
          <details className="relative lg:hidden">
            <summary className="btn-ghost btn-sm cursor-pointer list-none px-2" aria-label="Menu">Menu</summary>
            <div className="absolute right-0 z-30 mt-2 w-60 rounded-md border border-line bg-white p-2 shadow-lg">
              {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded px-3 py-2 text-sm hover:bg-paper">{n.label}</Link>)}
              {!actor && <Link href="/login" className="block rounded px-3 py-2 text-sm hover:bg-paper">Sign in</Link>}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const c = companyInfo();
  return (
    <footer className="mt-24 bg-deep-900 text-deep-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-xs text-sm text-deep-200">Wholesale electronics for registered businesses. Every account is verified before pricing and ordering are enabled.</p>
          <div className="mt-5 space-y-1 text-sm">
            {c.legalName && <p className="text-white">{c.legalName}</p>}
            {c.address && <p>{c.address}</p>}
            {c.email && <p><a className="hover:text-white" href={`mailto:${c.email}`}>{c.email}</a></p>}
            {c.phone && <p>{c.phone}</p>}
          </div>
        </div>
        <FooterCol title="Catalog" links={CATEGORIES.slice(0, 7).map((x) => [`/catalog?category=${x.slug}`, x.name])} />
        <FooterCol title="Trade" links={[["/register", "Register a business"], ["/login", "Sign in"], ["/quote", "Request a quote"], ["/services", "Wholesale services"], ["/faq", "FAQ"], ["/contact", "Contact the trade desk"]]} />
        <FooterCol title="Policies" links={[["/policies/shipping", "Shipping policy"], ["/policies/returns", "Returns & refunds"], ["/terms", "Terms of trade"], ["/privacy", "Privacy policy"], ["/about", "About Valden"]]} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-deep-200 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {c.legalName ?? "Valden"}. Product names and trademarks belong to their respective owners; their use does not imply endorsement or an authorised-distributor relationship.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      <ul className="space-y-2 text-sm">{links.map(([h, l]) => <li key={h}><Link href={h} className="hover:text-white">{l}</Link></li>)}</ul>
    </div>
  );
}
