import { ContentPage } from "@/components/ContentPage";
export const metadata = { title: "Returns and refunds" };
export default function Returns() {
  return (
    <ContentPage title="Returns and refunds" legal>
      <h2>Trade sales</h2>
      <p>Sales are business-to-business. Consumer cooling-off rights do not apply. Returns are accepted where goods are defective, damaged in transit, or not what was ordered, subject to the conditions below.</p>
      <h2>How to request a return</h2>
      <ul>
        <li>Contact the trade desk with the order number, affected SKUs and quantities, and evidence such as photographs.</li>
        <li>Do not return goods without a return authorisation; unauthorised returns may be refused.</li>
        <li>Returned goods must be in their original packaging with all accessories and documentation.</li>
      </ul>
      <h2>Refunds</h2>
      <p>Approved refunds are issued to the original payment method — through PayPal for PayPal payments, or by bank transfer for bank-transfer payments. Partial refunds may be issued for partial returns or price adjustments. Refunds appear in your order history once processed.</p>
      <h2>Warranty claims</h2>
      <p>Manufacturer warranty terms vary by product, region and channel and are confirmed in your offer or order documents. We will help direct warranty claims to the correct service channel.</p>
      <h2>Cancellations</h2>
      <p>You can cancel an order online while it is under review or awaiting payment. After payment, cancellation is at our discretion and subject to any costs already incurred.</p>
    </ContentPage>
  );
}
