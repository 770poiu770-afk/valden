import { eq } from "drizzle-orm";
import { route } from "@/server/http";
import { db } from "@/db";
import { businessDocuments } from "@/db/schema";
import { readUpload } from "@/server/uploads";
import { assertActor } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { notFound } from "@/lib/errors";

/** Verification documents: owner company or reviewing staff only. Always served as attachment. */
export const GET = route<{ id: string }>(async ({ params, actor }) => {
  assertActor(actor);
  if (!/^[0-9a-f-]{36}$/.test(params.id)) throw notFound();
  const d = (await db.select().from(businessDocuments).where(eq(businessDocuments.id, params.id)))[0];
  const staffOk = actor.isStaff && (actor.permissions.has("companies.review") || actor.permissions.has("customers.manage"));
  if (!d || (!staffOk && d.companyId !== actor.companyId)) throw notFound();
  const buf = await readUpload(d.storageKey);
  if (actor.isStaff) await audit(actor, "document.view", "document", d.id, { companyId: d.companyId });
  return new Response(new Uint8Array(buf), { headers: {
    "Content-Type": d.mimeType, "Content-Disposition": `attachment; filename="${d.originalName.replace(/"/g, "")}"`,
    "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}, { csrf: false });
