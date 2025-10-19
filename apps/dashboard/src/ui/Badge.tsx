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
  default: '',
  green: 'green',
  yellow: 'amber',
  blue: '',
  red: 'red',
  gray: 'neutral',
  amber: 'amber',
  neutral: 'neutral',
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
    <span title={title} className={`dashboard-badge ${toneClass ? ` ${toneClass}` : ''} ${className}`.trim()}>
      {children}
    </span>
  );
}
