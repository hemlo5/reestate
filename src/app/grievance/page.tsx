import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { ReportForm } from './ReportForm';

export const metadata: Metadata = {
  title: 'Grievance Redressal',
  description: 'Contact Housed about a listing, privacy concern, or service grievance.',
};

export default async function GrievancePage({ searchParams }: { searchParams: Promise<{ listingId?: string }> }) {
  const { listingId = '' } = await searchParams;
  const officerName = process.env.GRIEVANCE_OFFICER_NAME?.trim();
  const contactEmail = process.env.GRIEVANCE_EMAIL?.trim() || '';
  const postalAddress = process.env.GRIEVANCE_POSTAL_ADDRESS?.trim();

  return (
    <LegalPage title="Grievance Redressal" intro="Report an allegedly unlawful, misleading, infringing, unsafe, or otherwise problematic listing, or raise a privacy or service complaint.">
      <section>
        <h2>Grievance Officer</h2>
        <p><strong>Name:</strong> {officerName || 'Housed Grievance Officer — name to be published'}</p>
        <p><strong>Designation:</strong> Grievance Officer</p>
        {contactEmail ? <p><strong>Email:</strong> <a href={`mailto:${contactEmail}`}>{contactEmail}</a></p> : <p><strong>Email:</strong> Housed must publish a working grievance email before launch.</p>}
        {postalAddress ? <p><strong>Postal address:</strong> {postalAddress}</p> : null}
        <p>Include the listing link or ID, the issue, and any information needed to review it. Do not send passwords or unnecessary identity documents.</p>
      </section>
      <section>
        <h2>Review and response</h2>
        <p>Reports are reviewed by Housed. A report does not automatically hide a listing; Housed may restrict or remove content when the review indicates that action is warranted. Housed will acknowledge grievances within 24 hours and resolve them within seven days, and will handle removal requests in the expedited statutory period where that period applies. Certain removal requests under the Information Technology Rules have a 36-hour resolution timeline.</p>
        <p>These timelines describe the applicable grievance process; posting this policy by itself does not establish eligibility for any legal safe-harbour protection.</p>
      </section>
      <section>
        <h2>Report a listing</h2>
        <ReportForm listingId={listingId} contactEmail={contactEmail} />
      </section>
      <p className="legal-note">Before launch, publish the appointed officer’s name and working contact details. Current contact settings are read from server environment variables `GRIEVANCE_OFFICER_NAME`, `GRIEVANCE_EMAIL`, and `GRIEVANCE_POSTAL_ADDRESS`.</p>
    </LegalPage>
  );
}
