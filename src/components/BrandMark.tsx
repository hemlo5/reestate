import Link from 'next/link';

interface BrandMarkProps {
  href?: string;
  onClick?: () => void;
}

export function BrandMark({ href = '/', onClick }: BrandMarkProps) {
  const content = (
    <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="24" height="24" rx="7" fill="#1A56FF" />
        <path
          d="M6.5 11.5L12 6.8L17.5 11.5V17.2C17.5 17.6418 17.1418 18 16.7 18H13.8V13.8H10.2V18H7.3C6.85817 18 6.5 17.6418 6.5 17.2V11.5Z"
          fill="white"
        />
      </svg>
      <span className="font-display text-[19px] font-bold tracking-[-0.025em] text-[#0B1324]">
        Housed
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A56FF] rounded-lg"
        aria-label="Housed home"
      >
        {content}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A56FF] rounded-lg"
      aria-label="Housed home"
    >
      {content}
    </Link>
  );
}
