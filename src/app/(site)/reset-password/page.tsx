import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { PASSWORD_RULE } from "@/lib/auth";
export const metadata = { title: "Choose a new password" };
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="container-page max-w-lg py-14">
      <h1 className="wide text-3xl">Choose a new password</h1>
      {!token ? <p className="mt-4">This link is incomplete. <Link className="link" href="/forgot-password">Request a new reset link</Link>.</p> : (
        <ActionForm action="/api/auth/reset" className="mt-6 space-y-4" submitLabel="Update password">
          <input type="hidden" name="token" value={token} />
          <div><label className="field-label" htmlFor="password">New password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required className="input" /><p className="field-hint">{PASSWORD_RULE}</p></div>
          <div><label className="field-label" htmlFor="confirm">Confirm password</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" /></div>
        </ActionForm>
      )}
    </div>
  );
}
