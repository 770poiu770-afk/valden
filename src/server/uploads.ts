import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { badRequest } from "@/lib/errors";

const ALLOWED: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  "application/pdf": { ext: "pdf", magic: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  "image/png": { ext: "png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
};

export const DOC_TYPES = [
  "Certificate of incorporation / business registration",
  "VAT / tax registration certificate",
  "Trade or import licence",
  "Proof of business address",
  "Authorised signatory identification",
  "Other supporting document",
] as const;

function uploadDir() { return path.resolve(process.env.UPLOAD_DIR ?? "./uploads"); }
function maxBytes() { return Number(process.env.UPLOAD_MAX_BYTES ?? 10 * 1024 * 1024); }

export type StoredFile = { storageKey: string; originalName: string; mimeType: string; sizeBytes: number; sha256: string };

/** Validate (declared type + magic bytes + size) and store outside the public web root. */
export async function storeUpload(file: File): Promise<StoredFile> {
  if (!file || typeof file.arrayBuffer !== "function") throw badRequest("No file received.");
  if (file.size <= 0) throw badRequest("The uploaded file is empty.");
  if (file.size > maxBytes()) throw badRequest(`Files must be ${Math.round(maxBytes() / 1024 / 1024)}MB or smaller.`);
  const spec = ALLOWED[file.type];
  if (!spec) throw badRequest("Only PDF, PNG or JPEG documents are accepted.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!spec.magic(buf)) throw badRequest("The file content does not match its declared type.");
  const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${spec.ext}`;
  const full = path.join(uploadDir(), storageKey);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, buf, { mode: 0o600 });
  const originalName = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 150) || `document.${spec.ext}`;
  return { storageKey, originalName, mimeType: file.type, sizeBytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  if (!/^\d{4}-\d{2}\/[0-9a-f-]{36}\.(pdf|png|jpg)$/.test(storageKey)) throw badRequest("Invalid storage key.");
  return readFile(path.join(uploadDir(), storageKey));
}
