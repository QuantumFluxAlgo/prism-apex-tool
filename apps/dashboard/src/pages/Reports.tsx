import React from 'react';
import FiltersBar from '../ui/FiltersBar';
import { Card, CardBody } from '../ui/Card';

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <FiltersBar />
      <Card>
        <CardBody>Charts & summaries will render here using existing data.</CardBody>
      </Card>
    </div>
  );
}
