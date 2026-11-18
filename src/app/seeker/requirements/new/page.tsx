import { Suspense } from 'react';
import type { Metadata } from 'next';
import { PostRequirementClient } from '@/components/seeker/PostRequirementClient';

export const metadata: Metadata = {
  title: 'Post Your Requirement',
  description:
    'Share your preferred locality, budget, and configuration so verified brokers pitch matched properties to you.',
};

export default function PostRequirementPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="h-96 rounded-3xl bg-[#F7F8FA] animate-pulse" />
        </div>
      }
    >
      <PostRequirementClient />
    </Suspense>
  );
}
