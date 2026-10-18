import { requireApprovedBuyer } from "@/server/guards";
import { displayCurrency } from "@/lib/buyer-currency";
import { BulkBuilder } from "@/components/client/Builders";
import { PageHeader } from "@/components/ui";
import { getT } from "@/server/locale";
export const dynamic = "force-dynamic";
export async function generateMetadata() { const { t } = await getT(); return { title: t("Bulk order builder", "הזמנה מרשימה") }; }
export default async function Bulk() {
  const actor = await requireApprovedBuyer();
  const { currency } = await displayCurrency(actor, null);
  const { t } = await getT();
  return (<div><PageHeader title={t("Bulk order builder", "הזמנה מרשימה")} intro={t("Paste a list of SKUs and quantities to price it against your account and add everything to your cart at once.", "הדביקו רשימת מק״טים וכמויות כדי לתמחר אותה לפי החשבון שלכם ולהוסיף הכל לסל בבת אחת.")} /><BulkBuilder currency={currency} /></div>);
}
