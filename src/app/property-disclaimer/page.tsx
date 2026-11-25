import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Property Checks and Disclaimer',
  description: 'Important checks for buyers, tenants, and brokers using Hemlo.',
};

export default function PropertyDisclaimerPage() {
  return (
    <LegalPage title="Property checks are your responsibility" intro="Hemlo is a marketplace for property requirements and broker proposals. It is not a title, ownership, or approvals verification service.">
      <section>
        <h2>Hemlo does not verify title, ownership, or approvals</h2>
        <p>Hemlo does not independently verify ownership or title, authority to let or sell, land or building approvals, encumbrances, project registration, property measurements, availability, or the accuracy of a broker’s statements. Photos, badges, registration numbers, and listing details should not be treated as a guarantee or certificate from Hemlo.</p>
      </section>
      <section>
        <h2>Do your own checks before paying or signing</h2>
        <p>Buyers, tenants, and brokers must independently check the property, documents, title, approvals, agent and project registrations, payment instructions, brokerage, and contract terms with the relevant authorities and qualified professionals. Visit the property and confirm who has authority to transact. Do not rely only on information on this website.</p>
      </section>
      <section>
        <h2>State registration details</h2>
        <p>Hemlo requires brokers to submit the real estate agent registration applicable to their state and displays the number they provide. Displaying a number does not mean Hemlo has verified its validity or current status unless the profile clearly says that Hemlo completed a separate review.</p>
      </section>
    </LegalPage>
  );
}
