import { NextResponse } from "next/server";
import { pool } from "@/db";

export const dynamic = "force-dynamic";

/** Liveness + database check used by the Railway health check. Exposes no configuration details. */
export async function GET() {
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "database_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
