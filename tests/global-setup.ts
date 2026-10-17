import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://meridian:devpass@localhost:5432/valden_test";
  process.env.DATABASE_URL = url;
  const pool = new Pool({ connectionString: url });
  await pool.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  const { bootstrapReferenceData } = await import("../src/server/bootstrap");
  const { importProducts } = await import("../src/server/catalog-import");
  const { pool: appPool } = await import("../src/db");
  await bootstrapReferenceData();
  const catalog = JSON.parse(readFileSync("data/catalog.json", "utf8"));
  const r = await importProducts(catalog.products);
  if (r.errors.length) throw new Error("Catalog import failed: " + JSON.stringify(r.errors.slice(0, 3)));
  await appPool.end();
}
