import React from 'react';

type Tone = 'default' | 'green' | 'yellow' | 'blue';

const toneClasses: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-200',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
};

export default function Badge({ children, tone = 'default' }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`inline-block rounded px-2 py-0.5 text-xs ${toneClasses[tone]}`}>{children}</span>;
}
