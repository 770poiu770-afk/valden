import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PASSWORD_RULE } from "@/lib/auth";
import { DOC_TYPES } from "@/server/uploads";

export const metadata = { title: "Register your business" };

const TYPES = ["Wholesaler", "Distributor", "Retail chain", "Electronics retailer", "Hardware reseller", "Corporate IT procurement", "Importer / exporter", "Other"];

function Address({ prefix, required }: { prefix: "billing" | "shipping"; required: boolean }) {
  const r = required ? { required: true } : {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div><label className="field-label" htmlFor={`${prefix}.contactName`}>Contact name</label><input id={`${prefix}.contactName`} name={`${prefix}.contactName`} className="input" {...r} /></div>
      <div><label className="field-label" htmlFor={`${prefix}.phone`}>Phone</label><input id={`${prefix}.phone`} name={`${prefix}.phone`} className="input" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor={`${prefix}.line1`}>Address line 1</label><input id={`${prefix}.line1`} name={`${prefix}.line1`} className="input" {...r} /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor={`${prefix}.line2`}>Address line 2</label><input id={`${prefix}.line2`} name={`${prefix}.line2`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.city`}>City</label><input id={`${prefix}.city`} name={`${prefix}.city`} className="input" {...r} /></div>
      <div><label className="field-label" htmlFor={`${prefix}.region`}>Region / state</label><input id={`${prefix}.region`} name={`${prefix}.region`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.postalCode`}>Postal code</label><input id={`${prefix}.postalCode`} name={`${prefix}.postalCode`} className="input" /></div>
      <div><label className="field-label" htmlFor={`${prefix}.countryCode`}>Country (ISO code)</label><input id={`${prefix}.countryCode`} name={`${prefix}.countryCode`} maxLength={2} placeholder="IL" className="input uppercase" {...r} /></div>
    </div>
  );
}

function Section({ step, title, intro, children }: { step: number; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <fieldset className="panel panel-pad">
      <legend className="sr-only">{title}</legend>
      <div className="mb-5 flex items-start gap-3">
        <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-deep text-sm font-bold text-white">{step}</span>
        <div><h2 className="text-lg font-semibold">{title}</h2>{intro && <p className="text-sm text-steel-500">{intro}</p>}</div>
      </div>
      {children}
    </fieldset>
  );
}

