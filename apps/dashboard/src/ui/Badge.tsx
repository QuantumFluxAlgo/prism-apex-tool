import React from 'react';

type Tone =
  | 'default'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'red'
  | 'gray'
  | 'amber'
  | 'neutral';

const toneClasses: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  gray: 'bg-gray-200 text-gray-700 dark:bg-zinc-700 dark:text-gray-200',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  neutral: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200',
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
    <span title={title} className={`inline-block rounded px-2 py-0.5 text-xs ${toneClass} ${className}`}>
      {children}
    </span>
  );
}
