import React from 'react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
};

export function Card({ children, className = '' }: CardProps) {
  return (
    <section
      className={['dashboard-card', className].join(' ').trim()}
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
        'px-4 py-3 rounded-t-2xl',
        className,
      ].join(' ').trim()}
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
        'px-4 py-4 rounded-b-2xl',
        className,
      ].join(' ').trim()}
    >
      {children}
    </div>
  );
}
