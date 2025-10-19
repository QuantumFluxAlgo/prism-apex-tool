import React from 'react';
import { Card, CardBody } from './Card';

export default function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardBody className="dashboard-card__body stack">
        <div className="dashboard-kpi">
          <span className="dashboard-kpi__label">{label}</span>
          <span className="dashboard-kpi__value">{value}</span>
          {hint && <span className="dashboard-kpi__hint">{hint}</span>}
        </div>
      </CardBody>
    </Card>
  );
}
