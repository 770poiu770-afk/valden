/** Structured JSON logger. Never pass secrets, tokens, passwords or full payment payloads. */
type Level = "debug" | "info" | "warn" | "error";
const REDACT = /pass(word)?|secret|token|authorization|cookie|card|cvv|signature/i;

function scrub(v: unknown, depth = 0): unknown {
  if (depth > 4 || v === null || typeof v !== "object") return typeof v === "bigint" ? v.toString() : v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => scrub(x, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = REDACT.test(k) ? "[redacted]" : scrub(val, depth + 1);
  return out;
}

function write(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && level === "debug") return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...(ctx ? (scrub(ctx) as object) : {}) });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const log = {
  debug: (m: string, c?: Record<string, unknown>) => write("debug", m, c),
  info: (m: string, c?: Record<string, unknown>) => write("info", m, c),
  warn: (m: string, c?: Record<string, unknown>) => write("warn", m, c),
  error: (m: string, c?: Record<string, unknown>) => write("error", m, c),
};
