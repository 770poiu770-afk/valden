import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { getT } from "@/server/locale";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Choose a new password", "בחירת סיסמה חדשה") }; }
export default async function Reset({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const { t } = await getT();
  return (
    <div className="container-page max-w-lg py-14">
      <h1 className="wide text-3xl">{t("Choose a new password", "בחירת סיסמה חדשה")}</h1>
      {!token ? <p className="mt-4">{t("This link is incomplete.", "הקישור אינו שלם.")} <Link className="link" href="/forgot-password">{t("Request a new reset link", "בקשת קישור חדש לאיפוס")}</Link>.</p> : (
        <ActionForm action="/api/auth/reset" className="mt-6 space-y-4" submitLabel={t("Update password", "עדכון סיסמה")}>
          <input type="hidden" name="token" value={token} />
          <div><label className="field-label" htmlFor="password">{t("New password", "סיסמה חדשה")}</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required aria-describedby="pw-hint" className="input" /><p id="pw-hint" className="field-hint">{t("At least 12 characters, including a letter and a number.", "לפחות 12 תווים, כולל אות ומספר.")}</p></div>
          <div><label className="field-label" htmlFor="confirm">{t("Confirm password", "אימות סיסמה")}</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" /></div>
        </ActionForm>
      )}
    </div>
  );
}
