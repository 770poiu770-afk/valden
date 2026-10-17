import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailOutbox } from "@/db/schema";
import { requireStaff } from "@/server/guards";
import { Notice, PageHeader, fmtDate } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Email outbox" };
export default async function Outbox() {
  await requireStaff("settings.manage");
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(100);
  return (
    <div>
      <PageHeader title="Email outbox" intro="Every transactional email the platform generates." />
      <div className="mb-4"><Notice tone="warn">{process.env.SMTP_URL ? "SMTP is configured: queued messages are delivered automatically and marked SENT or FAILED." : "SMTP_URL is not set, so messages stay queued here. Configure SMTP before launch (docs/DEPLOYMENT.md)."} Password-reset links in this list are sensitive — they grant account access until used or expired.</Notice></div>
      <div className="space-y-2">{rows.map((r) => (
        <details key={r.id} className="panel px-4 py-3 text-sm"><summary className="cursor-pointer"><span className="font-medium">{r.subject}</span> <span className="text-steel-500">→ {r.toAddress} · {fmtDate(r.createdAt, true)} · {r.status}</span></summary><pre className="mt-2 whitespace-pre-wrap text-xs text-steel">{r.body}</pre></details>
      ))}</div>
    </div>
  );
}
