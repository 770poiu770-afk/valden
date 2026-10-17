import { route } from "@/server/http";
import { db } from "@/db";
import { businessDocuments } from "@/db/schema";
import { storeUpload, DOC_TYPES } from "@/server/uploads";
import { assertCan } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { badRequest } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";

export const POST = route(async ({ req, actor }) => {
  assertCan(actor, "company.manage");
  await enforceRateLimit(`docupload:${actor.userId}`, 20, 3600);
  const fd = await req.formData();
  const file = fd.get("document");
  const docType = String(fd.get("docType") ?? "");
  if (!(DOC_TYPES as readonly string[]).includes(docType)) throw badRequest("Choose a document type.");
  if (!file || typeof file === "string") throw badRequest("Choose a file to upload.");
  const stored = await storeUpload(file);
  const d = (await db.insert(businessDocuments).values({ companyId: actor.companyId!, docType, uploadedById: actor.userId, ...stored }).returning())[0];
  await audit(actor, "document.upload", "document", d.id, { docType, size: stored.sizeBytes });
  return { ok: true, message: "Document uploaded for review." };
});
