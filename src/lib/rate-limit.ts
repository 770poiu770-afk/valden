import { sql } from "drizzle-orm";
import { db } from "@/db";
import { tooMany } from "./errors";

/**
 * Fixed-window rate limiter stored in Postgres so it works across multiple app instances.
 * Returns true when allowed.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const res = await db.execute(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
    RETURNING count`);
  const count = Number((res.rows[0] as { count: number }).count);
  return count <= limit;
}

export async function enforceRateLimit(key: string, limit: number, windowSec: number) {
  if (process.env.DISABLE_RATE_LIMIT === "true" && process.env.NODE_ENV !== "production") return;
  if (!(await rateLimit(key, limit, windowSec))) throw tooMany();
}
