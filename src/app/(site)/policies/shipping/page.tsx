import { ContentPage } from "@/components/ContentPage";
export const metadata = { title: "Shipping policy" };
export default function Shipping() {
  return (
    <ContentPage title="Shipping policy" legal>
      <h2>Shipping options</h2>
      <p>At checkout you choose either insured freight arranged by Valden or collection by your appointed forwarder. Freight, insurance and handling charges for Valden-arranged shipments are quoted after order review and added to your order before payment is requested.</p>
      <h2>Delivery estimates</h2>
      <p>Any delivery date or transit time we provide is an estimate unless we confirm it in writing. Estimates are marked as provisional in your account until confirmed.</p>
      <h2>Partial shipments</h2>
      <p>Orders may be dispatched in more than one shipment. Each shipment is listed in your account with its reference, contents and, when available, carrier and tracking number.</p>
      <h2>Restricted goods</h2>
      <p>Products containing lithium batteries are shipped under the applicable dangerous-goods rules. Some network and security equipment requires export-control screening and may not be shippable to all destinations.</p>
      <h2>Customs and duties</h2>
      <p>Unless your agreed Incoterm states otherwise, import duties, taxes and customs clearance at destination are the buyer&apos;s responsibility.</p>
      <h2>Inspection on arrival</h2>
      <p>Inspect deliveries on arrival and note any visible damage or shortage on the carrier&apos;s documents. Report discrepancies to the trade desk promptly with photographs and shipment reference.</p>
    </ContentPage>
  );
}
