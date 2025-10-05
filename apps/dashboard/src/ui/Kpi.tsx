import React from 'react';
import { Card, CardBody } from './Card';

export default function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</div>
        <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
        {hint && <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</div>}
      </CardBody>
    </Card>
  );
}
