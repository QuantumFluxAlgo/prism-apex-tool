import React from 'react';

type KpiTone = 'emerald' | 'rose' | 'amber' | 'indigo' | 'cyan' | 'neutral';

type KpiProps = React.HTMLAttributes<HTMLDivElement> & {
  label?: string;
  value?: string | number | null;
  sublabel?: string;
  tone?: KpiTone;
};

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export default function Kpi({
  label,
  value,
  sublabel,
  tone = 'neutral',
  className,
  ...rest
}: KpiProps) {
  const toneClass = tone ? `a3-kpi--${tone}` : null;

  return (
    <div
      data-testid="kpi"
      className={cx('a3-kpi', toneClass, className)}
      {...rest}
    >
      {label && <div className="a3-kpi-label">{label}</div>}
      {value !== undefined && value !== null && (
        <div className="a3-kpi-value">{value}</div>
      )}
      {sublabel && <div className="a3-kpi-sublabel">{sublabel}</div>}
    </div>
  );
}
