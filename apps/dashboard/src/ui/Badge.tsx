import React from 'react';

type Tone = 'default' | 'green' | 'amber' | 'red' | 'neutral' | 'blue' | 'yellow' | 'gray';

const toneClasses: Record<Tone, string> = {
  default:
    'border-[var(--badge-neutral-bg)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
  green:
    'border-[var(--badge-green-bg)] bg-[var(--badge-green-bg)] text-[var(--badge-green-fg)]',
  amber:
    'border-[var(--badge-amber-bg)] bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]',
  red:
    'border-[var(--badge-red-bg)] bg-[var(--badge-red-bg)] text-[var(--badge-red-fg)]',
  neutral:
    'border-[var(--badge-neutral-bg)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
  blue:
    'border-[rgba(125,146,222,0.7)] bg-[rgba(30,64,175,0.6)] text-[#e0f2fe]',
  yellow:
    'border-[var(--badge-amber-bg)] bg-[var(--badge-amber-bg)] text-[var(--badge-amber-fg)]',
  gray:
    'border-[var(--badge-neutral-bg)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]',
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
        'px-2.5 py-0.5',
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
