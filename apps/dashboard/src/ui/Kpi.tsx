import React from 'react';

type KpiProps = {
  label?: string;
  value?: string | number | null;
} & React.HTMLAttributes<HTMLDivElement>;

export default function Kpi({ label, value, ...rest }: KpiProps) {
  return (
    <div data-testid="kpi" {...rest}>
      {label && <div>{label}</div>}
      {value !== undefined && value !== null && <div>{value}</div>}
    </div>
  );
}

