import { ContentPage } from "@/components/ContentPage";
export const metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (
    <ContentPage title="Privacy policy" legal>
      <h2>What we collect</h2>
      <p>Business account details (company name, registration and tax identifiers, addresses), the details of your authorised contacts (name, job title, work email and phone), verification documents you upload, order, quotation and payment records, and technical logs needed to secure the service.</p>
      <h2>Payment data</h2>
      <p>We do not collect or store card numbers, security codes or PayPal passwords. PayPal processes payments; we store only transaction identifiers and statuses needed for reconciliation.</p>
      <h2>Why we use it</h2>
      <ul>
        <li>To verify that you are a legitimate business and to operate your trade account.</li>
        <li>To process quotations, orders, payments, shipments and refunds.</li>
        <li>To prevent fraud and meet legal, tax and export-control obligations.</li>
      </ul>
      <h2>Who can see it</h2>
      <p>Authorised Valden staff, according to their role, and service providers acting for us such as payment processors, carriers and hosting providers. Verification documents are stored privately and are not publicly accessible.</p>
      <h2>Retention and your rights</h2>
      <p>We retain records for as long as needed for the purposes above and as required by law. Contact the trade desk to request access to, correction of, or deletion of personal data, subject to legal retention requirements.</p>
      <h2>Cookies</h2>
      <p>We use a strictly necessary session cookie to keep you signed in. We do not use advertising cookies.</p>
    </ContentPage>
  );
}
