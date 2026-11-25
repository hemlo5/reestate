'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload } from 'lucide-react';
import { useSession } from '@/components/providers/AppProviders';
import { AuthGateCard } from '@/components/AuthGateCard';
import { apiClient } from '@/lib/api/client';
import { uploadMediaFile } from '@/lib/storage/client-compress';
import { getBrokerVerificationLabel, isBrokerVerified } from '@/lib/matching';

export function BrokerVerificationClient() {
  const router = useRouter();
  const { user, refreshSession } = useSession();
  const [reraId, setReraId] = useState(user?.brokerProfile?.reraId || '');
  const [authority, setAuthority] = useState(user?.brokerProfile?.verificationDocs?.reraAuthority || '');
  const [govtIdType, setGovtIdType] = useState(user?.brokerProfile?.verificationDocs?.govtIdType || 'PAN Card');
  const [govtIdNumber, setGovtIdNumber] = useState(user?.brokerProfile?.verificationDocs?.govtIdNumber || '');
  const [fileName, setFileName] = useState(user?.brokerProfile?.verificationDocs?.govtIdFileName || '');
  const [fileKey, setFileKey] = useState(user?.brokerProfile?.verificationDocs?.govtIdFileKey || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!user || user.role !== 'broker') {
    return <AuthGateCard requiredRole="broker" title="Broker sign-in required" description="Sign in with your Google account to submit broker verification." />;
  }

  const verified = isBrokerVerified(user);
  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      setError('Upload a JPG, PNG, WebP, or PDF file.'); return;
    }
    if (file.size > 5 * 1024 * 1024) { setError('File must be 5MB or smaller.'); return; }
    setUploading(true);
    try {
      const uploaded = await uploadMediaFile({ file, purpose: 'verification' });
      setFileName(uploaded.fileName); setFileKey(uploaded.key);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not upload the document.'); }
    finally { setUploading(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (reraId.trim().length < 3 || authority.trim().length < 2 || !govtIdNumber.trim()) {
      setError('Enter your state RERA authority, registration number, and government ID number.'); return;
    }
    setSaving(true);
    try {
      const result = await apiClient.submitBrokerVerification({
        reraId: reraId.trim(),
        verificationDocs: {
          reraAuthority: authority.trim(), govtIdType, govtIdNumber: govtIdNumber.trim(),
          govtIdFileName: fileName || undefined, govtIdFileKey: fileKey || undefined,
          submittedAt: new Date().toISOString(),
        },
      });
      if (!result.user) throw new Error('Verification submission was not saved.');
      await refreshSession();
      router.push('/broker/dashboard'); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not submit verification.'); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12 pb-28">
    <button type="button" onClick={() => router.push('/broker/dashboard')} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[#5E687A] hover:text-[#0B1324]"><ArrowLeft className="h-4 w-4" />Back to dashboard</button>
    <section className="rounded-3xl border border-[#E6E9EF] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#1A56FF]">Broker verification</p>
      <h1 className="mt-2 text-2xl font-bold text-[#0B1324]">Verify your broker profile</h1>
      <p className="mt-2 text-sm text-[#5E687A]">Submit your applicable state RERA registration and identity details for Hemlo review. A Verified badge appears only after review is approved.</p>
      <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">Current status: {getBrokerVerificationLabel(user)}</p>
      {verified ? <p className="mt-5 text-sm text-emerald-700">Your broker profile is verified.</p> : <form onSubmit={submit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-semibold text-[#5E687A]">State RERA authority *<input required value={authority} onChange={e => setAuthority(e.target.value)} placeholder="Karnataka RERA, MahaRERA, K-RERA" className="w-full min-h-[44px] rounded-xl border border-[#E6E9EF] bg-[#F7F8FA] px-3 text-sm text-[#0B1324]" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[#5E687A]">Registration number *<input required value={reraId} onChange={e => setReraId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#E6E9EF] bg-[#F7F8FA] px-3 text-sm text-[#0B1324]" /></label>
          <label className="space-y-1.5 text-xs font-semibold text-[#5E687A]">Government ID type<select value={govtIdType} onChange={e => setGovtIdType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#E6E9EF] bg-[#F7F8FA] px-3 text-sm text-[#0B1324]"><option>PAN Card</option><option>Aadhaar Card</option><option>Passport</option><option>Driving Licence</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold text-[#5E687A]">Government ID number *<input required value={govtIdNumber} onChange={e => setGovtIdNumber(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#E6E9EF] bg-[#F7F8FA] px-3 text-sm text-[#0B1324]" /></label>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#E6E9EF] bg-[#F7F8FA] px-4 py-3 text-sm font-semibold text-[#0B1324]"><Upload className="h-4 w-4 text-[#1A56FF]" />{uploading ? 'Uploading…' : fileName || 'Upload ID document (optional)'}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" disabled={uploading} onChange={e => void handleFile(e.target.files?.[0])} /></label>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button disabled={saving || uploading} className="min-h-[46px] rounded-xl bg-[#1A56FF] px-6 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Submitting…' : 'Submit for review'}</button>
      </form>}
    </section>
  </main>;
}
