import React from 'react';

interface ConfigCardProps {
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({ title, subtitle, footer, children }) => {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-sm space-y-3">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </header>
      <div className="text-sm text-slate-200 space-y-2">{children}</div>
      {footer && (
        <footer className="border-t border-slate-800 pt-2 text-right text-[11px] text-slate-500">
          {footer}
        </footer>
      )}
    </section>
  );
};
