import React from 'react';
import FiltersBar from '../ui/FiltersBar';
import Kpi from '../ui/Kpi';
import { Card, CardBody } from '../ui/Card';
import DataTable from '../ui/DataTable';

export default function TicketsPage() {
  return (
    <div className="space-y-4">
      <FiltersBar />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Total tickets" value="—" />
        <Kpi label="Open" value="—" />
        <Kpi label="Closed" value="—" />
        <Kpi label="Complete" value="—" />
        <Kpi label="Win rate" value="—" hint="%" />
      </div>
      <Card>
        <CardBody>
          <DataTable
            headers={
              <tr>
                <th className="px-3 py-2">Symbol</th>
                <th className="px-3 py-2">Strategy</th>
                <th className="px-3 py-2">Dir</th>
                <th className="px-3 py-2">Opened (UTC / GMT)</th>
                <th className="px-3 py-2">Closed</th>
                <th className="px-3 py-2">PnL</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            }
          >
            <tr>
              <td className="px-3 py-2" colSpan={8}>
                Loading…
              </td>
            </tr>
          </DataTable>
        </CardBody>
      </Card>
    </div>
  );
}
