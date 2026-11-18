import type { Metadata } from 'next';
import { PropertyWizardClient } from '@/components/broker/PropertyWizardClient';

export const metadata: Metadata = {
  title: 'List a Property',
  description: 'Publish a verified residential or commercial property to Housed.',
};

export default function NewPropertyPage() {
  return <PropertyWizardClient />;
}
