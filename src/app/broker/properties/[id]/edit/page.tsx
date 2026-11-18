import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDb, getSessionUser } from '@/lib/db';
import { PropertyWizardClient } from '@/components/broker/PropertyWizardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Edit Property Listing',
  description: 'Update photos, pricing, specifications, or availability for your property listing.',
};

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();

  if (!user || user.role !== 'broker') {
    return <PropertyWizardClient />;
  }

  const property = await getDb().getPropertyById(id);
  if (!property || property.brokerId !== user.id) {
    notFound();
  }

  return <PropertyWizardClient editingProperty={property} />;
}