export default function Register() {
  return (
    <div className="container-page py-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="wide text-3xl">Register your business</h1>
          <p className="mt-2 max-w-[62ch] text-steel-500">Trade accounts are reviewed by our team before wholesale prices and ordering are enabled. Provide accurate company details — applications with incomplete or unverifiable information are declined.</p>
          <ActionForm action="/api/auth/register" encoding="multipart" className="mt-8 space-y-6" submitLabel="Submit application" submitClass="btn-primary px-8 py-3" pendingLabel="Submitting…">
            <Section step={1} title="Company" intro="As shown on your registration documents.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2"><label className="field-label" htmlFor="legalName">Registered legal name</label><input id="legalName" name="legalName" required className="input" /></div>
                <div><label className="field-label" htmlFor="tradingName">Trading name (if different)</label><input id="tradingName" name="tradingName" className="input" /></div>
                <div><label className="field-label" htmlFor="businessType">Business type</label><select id="businessType" name="businessType" className="input" required>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                <div><label className="field-label" htmlFor="countryCode">Country of registration (ISO code)</label><input id="countryCode" name="countryCode" maxLength={2} placeholder="IL" required className="input uppercase" /></div>
                <div><label className="field-label" htmlFor="registrationNumber">Company registration number</label><input id="registrationNumber" name="registrationNumber" required className="input" /></div>
                <div><label className="field-label" htmlFor="taxId">VAT / tax ID (where applicable)</label><input id="taxId" name="taxId" className="input" /></div>
                <div><label className="field-label" htmlFor="website">Website</label><input id="website" name="website" placeholder="https://" className="input" /></div>
                <div><label className="field-label" htmlFor="businessEmail">Company email</label><input id="businessEmail" name="businessEmail" type="email" required className="input" /></div>
                <div><label className="field-label" htmlFor="businessPhone">Company phone</label><input id="businessPhone" name="businessPhone" required className="input" /></div>
                <div className="sm:col-span-2"><label className="field-label" htmlFor="expectedMonthlyVolume">Expected monthly purchasing volume</label>
                  <select id="expectedMonthlyVolume" name="expectedMonthlyVolume" className="input"><option value="">Prefer not to say</option><option>Under ₪100,000</option><option>₪100,000 – ₪500,000</option><option>₪500,000 – ₪2,000,000</option><option>Over ₪2,000,000</option></select></div>
              </div>
            </Section>

            <Section step={2} title="Authorised purchasing contact" intro="This person will hold the account login and can place orders.">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="field-label" htmlFor="contactName">Full name</label><input id="contactName" name="contactName" autoComplete="name" required className="input" /></div>
                <div><label className="field-label" htmlFor="jobTitle">Job title</label><input id="jobTitle" name="jobTitle" required className="input" /></div>
                <div><label className="field-label" htmlFor="email">Work email (login)</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
                <div><label className="field-label" htmlFor="contactPhone">Direct phone</label><input id="contactPhone" name="contactPhone" className="input" /></div>
                <div className="sm:col-span-2"><label className="field-label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="input" /><p className="field-hint">{PASSWORD_RULE}</p></div>
              </div>
            </Section>

            <Section step={3} title="Billing and delivery">
              <h3 className="mb-3 text-sm font-semibold text-deep-900">Billing address</h3>
              <Address prefix="billing" required />
              <div className="mt-6">
                <input id="sameAsBilling" type="checkbox" name="sameAsBilling" defaultChecked className="peer mr-2 accent-deep" />
                <label htmlFor="sameAsBilling" className="text-sm font-medium">Delivery address is the same as billing</label>
                <div className="mt-4 peer-checked:hidden">
                  <h3 className="mb-3 text-sm font-semibold text-deep-900">Delivery address</h3>
                  <Address prefix="shipping" required={false} />
                </div>
              </div>
            </Section>

            <Section step={4} title="Verification documents" intro="PDF, PNG or JPEG, up to 10MB each. At least one document is required.">
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <select name="docTypes" aria-label={`Document ${i + 1} type`} className="input" defaultValue={DOC_TYPES[i]}>{DOC_TYPES.map((d) => <option key={d}>{d}</option>)}</select>
                    <input name="documents" type="file" accept="application/pdf,image/png,image/jpeg" aria-label={`Document ${i + 1} file`} className="input file:mr-3 file:rounded-sm file:border-0 file:bg-deep-50 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-deep" required={i === 0} />
                  </div>
                ))}
              </div>
            </Section>

            <div className="panel panel-pad space-y-3 text-sm">
              <label className="flex items-start gap-2"><input type="checkbox" name="acceptTerms" required className="mt-1 accent-deep" /> <span>I accept the <Link href="/terms" className="link" target="_blank">terms of trade</Link> and <Link href="/privacy" className="link" target="_blank">privacy policy</Link>.</span></label>
              <label className="flex items-start gap-2"><input type="checkbox" name="declareAuthorized" required className="mt-1 accent-deep" /> <span>I confirm I am authorised to register this business and that the information provided is accurate.</span></label>
            </div>
          </ActionForm>
        </div>
        <aside className="space-y-4 self-start lg:sticky lg:top-6">
          <div className="panel panel-pad text-sm">
            <h2 className="font-semibold text-deep-900">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-steel-500">
              <li>You can sign in straight away and follow the review status.</li>
              <li>Our trade desk checks your company and documents. We may ask for more information.</li>
              <li>Once approved, wholesale pricing, quotations and ordering are switched on.</li>
            </ol>
          </div>
          <div className="panel panel-pad text-sm text-steel-500">Individuals and consumer purchases are not supported. Documents are stored privately and only reviewed by authorised staff.</div>
        </aside>
      </div>
    </div>
  );
}
