import type { Metadata } from 'next';
import { RegisterClient } from '@/components/auth/RegisterClient';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Create a Home Seeker account on Hemlo to post requirements and receive broker proposals.',
};

export default function RegisterPage() {
  return <RegisterClient />;
}
