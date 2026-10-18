import { ActionForm } from "@/components/ActionForm";
import { companyInfo } from "@/lib/company";
export const metadata = { title: "Contact the trade desk" };
const TOPICS = ["Trade account", "Quote request", "Order support", "Logistics", "Accessibility", "Partnership", "Other"];
export default function Contact({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const c = companyInfo();
  return <ContactInner c={c} searchParams={searchParams} />;
}
async function ContactInner({ c, searchParams }: { c: ReturnType<typeof companyInfo>; searchParams: Promise<{ topic?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_20rem]">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[44px]">Contact the trade desk</h1>
        <p className="mt-3 text-steel-500">Business enquiries only. Account holders can also raise questions from an order or quotation in their portal.</p>
        <ActionForm action="/api/contact" className="mt-8 grid gap-4 sm:grid-cols-2" submitLabel="Send enquiry" resetOnSuccess>
          <div><label className="field-label" htmlFor="name">Your name</label><input id="name" name="name" required className="input" /></div>
          <div><label className="field-label" htmlFor="companyName">Company</label><input id="companyName" name="companyName" required className="input" /></div>
          <div><label className="field-label" htmlFor="email">Work email</label><input id="email" name="email" type="email" required className="input" /></div>
          <div><label className="field-label" htmlFor="phone">Phone</label><input id="phone" name="phone" className="input" /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="topic">Topic</label><select id="topic" name="topic" defaultValue={TOPICS.includes(sp.topic ?? "") ? sp.topic : "Trade account"} className="input">{TOPICS.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="message">Message</label><textarea id="message" name="message" rows={6} required minLength={10} className="input" /></div>
          <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </ActionForm>
      </div>
      <aside className="panel panel-pad self-start text-sm">
        <h2 className="font-semibold text-deep-900">Direct contact</h2>
        {c.email || c.phone || c.address ? (
          <div className="mt-3 space-y-1">{c.legalName && <p className="font-medium">{c.legalName}</p>}{c.address && <p>{c.address}</p>}{c.email && <p><a className="link" href={`mailto:${c.email}`}>{c.email}</a></p>}{c.phone && <p>{c.phone}</p>}</div>
        ) : <p className="mt-3 text-steel-500">Use the form and we will reply by email.</p>}
      </aside>
    </div>
  );
}
