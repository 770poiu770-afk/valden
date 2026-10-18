import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { Notice } from "@/components/ui";
import { currentActor } from "@/server/http";
import { getT } from "@/server/locale";

export async function generateMetadata() {
  const { t } = await getT();
  return { title: t("Sign in", "כניסה") };
}

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; error?: string }> }) {
  const sp = await searchParams;
  const { t } = await getT();
  const actor = await currentActor();
  if (actor) redirect(actor.isStaff ? "/admin" : "/portal");
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-2">
      <div className="max-w-md">
        <h1 className="wide text-3xl">{t("Sign in", "כניסה לחשבון")}</h1>
        <p className="mt-2 text-steel-500">{t("Use the email address you signed up with.", "השתמשו בכתובת האימייל שאיתה נרשמתם.")}</p>
        {sp.reset && <div className="mt-4"><Notice tone="ok">{t("Your password has been updated.", "הסיסמה עודכנה.")}</Notice></div>}
        {sp.error && <div className="mt-4"><Notice tone="bad">{sp.error.slice(0, 200)}</Notice></div>}
        <ActionForm action="/api/auth/login" className="mt-6 space-y-4" submitLabel={t("Sign in", "כניסה")} submitClass="btn-deep w-full" pendingLabel={t("Signing in…", "מתחבר…")}>
          <input type="hidden" name="next" value={sp.next ?? ""} />
          <div><label className="field-label" htmlFor="email">{t("Email", "אימייל")}</label><input id="email" name="email" type="email" autoComplete="username" required className="input" /></div>
          <div><label className="field-label" htmlFor="password">{t("Password", "סיסמה")}</label><input id="password" name="password" type="password" autoComplete="current-password" required className="input" /></div>
        </ActionForm>
        <p className="mt-4 text-sm"><Link className="link" href="/forgot-password">{t("Forgot your password?", "שכחתם סיסמה?")}</Link></p>
      </div>
      <div className="rounded-md border border-line bg-white p-8">
        <h2 className="wide text-xl">{t("New to Valden?", "חדשים ב-Valden?")}</h2>
        <p className="mt-2 max-w-[48ch] text-steel-500">{t("Create an account with your email and a password — it takes a minute. Buy a single item or in bulk; no company documents needed.", "צרו חשבון עם אימייל וסיסמה — זה לוקח דקה. אפשר לקנות פריט אחד או בכמויות; בלי מסמכי חברה.")}</p>
        <Link href={sp.next ? `/register?next=${encodeURIComponent(sp.next)}` : "/register"} className="btn-primary mt-6">{t("Create an account", "יצירת חשבון")}</Link>
      </div>
    </div>
  );
}
