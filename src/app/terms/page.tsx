import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms for using Hemlo’s reverse real estate marketplace.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" intro="These terms explain the roles and responsibilities of people using Hemlo. By using the service, you agree to follow them.">
      <section>
        <h2>1. What Hemlo provides</h2>
        <p>Hemlo is an online platform where home seekers can describe what they need and brokers can respond with properties from their inventory. Hemlo provides discovery and communication tools. A listing or proposal is supplied by its author and does not constitute an offer, endorsement, or guarantee by Hemlo.</p>
      </section>
      <section>
        <h2>2. Broker responsibilities</h2>
        <p>Brokers must provide accurate profile and registration details, keep listings current, have authority to advertise each property, disclose material facts and charges, and respond to reports. Brokers must provide the applicable state real estate agent registration number. Hemlo may request evidence, restrict a listing, or suspend an account when information is missing, misleading, or appears unlawful.</p>
      </section>
      <section>
        <h2>3. Property checks and no verification of title</h2>
        <p>Hemlo does not verify or certify title, ownership, possession, building approvals, land use, encumbrances, project registration, measurements, availability, or the accuracy of a listing. A “verified broker” label refers only to the broker profile review described by Hemlo; it is not a property-title or approval certificate. Buyers, tenants, and brokers must independently inspect the property and check the title, ownership, approvals, project and agent registrations, documents, and transaction terms with qualified professionals and the relevant authorities before paying or signing.</p>
      </section>
      <section>
        <h2>4. User content and conduct</h2>
        <p>You are responsible for the information, photographs, messages, reviews, and documents you submit. Do not post content you do not have permission to use, impersonate another person, misrepresent a property or registration, misuse another person’s contact information, or use Hemlo to harass or defraud others. You grant Hemlo permission to host and display submitted content as needed to provide and operate the service.</p>
      </section>
      <section>
        <h2>5. Reporting and action</h2>
        <p>Use the <Link href="/grievance">Grievance Officer page</Link> to report an allegedly unlawful, misleading, infringing, or unsafe listing. Hemlo reviews reports and restricts or removes listings when warranted, as promptly as possible and within any applicable statutory timelines. A report is reviewed; it does not automatically hide a listing.</p>
      </section>
      <section>
        <h2>6. Accounts and availability</h2>
        <p>Keep your sign-in details secure and provide accurate account information. Hemlo may limit or suspend access to protect users, investigate reports, or address misuse. The service is provided on an evolving basis; features may change, and availability is not guaranteed.</p>
      </section>
      <section>
        <h2>7. Contact and related policies</h2>
        <p>For privacy information, see the <Link href="/privacy">Privacy Policy</Link>. For complaints or listing reports, see <Link href="/grievance">Grievance Redressal</Link>. These terms identify the service as Hemlo; the legal operating entity and address must be added when they are confirmed.</p>
      </section>
      <p className="legal-note">Effective date: November 25, 2026. These terms are a product draft and need review against the operating entity and applicable law before launch.</p>
    </LegalPage>
  );
}
