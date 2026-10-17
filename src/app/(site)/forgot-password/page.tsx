import { ActionForm } from "@/components/ActionForm";
export const metadata = { title: "Reset your password" };
export default function Forgot() {
  return (
    <div className="container-page max-w-lg py-14">
      <h1 className="wide text-3xl">Reset your password</h1>
      <p className="mt-2 text-steel-500">Enter your account email. If it matches an account, we will send a single-use link valid for 60 minutes.</p>
      <ActionForm action="/api/auth/forgot" className="mt-6 space-y-4" submitLabel="Send reset link" resetOnSuccess>
        <div><label className="field-label" htmlFor="email">Business email</label><input id="email" name="email" type="email" required className="input" /></div>
      </ActionForm>
    </div>
  );
}
