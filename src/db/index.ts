import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __valdenPool?: Pool };

/**
 * The pool connects lazily (on first query), so `next build` can run without a database —
 * Railway, like most Docker builders, does not expose runtime variables during the image build.
 */
function makePool() {
  const url = process.env.DATABASE_URL;
  if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn(JSON.stringify({ level: "warn", msg: "DATABASE_URL is not set; database queries will fail" }));
  }
  return new Pool({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) });
}

export const pool = globalForDb.__valdenPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.__valdenPool = pool;

export const db = drizzle(pool, { schema });
export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
export type DbOrTx = DB | Tx;
export { schema };
