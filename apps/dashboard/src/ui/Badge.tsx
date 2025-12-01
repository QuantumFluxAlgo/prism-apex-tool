import React from 'react';

type Tone = 'default' | 'green' | 'amber' | 'red' | 'neutral' | 'blue' | 'yellow' | 'gray';

const toneClasses: Record<Tone, string> = {
  default:
    'border-[rgba(255,255,255,0.14)] bg-[rgba(9,15,28,0.9)] text-[var(--text-secondary)]',
  green:
    'border-[#4BE8A3] text-[#4BE8A3] bg-[rgba(75,232,163,0.12)]',
  amber:
    'border-[#FFC466] text-[#FFC466] bg-[rgba(255,196,102,0.12)]',
  red:
    'border-[#FF6A6A] text-[#FF6A6A] bg-[rgba(255,106,106,0.12)]',
  neutral:
    'border-[rgba(170,177,205,0.9)] text-[rgba(170,177,205,0.95)] bg-[rgba(9,15,28,0.9)]',
  blue:
    'border-[rgba(125,146,222,0.9)] text-[rgba(191,203,255,0.95)] bg-[rgba(11,15,28,0.9)]',
  yellow:
    'border-[#FFC466] text-[#FFC466] bg-[rgba(255,196,102,0.12)]',
  gray:
    'border-[rgba(125,146,222,0.55)] text-[rgba(181,191,230,0.95)] bg-[rgba(9,15,28,0.9)]',
};

export default function Badge({
  children,
  tone = 'default',
  title,
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  const toneClass = toneClasses[tone] ?? toneClasses.default;

  return (
    <span
      title={title}
      className={[
        'dashboard-badge',
        'inline-flex items-center justify-center gap-1',
        'rounded-full px-2.5 py-0.5',
        'font-geist-mono text-[10px] leading-tight',
        'uppercase tracking-[0.16em]',
        toneClass,
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
