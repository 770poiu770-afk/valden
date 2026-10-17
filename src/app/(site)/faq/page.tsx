import { ContentPage } from "@/components/ContentPage";
export const metadata = { title: "Frequently asked questions" };
const QA: [string, string][] = [
  ["Who can buy from Valden?", "Registered businesses only: wholesalers, distributors, retail chains, electronics retailers, hardware resellers, importers and exporters, and corporate IT procurement teams. We do not sell to consumers."],
  ["Why can't I see prices?", "Wholesale pricing is shown only to approved trade accounts. Register your business and we will review your application; prices appear as soon as you are approved."],
  ["What documents do you need?", "A business registration certificate or equivalent, plus a VAT/tax registration where applicable. We may ask for proof of address or identification of the authorised signatory."],
  ["Is there a minimum order?", "Yes. Each listing has a minimum order quantity, and online orders have a minimum order value shown at checkout. Larger programmes are handled by quotation."],
  ["Is the stock shown live?", "No. Unless a listing states that a quantity is confirmed, availability is indicative and is confirmed by our trade desk before payment is requested."],
  ["How do quantity breaks work?", "Unit prices step down at multiples of the minimum order quantity. If your company has a contract price, you automatically pay the lower of the two."],
  ["How do I pay?", "By PayPal where your order is within the store's PayPal limit and PayPal supports your account, or by bank transfer against a pro-forma invoice. An order is only marked paid after the payment is verified."],
  ["Can I pay a ₪300,000 order by PayPal?", "Possibly, but PayPal applies its own limits and eligibility rules. Orders above the configured PayPal limit are paid by bank transfer."],
  ["Which currencies do you invoice in?", "USD, EUR and ILS. Prices are maintained in USD and converted at exchange rates recorded by our finance team; the rate used is stored on your order."],
  ["How is freight priced?", "Insured freight arranged by us is quoted after order review. Alternatively, your own forwarder can collect. Delivery estimates are provisional until confirmed."],
  ["Can I cancel an order?", "Yes, online, while the order is under review or awaiting payment. After payment, contact the trade desk; refunds are issued to the original payment method."],
  ["Are you an authorised distributor for these brands?", "Not unless a specific listing says so. Valden is an independent distributor; brand names are trademarks of their owners."],
];
export default function Faq() {
  return (
    <ContentPage title="Frequently asked questions">
      <div className="divide-y divide-line rounded-md border border-line bg-white">
        {QA.map(([q, a]) => (
          <details key={q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold text-deep-900 marker:hidden">{q}</summary>
            <p className="mb-0 mt-2 text-steel">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
