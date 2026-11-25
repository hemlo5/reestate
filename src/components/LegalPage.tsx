import type { ReactNode } from 'react';

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-10 pb-28 sm:px-6 md:pb-16">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1A56FF]">Hemlo · Policies</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-[#0B1324] sm:text-4xl">{title}</h1>
      <p className="mt-3 border-b border-[#E6E9EF] pb-6 text-sm leading-6 text-[#5E687A]">{intro}</p>
      <div className="legal-copy pt-2">{children}</div>
    </article>
  );
}
