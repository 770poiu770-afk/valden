import { requireApprovedBuyer } from "@/server/guards";
import { displayCurrency } from "@/lib/buyer-currency";
import { BulkBuilder } from "@/components/client/Builders";
import { PageHeader } from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Bulk order builder" };
export default async function Bulk() {
  const actor = await requireApprovedBuyer();
  const { currency } = await displayCurrency(actor, null);
  return (<div><PageHeader title="Bulk order builder" intro="Paste a list of SKUs and quantities to price it against your account and add everything to your cart at once." /><BulkBuilder currency={currency} /></div>);
}
