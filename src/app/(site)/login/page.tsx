import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { Notice } from "@/components/ui";
import { currentActor } from "@/server/http";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; error?: string }> }) {
  const sp = await searchParams;
  const actor = await currentActor();
  if (actor) redirect(actor.isStaff ? "/admin" : "/portal");
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-2">
      <div className="max-w-md">
        <h1 className="wide text-3xl">Sign in to your trade account</h1>
        <p className="mt-2 text-steel-500">Use the email address registered for your company&apos;s purchasing contact.</p>
        {sp.reset && <div className="mt-4"><Notice tone="ok">Your password has been updated.</Notice></div>}
        {sp.error && <div className="mt-4" role="alert"><Notice tone="bad">{sp.error.slice(0, 200)}</Notice></div>}
        <ActionForm action="/api/auth/login" className="mt-6 space-y-4" submitLabel="Sign in" submitClass="btn-deep w-full" pendingLabel="Signing in…">
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <div><label className="field-label" htmlFor="email">Business email</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
          <div><label className="field-label" htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
        </ActionForm>
        <p className="mt-4 text-sm"><Link className="link" href="/forgot-password">Forgot your password?</Link></p>
      </div>
      <div className="rounded-md border border-line bg-white p-8">
        <h2 className="wide text-xl">New to Valden?</h2>
        <p className="mt-2 max-w-[48ch] text-steel-500">Trade accounts are open to registered wholesalers, distributors, retailers, resellers, importers and corporate IT buyers. Registration takes about ten minutes; have your company registration number and a verification document ready.</p>
        <Link href="/register" className="btn-primary mt-6">Register your business</Link>
      </div>
    </div>
  );
}
