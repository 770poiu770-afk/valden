import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { ZodError, type ZodTypeAny, type z } from "zod";
import { AppError, forbidden } from "@/lib/errors";
import { actorFromToken, SESSION_COOKIE, type Actor } from "@/lib/auth";
import { log } from "@/lib/log";

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
    try {
      if (opts.csrf !== false) assertSameOrigin(req);
      const actor = await currentActor();
      const params = (await context?.params) ?? ({} as P);
      const result = await fn({ req, params, actor });
      if (result instanceof Response) return result;
      return NextResponse.json(jsonSafe(result ?? { ok: true }));
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export function errorResponse(e: unknown) {
  if (e instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const i of e.issues) fields[i.path.join(".") || "_"] ??= i.message;
    const first = e.issues[0];
    return NextResponse.json({ error: first ? `${first.path.join(".") ? first.path.join(".") + ": " : ""}${first.message}` : "Invalid input.", fields }, { status: 400 });
  }
  if (e instanceof AppError) return NextResponse.json({ error: e.message, code: e.code, details: e.details ?? undefined }, { status: e.status });
  if (e instanceof SyntaxError) return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  log.error("unhandled_route_error", { message: (e as Error)?.message, stack: (e as Error)?.stack?.split("\n").slice(0, 4).join(" | ") });
  return NextResponse.json({ error: "Something went wrong. Our team has been notified." }, { status: 500 });
}

export function jsonSafe<T>(v: T): T {
  return JSON.parse(JSON.stringify(v, (_k, val) => (typeof val === "bigint" ? val.toString() : val)));
}
