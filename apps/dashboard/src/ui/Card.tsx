import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={[
        'dashboard-card',
        'rounded-2xl border border-[rgba(255,255,255,0.07)] bg-[var(--bg-panel)]',
        'shadow-[0_0_0_1px_rgba(0,0,0,0.9)]',
        'text-[var(--text-primary)]',
        className,
      ].join(' ')}
    >
      {children}
    </section>
  );
}

type CardSectionProps = {
  children: React.ReactNode;
  className?: string;
};

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return (
    <header
      className={[
        'dashboard-card__header',
        'border-b border-[rgba(255,255,255,0.04)] bg-[var(--bg-header)]',
        'px-4 py-3 rounded-t-2xl',
        className,
      ].join(' ')}
    >
      {children}
    </header>
  );
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return (
    <div
      className={[
        'dashboard-card__body',
        'px-4 py-4 rounded-b-2xl bg-[var(--bg-panel)]',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
