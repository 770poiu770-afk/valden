import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getSettings } from "@/lib/settings";
import { formatMoney } from "@/lib/money";
export const metadata = { title: "Wholesale services" };
export const dynamic = "force-dynamic";
export default async function Services() {
  const s = await getSettings();
  const mov = formatMoney(BigInt(s.minimumOrderValue.amountMinor), s.minimumOrderValue.currency).replace(/\.00$/, "");
  return (
    <ContentPage title="Wholesale services" intro="Online ordering for standard volumes, formal quotations for programmes, and a reviewed path from order to dispatch.">
      <h2>Online trade ordering</h2>
      <p>Approved accounts order directly from the catalog. Each listing shows its minimum order quantity, order increment and quantity-break prices. The online minimum order value is currently {mov}. Totals are always calculated by our system at checkout — never taken from the browser.</p>
      <h2>Quotations for large volumes</h2>
      <p>Send a list of SKUs, quantities and target prices. Our trade desk returns a formal offer with an expiry date; accept it online and it becomes an order at the agreed prices. Quotations suit monthly allocations, multi-site rollouts and container-scale purchases.</p>
      <h2>Contract pricing</h2>
      <p>Regular buyers can hold contract unit prices on specific listings. Your account always uses the better of your contract price and the published quantity-break price.</p>
      <h2>Currencies and payment</h2>
      <p>Prices are maintained in US dollars and can be displayed and invoiced in USD, EUR or ILS using exchange rates recorded by our finance team. Payment is by PayPal (subject to PayPal account limits and eligibility) or by bank transfer against a pro-forma invoice. Orders are only marked as paid once payment is verified.</p>
      <h2>Logistics</h2>
      <p>Choose insured freight arranged by us — quoted after order review — or collection by your own forwarder. Delivery estimates are provisional until confirmed in writing. Shipments, references and tracking numbers appear in your account as they are created.</p>
      <h2>Export documentation</h2>
      <p>Checkout captures Incoterms, importer and exporter of record, and consignee tax IDs where relevant. Some products, such as encryption-capable network equipment, require export-control screening before dispatch.</p>
      <p><Link className="link" href="/quote">Request a quote</Link></p>
    </ContentPage>
  );
}
