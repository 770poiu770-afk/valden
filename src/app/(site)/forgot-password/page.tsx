import { ActionForm } from "@/components/ActionForm";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Reset your password", "איפוס סיסמה") }; }
export default async function Forgot() {
  const { t } = await getT();
  return (
    <div className="container-page max-w-lg py-14">
      <h1 className="wide text-3xl">{t("Reset your password", "איפוס סיסמה")}</h1>
      <p className="mt-2 text-steel-500">{t("Enter your account email. If it matches an account, we will send a single-use link valid for 60 minutes.", "הזינו את המייל של החשבון. אם הוא תואם לחשבון קיים, נשלח קישור חד-פעמי שתקף ל-60 דקות.")}</p>
      <ActionForm action="/api/auth/forgot" className="mt-6 space-y-4" submitLabel={t("Send reset link", "שליחת קישור לאיפוס")} resetOnSuccess>
        <div><label className="field-label" htmlFor="email">{t("Business email", "מייל עסקי")}</label><input id="email" name="email" type="email" autoComplete="email" required className="input" /></div>
      </ActionForm>
    </div>
  );
}
