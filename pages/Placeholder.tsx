import React from 'react';
import { Card, CardBody } from '../ui/Card';

export default function Placeholder({ title }: { title: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-lg font-semibold mb-2">{title}</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Content will appear here as we wire data.</div>
      </CardBody>
    </Card>
  );
}
