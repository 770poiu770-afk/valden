import "./load-env";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/db";

async function main() {
  await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
