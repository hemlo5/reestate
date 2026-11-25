import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Hemlo uses information provided through its real estate marketplace.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" intro="This policy describes information Hemlo handles to operate the marketplace and support property enquiries.">
      <section>
        <h2>1. Information you provide</h2>
        <p>Depending on how you use Hemlo, this may include your name, email, phone number, city, account credentials, broker profile and registration details, property listings and photographs, housing requirements, messages, visit requests, reviews, and support or grievance reports. Broker onboarding may include government identification details and verification documents.</p>
      </section>
      <section>
        <h2>2. How information is used</h2>
        <p>Hemlo uses information to create and secure accounts, display profiles and listings, match broker inventory with seeker requirements, deliver proposals and messages, arrange visits, respond to reports, prevent misuse, and maintain the service. We use session cookies to keep you signed in. The current application does not include an advertising or analytics SDK.</p>
      </section>
      <section>
        <h2>3. When information is shared</h2>
        <p>Public profile and listing information can be seen by visitors. Requirement details are shown to brokers to help them respond; direct seeker contact details are intended to be shared only after the seeker chooses to accept a proposal or otherwise gives consent. Information may also be handled by the database and file-storage providers configured for the service, or disclosed where required to address security, legal, or safety concerns.</p>
      </section>
      <section>
        <h2>4. Sensitive broker documents</h2>
        <p>Identity and verification documents are collected for broker onboarding and should be accessible only to authorized Hemlo reviewers and the submitting broker. Do not upload a document unless you are authorized to share it. The production storage provider, access controls, retention period, and deletion process must be confirmed before this feature is used with real identity documents.</p>
      </section>
      <section>
        <h2>5. Retention and security</h2>
        <p>Hemlo retains information while needed to provide the service, handle disputes and reports, maintain security, and meet applicable record-keeping duties. Retention periods and account deletion procedures will be published when finalized. Hemlo uses access controls and security measures, but no online service can promise absolute security.</p>
      </section>
      <section>
        <h2>6. Your choices and requests</h2>
        <p>You can update profile details through your account. For a request to access, correct, or delete information, or for a privacy grievance, contact the <Link href="/grievance">Grievance Officer</Link>. The officer’s name and direct contact details must be published before launch.</p>
      </section>
      <section>
        <h2>7. Changes and contact</h2>
        <p>We will update this page if the service’s data practices change. The service is identified here as Hemlo; its legal operating entity and postal address remain to be supplied.</p>
      </section>
      <p className="legal-note">Effective date: November 25, 2026. This is a draft based on the current codebase; confirm actual providers, retention, deletion, grievance contact, and applicable legal duties before launch.</p>
    </LegalPage>
  );
}
