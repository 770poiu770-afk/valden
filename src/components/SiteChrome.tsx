import Link from "next/link";
import { Logo } from "./Brand";
import { currentActor } from "@/server/http";
import { cartCount } from "@/server/cart";
import { companyInfo } from "@/lib/company";
import { DEPARTMENTS } from "@/lib/catalog-meta";
import { departmentText } from "@/lib/labels";
import { getT } from "@/server/locale";
import { accountActive } from "@/lib/auth";
import type { T } from "@/lib/i18n";
import { LanguageSwitch } from "./client/LanguageSwitch";

const nav = (t: T) => [
  { href: "/catalog", label: t("Catalog", "קטלוג") },
  { href: "/categories", label: t("Categories", "קטגוריות") },
  { href: "/services", label: t("Bulk buying", "קנייה בכמויות") },
  { href: "/quote", label: t("Request a quote", "בקשת הצעת מחיר") },
  { href: "/about", label: t("About", "אודות") },
  { href: "/contact", label: t("Contact", "צור קשר") },
];

export async function SiteHeader() {
  const { t } = await getT();
  const NAV = nav(t);
  const actor = await currentActor();
  const count = actor && !actor.isStaff && accountActive(actor.companyStatus) ? await cartCount(actor.userId) : 0;
  return (
    <header className="border-b border-line bg-white">
      <div className="bg-deep text-[13px] text-deep-100">
        <div className="container-page flex h-9 items-center justify-between gap-4">
          <p className="truncate">{t("Electronics for everyone — from a single unit to bulk orders with volume pricing.", "אלקטרוניקה לכולם — מיחידה אחת ועד הזמנות גדולות במחירי כמות.")}</p>
          <div className="flex shrink-0 items-center gap-4">
            {!actor && <Link href="/register" className="hidden font-semibold text-tag hover:underline sm:block">{t("Create an account", "יצירת חשבון")}</Link>}
            <LanguageSwitch className="inline-flex min-h-6 items-center font-semibold text-white underline-offset-2 hover:underline" />
          </div>
        </div>
      </div>
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6">
        <Logo label={t("Valden — home", "Valden — דף הבית")} />
        <nav aria-label={t("Main", "ראשי")} className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => <Link key={n.href} href={n.href} className="rounded px-3 py-2 text-sm font-medium text-steel-600 hover:bg-paper hover:text-deep">{n.label}</Link>)}
        </nav>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!actor && (<>
            <Link href="/login" className="btn-ghost btn-sm hidden sm:inline-flex">{t("Sign in", "כניסה")}</Link>
            <Link href="/register" className="btn-primary btn-sm">{t("Sign up", "הרשמה")}</Link>
          </>)}
          {actor?.isStaff && <Link href="/admin" className="btn-deep btn-sm">{t("Admin", "ניהול")}</Link>}
          {actor && !actor.isStaff && (<>
            {accountActive(actor.companyStatus) && (
              <Link href="/portal/cart" className="btn-outline btn-sm" aria-label={t(`Cart, ${count} lines`, `סל, ${count} שורות`)}>
                <span aria-hidden>{t("Cart", "סל")}</span> <span aria-hidden className="num rounded-sm bg-deep px-1.5 text-xs text-white">{count}</span>
              </Link>
            )}
            <Link href="/portal" className="btn-deep btn-sm hidden sm:inline-flex">{t("My account", "החשבון שלי")}</Link>
          </>)}
          <details className="relative lg:hidden">
            <summary className="btn-ghost btn-sm cursor-pointer list-none px-2">{t("Menu", "תפריט")}</summary>
            <div className="absolute end-0 z-30 mt-2 w-60 rounded-md border border-line bg-white p-2 shadow-lg">
              {NAV.map((n) => <Link key={n.href} href={n.href} className="block rounded px-3 py-2 text-sm hover:bg-paper">{n.label}</Link>)}
              {!actor && <Link href="/login" className="block rounded px-3 py-2 text-sm hover:bg-paper">{t("Sign in", "כניסה")}</Link>}
              {actor && !actor.isStaff && <Link href="/portal" className="block rounded px-3 py-2 text-sm font-semibold hover:bg-paper">{t("My account", "החשבון שלי")}</Link>}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const { l, t } = await getT();
  const c = companyInfo();
  return (
    <footer className="mt-24 bg-deep-900 text-deep-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo inverted label={t("Valden — home", "Valden — דף הבית")} />
          <p className="mt-4 max-w-xs text-sm text-deep-200">{t("Electronics for shoppers and businesses — buy one unit or thousands, with automatic volume pricing.", "אלקטרוניקה לקונים פרטיים ולעסקים — יחידה אחת או אלפים, עם מחירי כמות אוטומטיים.")}</p>
          <div className="mt-5 space-y-1 text-sm">
            {c.legalName && <p className="text-white">{c.legalName}</p>}
            {c.address && <p>{c.address}</p>}
            {c.email && <p><a className="hover:text-white" href={`mailto:${c.email}`}>{c.email}</a></p>}
            {c.phone && <p>{c.phone}</p>}
          </div>
        </div>
        <FooterCol title={t("Departments", "מחלקות")} links={DEPARTMENTS.map((x) => [`/catalog?dept=${x.slug}`, departmentText(x, l).name])} />
        <FooterCol title={t("Shop", "קנייה")} links={[["/register", t("Create an account", "יצירת חשבון")], ["/login", t("Sign in", "כניסה")], ["/quote", t("Request a quote", "בקשת הצעת מחיר")], ["/services", t("Bulk & business buying", "קנייה בכמויות ולעסקים")], ["/faq", t("FAQ", "שאלות נפוצות")], ["/contact", t("Contact us", "צור קשר")]]} />
        <FooterCol title={t("Policies", "מדיניות")} links={[["/policies/shipping", t("Shipping policy", "מדיניות משלוחים")], ["/policies/returns", t("Returns & refunds", "החזרות והחזרים כספיים")], ["/terms", t("Terms of sale", "תנאי מכירה")], ["/privacy", t("Privacy policy", "מדיניות פרטיות")], ["/accessibility", t("Accessibility statement", "הצהרת נגישות")], ["/about", t("About Valden", "אודות Valden")]]} />
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-deep-200 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} {c.legalName ?? "Valden"}. {t("Product names and trademarks belong to their respective owners; their use does not imply endorsement or an authorised-distributor relationship.", "שמות המוצרים והסימנים המסחריים שייכים לבעליהם; השימוש בהם אינו מעיד על המלצה או על מעמד של מפיץ מורשה.")}</p>
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
