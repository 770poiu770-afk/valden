/**
 * Automated accessibility and responsive check (a first pass — not a substitute for a manual audit
 * with screen readers by a qualified accessibility tester).
 *
 *   BASE_URL=http://localhost:3000 BUYER_EMAIL=… BUYER_PASSWORD=… ADMIN_EMAIL=… ADMIN_PASSWORD=… \
 *     npx tsx scripts/a11y-audit.ts [--shots dir]
 *
 * For each page, desktop (1280px) and mobile (375px):
 *   - axe-core rules for WCAG 2.0/2.1/2.2 A and AA
 *   - horizontal overflow at 320 CSS px (equivalent to 400% zoom reflow, WCAG 1.4.10)
 *   - text-spacing / 200% text resize: no clipped overflow after enlarging root font size
 *   - keyboard: the first 25 Tab stops all show a visible focus indicator and none are hidden
 *   - --lang he runs everything in Hebrew (right-to-left)
 */
import { chromium, type Page, type BrowserContext } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const langIdx = process.argv.indexOf("--lang");
const LANG = langIdx > -1 ? process.argv[langIdx + 1] : "en";
const shotsIdx = process.argv.indexOf("--shots");
const SHOTS = shotsIdx > -1 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

type Finding = { page: string; viewport: string; kind: string; detail: string };
const findings: Finding[] = [];

async function login(ctx: BrowserContext, email: string, password: string) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/login`);
  await p.locator("#email").fill(email);
  await p.locator("#password").fill(password);
  await p.locator("form button[type=submit]").click();
  await p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  await p.close();
}

async function checkPage(page: Page, path: string, vp: string) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  if (!res || res.status() >= 400) { findings.push({ page: path, viewport: vp, kind: "http", detail: `status ${res?.status()}` }); return; }
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
  for (const v of axe.violations) {
    findings.push({ page: path, viewport: vp, kind: `axe:${v.id} (${v.impact})`, detail: `${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}${v.nodes.length > 3 ? ` (+${v.nodes.length - 3})` : ""}` });
  }
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp}${path.replace(/[/?=&]+/g, "_") || "_home"}.png`, fullPage: false });

  if (vp === "desktop") {
    // Keyboard: tab through and verify a visible focus indicator.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const visibleFocus = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
        const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || el.tagName).trim().slice(0, 40);
        return { visibleFocus, offscreen: r.width === 0 || r.height === 0, label, tag: el.tagName };
      });
      if (!info) break;
      if (!info.visibleFocus) findings.push({ page: path, viewport: vp, kind: "keyboard:no-focus-indicator", detail: `${info.tag} "${info.label}"` });
      if (info.offscreen && info.label !== "Skip to content") findings.push({ page: path, viewport: vp, kind: "keyboard:invisible-focus-target", detail: `${info.tag} "${info.label}"` });
    }
    // 200% text resize: enlarge root font and look for horizontal overflow.
    const overflowText = await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
      const o = document.documentElement.scrollWidth > window.innerWidth + 1;
      document.documentElement.style.fontSize = "";
      return o;
    });
    if (overflowText) findings.push({ page: path, viewport: vp, kind: "resize:200%-text-overflows", detail: "Horizontal scrolling appears when text is enlarged to 200%" });
  } else {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) findings.push({ page: path, viewport: vp, kind: "reflow:horizontal-scroll", detail: `${overflow}px wider than the viewport` });
  }
}

async function run() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? undefined });
  const publicPages = ["/", "/catalog", "/catalog?dept=audio", "/categories", "/products/apple-airpods-pro-3", "/register", "/login", "/contact", "/accessibility", "/quote", "/forgot-password", "/faq", "/policies/returns", "/terms"];
  const buyerPages = ["/portal", "/catalog?dept=phones", "/portal/cart", "/portal/checkout", "/portal/orders", "/portal/bulk", "/portal/company"];
  const adminPages = ["/admin", "/admin/orders", "/admin/products"];
  const groups: [string, string[], (c: BrowserContext) => Promise<void>][] = [
    ["guest", publicPages, async () => {}],
    ["buyer", buyerPages, async (c) => { if (process.env.BUYER_EMAIL) await login(c, process.env.BUYER_EMAIL, process.env.BUYER_PASSWORD!); }],
    ["admin", adminPages, async (c) => { if (process.env.ADMIN_EMAIL) await login(c, process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD!); }],
  ];
  for (const [role, pages, auth] of groups) {
    if (role !== "guest" && !process.env[`${role.toUpperCase()}_EMAIL`]) continue;
    for (const [vp, size] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 320, height: 720 }]] as const) {
      const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 1 });
      await ctx.addCookies([{ name: "vld_lang", value: LANG, url: BASE }]);
      await auth(ctx);
      const page = await ctx.newPage();
      for (const p of pages) { try { await checkPage(page, p, `${vp}-${role}`); } catch (e) { findings.push({ page: p, viewport: vp, kind: "error", detail: (e as Error).message.slice(0, 200) }); } }
      await ctx.close();
    }
  }
  await browser.close();
  const grouped = new Map<string, Finding[]>();
  for (const f of findings) grouped.set(f.kind, [...(grouped.get(f.kind) ?? []), f]);
  for (const [kind, list] of grouped) {
    console.log(`\n## ${kind} — ${list.length}`);
    for (const f of list.slice(0, 8)) console.log(`  [${f.viewport}] ${f.page}: ${f.detail}`);
  }
  console.log(`\nTotal findings: ${findings.length}`);
  process.exitCode = findings.length ? 1 : 0;
}
run();
