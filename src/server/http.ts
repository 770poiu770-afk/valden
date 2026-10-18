import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, forbidden } from "@/lib/errors";
import { actorFromToken, SESSION_COOKIE, type Actor } from "@/lib/auth";
import { log } from "@/lib/log";
import { trMessage } from "@/lib/messages-he";
import type { Locale } from "@/lib/i18n";
import { getLocale } from "./locale";

export async function currentActor(): Promise<Actor | null> {
  const c = await cookies();
  return actorFromToken(c.get(SESSION_COOKIE)?.value);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim().slice(0, 64);
}

/** CSRF defence for cookie-authenticated mutations: require same-origin Origin/Referer. */
export function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) throw forbidden("Missing origin.");
  let o: URL;
  try { o = new URL(origin); } catch { throw forbidden("Invalid origin."); }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const allowed = new Set([host, process.env.APP_URL ? new URL(process.env.APP_URL).host : null].filter(Boolean));
  if (!allowed.has(o.host)) throw forbidden("Cross-origin request blocked.");
}

/** Parse JSON or form bodies into a plain object; repeated form keys become arrays. */
export async function readBody(req: NextRequest): Promise<Record<string, unknown>> {
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const text = await req.text();
    if (text.length > 2_000_000) throw new AppError(413, "Request body too large.");
    return text ? JSON.parse(text) : {};
  }
  if (ct.includes("form")) {
    const fd = await req.formData();
    const out: Record<string, unknown> = {};
    for (const [k, v] of fd.entries()) {
      if (typeof v !== "string") continue;
      if (k in out) out[k] = ([] as unknown[]).concat(out[k], v);
      else out[k] = v;
    }
    return out;
  }
  return {};
}

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data);
}

type Ctx<P> = { req: NextRequest; params: P; actor: Actor | null };

/** Wrap a route handler: same-origin check, actor resolution, uniform error JSON. */
export function route<P = Record<string, string>>(fn: (ctx: Ctx<P>) => Promise<unknown>, opts: { csrf?: boolean } = {}) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    let actor: Actor | null = null;
    // Staff use the English-only admin; buyers get messages in their chosen language.
    const lang = async (): Promise<Locale> => (actor?.isStaff ? "en" : await getLocale().catch(() => "en" as Locale));
    try {
      if (opts.csrf !== false) assertSameOrigin(req);
      actor = await currentActor();
      const params = (await context?.params) ?? ({} as P);
      const result = await fn({ req, params, actor });
      if (isNativeFormPost(req)) return await nativeSuccess(req, result);
      if (result instanceof Response) return result;
      return NextResponse.json(jsonSafe(translateResult(result ?? { ok: true }, await lang())));
    } catch (e) {
      const l = await lang();
      if (isNativeFormPost(req)) return nativeError(req, e, l);
      return errorResponse(e, l);
    }
  };
}

/**
 * A form submitted by the browser itself (before JavaScript has loaded, or with JS disabled).
 * Forms always use method="post", so credentials never end up in a URL; here we answer with a
 * redirect instead of JSON so the user lands on a normal page.
 */
function isNativeFormPost(req: NextRequest) {
  const ct = req.headers.get("content-type") ?? "";
  return req.method === "POST" && (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) && (req.headers.get("accept") ?? "").includes("text/html");
}
/** Public origin for redirects — behind Railway's proxy req.url carries the internal host. */
const publicBase = (req: NextRequest) => process.env.APP_URL || req.url;
function backTo(req: NextRequest) {
  const ref = req.headers.get("referer");
  try { const u = ref ? new URL(ref) : null; return u ? `${u.pathname}${u.search}` : "/"; } catch { return "/"; }
}
async function nativeSuccess(req: NextRequest, result: unknown) {
  let body: unknown = result;
  let cookies: string[] = [];
  if (result instanceof Response) {
    cookies = result.headers.getSetCookie?.() ?? [];
    body = await result.clone().json().catch(() => ({}));
  }
  const to = (body as { redirect?: unknown })?.redirect;
  const target = typeof to === "string" && to.startsWith("/") && !to.startsWith("//") ? to : backTo(req);
  const res = NextResponse.redirect(new URL(target, publicBase(req)), 303);
  for (const c of cookies) res.headers.append("set-cookie", c);
  return res;
}
function nativeError(req: NextRequest, e: unknown, l: Locale = "en") {
  const msg = e instanceof AppError ? trMessage(e.message, l) ?? e.message : e instanceof ZodError ? (l === "he" ? "בדקו את הטופס ונסו שוב." : "Please check the form and try again.") : (l === "he" ? "משהו השתבש. נסו שוב." : "Something went wrong. Please try again.");
  if (!(e instanceof AppError) && !(e instanceof ZodError)) log.error("unhandled_route_error", { message: (e as Error)?.message });
  const u = new URL(backTo(req), publicBase(req));
  u.searchParams.set("error", msg.slice(0, 200));
  return NextResponse.redirect(u, 303);
}

export function errorResponse(e: unknown, l: Locale = "en") {
  const tr = (m: string) => trMessage(m, l) ?? m;
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of e.issues) fields[i.path.join(".") || "_"] ??= i.message;
    const first = e.issues[0];
    return NextResponse.json({ error: tr(first ? `${first.path.join(".") ? first.path.join(".") + ": " : ""}${first.message}` : "Invalid input."), fields }, { status: 400 });
  }
  if (e instanceof AppError) return NextResponse.json({ error: tr(e.message), code: e.code, details: translateDetails(e.details, l) ?? undefined }, { status: e.status });
  if (e instanceof SyntaxError) return NextResponse.json({ error: tr("Malformed request body.") }, { status: 400 });
  log.error("unhandled_route_error", { message: (e as Error)?.message, stack: (e as Error)?.stack?.split("\n").slice(0, 4).join(" | ") });
  return NextResponse.json({ error: tr("Something went wrong. Our team has been notified.") }, { status: 500 });
}

function translateDetails(d: unknown, l: Locale) {
  return Array.isArray(d) ? d.map((x) => (typeof x === "string" ? trMessage(x, l) ?? x : x)) : d;
}
function translateResult(r: unknown, l: Locale) {
  if (l === "en" || !r || typeof r !== "object" || Array.isArray(r)) return r;
  const o = { ...(r as Record<string, unknown>) };
  if (typeof o.message === "string") o.message = trMessage(o.message, l);
  if (o.details) o.details = translateDetails(o.details, l);
  return o;
}

export function jsonSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val)));
}
