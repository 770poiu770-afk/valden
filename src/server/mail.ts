import { eq } from "drizzle-orm";
import { db, type DbOrTx } from "@/db";
import { emailOutbox } from "@/db/schema";
import { log } from "@/lib/log";

/**
 * Transactional email. Every message is recorded in `email_outbox` (inside the caller's transaction,
 * so emails are only sent for committed work). When SMTP_URL is configured, call `flushOutbox()`
 * to deliver queued mail; it is triggered after each queued message and can also run on a schedule.
 */
export async function queueEmail(to: string, subject: string, body: string, tx: DbOrTx = db) {
  await tx.insert(emailOutbox).values({ toAddress: to, subject, body });
  log.info("email_queued", { to: to.replace(/(.).+(@.+)/, "$1***$2"), subject });
  if (process.env.SMTP_URL) setTimeout(() => { flushOutbox().catch((e) => log.error("email_flush_failed", { message: (e as Error).message })); }, 250);
}

let flushing = false;
export async function flushOutbox(limit = 50) {
  if (!process.env.SMTP_URL || flushing) return { sent: 0 };
  flushing = true;
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    const queued = await db.select().from(emailOutbox).where(eq(emailOutbox.status, "QUEUED")).limit(limit);
    let sent = 0;
    for (const m of queued) {
      try {
        await transport.sendMail({ from: process.env.MAIL_FROM || "no-reply@example.com", to: m.toAddress, subject: m.subject, text: m.body });
        await db.update(emailOutbox).set({ status: "SENT", sentAt: new Date(), error: null }).where(eq(emailOutbox.id, m.id));
        sent++;
      } catch (e) {
        await db.update(emailOutbox).set({ status: "FAILED", error: (e as Error).message.slice(0, 500) }).where(eq(emailOutbox.id, m.id));
      }
    }
    return { sent };
  } finally { flushing = false; }
}

export function appUrl(path = "") {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
