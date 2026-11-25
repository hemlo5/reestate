'use client';

import { useState } from 'react';

export function ReportForm({ listingId, contactEmail }: { listingId: string; contactEmail: string }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  if (!contactEmail) {
    return (
      <p className="legal-note" role="status">
        The reporting email is not configured yet. Housed must publish a working grievance contact before accepting reports.
      </p>
    );
  }

  const sendReport = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const subject = encodeURIComponent(`Listing report: ${listingId || 'general grievance'}`);
    const body = encodeURIComponent(`Listing ID: ${listingId || 'Not supplied'}\nReason: ${reason}\nDetails: ${details}`);
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <form onSubmit={sendReport} className="mt-5 space-y-4">
      <div>
        <label htmlFor="report-reason" className="mb-1.5 block text-sm font-semibold">Reason for report</label>
        <select id="report-reason" required value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-xl border border-[#E6E9EF] bg-white px-3 py-2.5 text-sm">
          <option value="">Choose a reason</option>
          <option>Misleading or inaccurate information</option>
          <option>Possible fraud or impersonation</option>
          <option>Rights or privacy concern</option>
          <option>Unsafe or unlawful content</option>
          <option>Other grievance</option>
        </select>
      </div>
      <div>
        <label htmlFor="report-details" className="mb-1.5 block text-sm font-semibold">Details</label>
        <textarea id="report-details" required minLength={10} maxLength={2000} value={details} onChange={(event) => setDetails(event.target.value)} rows={5} className="w-full rounded-xl border border-[#E6E9EF] bg-white px-3 py-2.5 text-sm" placeholder="Describe the issue and include any details that can help us review it." />
      </div>
      <button type="submit" className="min-h-[44px] rounded-xl bg-[#1A56FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1244D8]">Prepare report email</button>
      <p className="text-xs leading-5 text-[#5E687A]">This opens your email app. A report is reviewed; the listing is not hidden automatically. Do not include passwords, government ID numbers, or other unnecessary sensitive details.</p>
    </form>
  );
}
