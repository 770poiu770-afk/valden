/**
 * Money is always handled as integer minor units (cents / agorot).
 * Exchange rates are decimal strings with up to 8 fractional digits and are applied with
 * BigInt arithmetic — no floating point touches a monetary amount.
 */
export const SUPPORTED_CURRENCIES = ["USD", "EUR", "ILS"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];
export const BASE_CURRENCY: Currency = "USD";

export const CURRENCY_META: Record<Currency, { symbol: string; locale: string; name: string }> = {
  USD: { symbol: "$", locale: "en-US", name: "US Dollar" },
  EUR: { symbol: "€", locale: "de-DE", name: "Euro" },
  ILS: { symbol: "₪", locale: "he-IL", name: "Israeli New Shekel" },
};

export function isCurrency(v: unknown): v is Currency {
  return typeof v === "string" && (SUPPORTED_CURRENCIES as readonly string[]).includes(v);
}

const RATE_SCALE = 100_000_000n; // 1e8

/** Parse "3.65" → 365000000n (scaled by 1e8). Rejects malformed input. */
export function parseRate(rate: string): bigint {
  const s = String(rate).trim();
  if (!/^\d+(\.\d{1,8})?$/.test(s)) throw new Error(`Invalid exchange rate: ${rate}`);
  const [int, frac = ""] = s.split(".");
  return BigInt(int) * RATE_SCALE + BigInt((frac + "00000000").slice(0, 8));
}

/** Divide with round-half-up for non-negative operands (half away from zero for negatives). */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error("Division by zero");
  const neg = (n < 0n) !== (d < 0n);
  const an = n < 0n ? -n : n;
  const ad = d < 0n ? -d : d;
  const q = (an * 2n + ad) / (2n * ad);
  return neg ? -q : q;
}

/** Convert minor units using a decimal rate string (quote per 1 base). */
export function convertMinor(amount: bigint, rate: string): bigint {
  return divRound(amount * parseRate(rate), RATE_SCALE);
}

/** Inverse conversion (quote → base). */
export function convertMinorInverse(amount: bigint, rate: string): bigint {
  return divRound(amount * RATE_SCALE, parseRate(rate));
}

/** Apply basis points (1/100 of a percent): amount * (10000 + bps) / 10000, rounded. */
export function applyBps(amount: bigint, bps: number): bigint {
  return divRound(amount * BigInt(10_000 + bps), 10_000n);
}

export function percentOfBps(amount: bigint, bps: number): bigint {
  return divRound(amount * BigInt(bps), 10_000n);
}

export function toBig(v: bigint | number | string | null | undefined): bigint {
  if (v === null || v === undefined) return 0n;
  if (typeof v === "bigint") return v;
  if (typeof v === "number") {
    if (!Number.isSafeInteger(v)) throw new Error(`Unsafe integer for money: ${v}`);
    return BigInt(v);
  }
  if (!/^-?\d+$/.test(v)) throw new Error(`Invalid minor-unit string: ${v}`);
  return BigInt(v);
}

/** Minor units → fixed 2-decimal string (e.g. for PayPal "value"). */
export function minorToDecimalString(minor: bigint): string {
  const neg = minor < 0n;
  const a = neg ? -minor : minor;
  const s = `${a / 100n}.${(a % 100n).toString().padStart(2, "0")}`;
  return neg ? `-${s}` : s;
}

/** "1,234.56" / "1234.5" / "1234" → minor units. Throws for invalid input. */
export function decimalStringToMinor(input: string): bigint {
  const s = String(input).replace(/[,\s]/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${input}`);
  const neg = s.startsWith("-");
  const [int, frac = ""] = s.replace("-", "").split(".");
  const v = BigInt(int) * 100n + BigInt((frac + "00").slice(0, 2));
  return neg ? -v : v;
}

export function formatMoney(minor: bigint | number, currency: string, opts: { compact?: boolean } = {}): string {
  const cur = isCurrency(currency) ? currency : "USD";
  const big = typeof minor === "bigint" ? minor : BigInt(Math.round(minor));
  const neg = big < 0n;
  const abs = neg ? -big : big;
  const whole = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sym = CURRENCY_META[cur].symbol;
  const body = opts.compact && abs >= 100_000_00n ? `${grouped}` : `${grouped}.${cents}`;
  return `${neg ? "−" : ""}${sym}${body}`;
}
