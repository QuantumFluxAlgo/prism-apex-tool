import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-zinc-900 ${className}`}
      style={{ boxShadow: '0 6px 24px rgba(0,0,0,0.10)' }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-4 py-3 border-b border-gray-100 dark:border-zinc-800 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
