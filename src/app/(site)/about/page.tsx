import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
export const metadata = { title: "About" };
export default function About() {
  return (
    <ContentPage title="A distribution desk for business buyers" intro="Valden sells high-value electronics exclusively to verified companies — wholesalers, distributors, retail chains, resellers, importers and corporate IT buyers.">
      <h2>What we do</h2>
      <p>We consolidate demand for premium devices and components — smartphones, workstations, graphics cards, displays, networking and creator equipment — and supply them in trade quantities with published minimum order quantities, quantity breaks and negotiated quotations.</p>
      <h2>How we work</h2>
      <ul>
        <li>Every buyer is a verified business. We review registration and tax details and supporting documents before enabling pricing.</li>
        <li>Availability is confirmed per order. Where we cannot confirm stock or lead time, we say so before asking for payment.</li>
        <li>Large orders go through a review of availability, freight and payment before anything is charged.</li>
        <li>Payments are verified with the payment provider before an order is marked as paid.</li>
      </ul>
      <h2>Independence</h2>
      <p>Valden is an independent distributor. The brands in our catalog are trademarks of their owners; listing them does not mean we are an authorised distributor for any manufacturer unless a specific listing says so.</p>
      <p><Link href="/register" className="link">Open a trade account</Link> or <Link href="/contact" className="link">contact the trade desk</Link>.</p>
    </ContentPage>
  );
}
