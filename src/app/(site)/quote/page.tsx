import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { currentActor } from "@/server/http";
export const metadata = { title: "Request a wholesale quote" };
export default async function Quote() {
  const actor = await currentActor();
  if (actor?.companyStatus === "APPROVED" && !actor.isStaff) redirect("/portal/quotes/new");
  return (
    <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_22rem]">
      <div className="max-w-2xl">
        <h1 className="display text-[34px] sm:text-[44px]">Request a wholesale quote</h1>
        <p className="mt-3 text-steel-500">For volume programmes, mixed container loads and items not listed online. Approved account holders build quotations line by line in their portal and accept offers online.</p>
        {actor && <p className="mt-4 rounded border border-warn/30 bg-warn-soft px-4 py-3 text-sm">Your account is still under review. You can send a preliminary request here; formal offers are issued once your account is approved.</p>}
        <ActionForm action="/api/contact" className="mt-8 grid gap-4 sm:grid-cols-2" submitLabel="Send quote request" resetOnSuccess>
          <input type="hidden" name="topic" value="Quote request" />
          <div><label className="field-label" htmlFor="name">Your name</label><input id="name" name="name" required className="input" /></div>
          <div><label className="field-label" htmlFor="companyName">Company</label><input id="companyName" name="companyName" required className="input" /></div>
          <div><label className="field-label" htmlFor="email">Work email</label><input id="email" name="email" type="email" required className="input" /></div>
          <div><label className="field-label" htmlFor="phone">Phone</label><input id="phone" name="phone" className="input" /></div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="message">Products, quantities and target prices</label>
            <textarea id="message" name="message" rows={8} required minLength={10} className="input" placeholder={"VLD-IPH-XXXXXX-01, 500 units, target $1,450\nRTX 5090 board-partner cards, 120 units\nDelivery: Ashdod, Israel — DAP"} />
          </div>
          <div className="hidden" aria-hidden><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        </ActionForm>
      </div>
      <aside className="space-y-4 self-start">
        <div className="panel panel-pad text-sm">
          <h2 className="font-semibold text-deep-900">Faster with an account</h2>
          <p className="mt-2 text-steel-500">With an approved account, quote requests are priced against your contract terms, offers arrive in your portal with an expiry date, and you can accept and convert to an order in one step.</p>
          {!actor && <Link href="/register" className="btn-primary mt-4">Register your business</Link>}
        </div>
      </aside>
    </div>
  );
}
